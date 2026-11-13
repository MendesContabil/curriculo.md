import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin, requireAuth, requirePatient } from '../auth.js';
import { ah, mapAppointment, mapSlot } from '../helpers.js';

const router = Router();
router.use(requireAuth);

const ACTIVE_STATUSES = "('pending','confirmed','reschedule_requested')";

function bookingLateral() {
  return `left join lateral (
    select a.id, a.status, a.patient_id
    from appointments a
    where (a.slot_id = s.id or a.reschedule_slot_id = s.id)
      and a.status in ${ACTIVE_STATUSES}
    order by a.created_at desc
    limit 1
  ) b on true`;
}

function slotSelect(where = '') {
  return `select s.id, s.is_active,
    to_char(s.date, 'YYYY-MM-DD') as slot_date,
    to_char(s.start_time, 'HH24:MI') as start_time,
    to_char(s.end_time, 'HH24:MI') as end_time,
    ((s.date + s.start_time) at time zone 'America/Sao_Paulo') > now() as is_future,
    b.id as booking_id, b.status as booking_status, p.full_name as patient_name
    from availability_slots s
    ${bookingLateral()}
    left join patients p on p.id = b.patient_id
    ${where}
    order by s.date asc, s.start_time asc`;
}

function appointmentSelect(where = '', order = 'a.scheduled_date desc, a.scheduled_time desc') {
  return `select a.id, a.patient_id, a.slot_id, a.status, a.meeting_url, a.duration_minutes,
    a.patient_note, a.admin_note, a.reschedule_slot_id, a.reschedule_note,
    to_char(a.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
    to_char(a.scheduled_time, 'HH24:MI') as scheduled_time,
    to_char(rs.date, 'YYYY-MM-DD') as reschedule_date,
    to_char(rs.start_time, 'HH24:MI') as reschedule_time,
    ((a.scheduled_date + a.scheduled_time) at time zone 'America/Sao_Paulo') > now() as is_future,
    p.full_name as patient_name, p.phone as patient_phone, p.email as patient_email,
    a.created_at, a.updated_at
    from appointments a
    join patients p on p.id = a.patient_id
    left join availability_slots rs on rs.id = a.reschedule_slot_id
    ${where}
    order by ${order}`;
}

async function loadAppointment(id) {
  const { rows } = await query(appointmentSelect('where a.id = $1'), [id]);
  return rows[0] ? mapAppointment(rows[0]) : null;
}

async function slotIsFree(slotId, excludeAppointmentId = null) {
  if (!slotId) return false;
  const { rows } = await query(
    `select a.id from appointments a
     where (a.slot_id = $1 or a.reschedule_slot_id = $1)
       and a.status in ${ACTIVE_STATUSES}
       and ($2::int is null or a.id <> $2)
     limit 1`,
    [slotId, excludeAppointmentId]
  );
  return !rows[0];
}

async function loadFutureSlot(slotId) {
  const { rows } = await query(
    `select *, to_char(date, 'YYYY-MM-DD') as day,
      to_char(start_time, 'HH24:MI') as start_time_text,
      to_char(end_time, 'HH24:MI') as end_time_text,
      ((date + start_time) at time zone 'America/Sao_Paulo') > now() as is_future
     from availability_slots where id = $1 and is_active`,
    [slotId]
  );
  return rows[0] || null;
}

function slotDuration(start, end) {
  const [sh, sm] = String(start).split(':').map(Number);
  const [eh, em] = String(end).split(':').map(Number);
  return Math.max(10, eh * 60 + em - (sh * 60 + sm));
}

/* ---------------- Psicóloga (admin) ---------------- */

router.get(
  '/agenda',
  requireAdmin,
  ah(async (_req, res) => {
    const [slotsRes, apptRes] = await Promise.all([
      query(slotSelect('where s.date >= current_date')),
      query(appointmentSelect()),
    ]);
    const slots = slotsRes.rows.map(mapSlot);
    const appointments = apptRes.rows.map(mapAppointment);
    res.json({
      slots,
      appointments,
      stats: {
        pendingRequests: appointments.filter((a) =>
          ['pending', 'reschedule_requested'].includes(a.status)
        ).length,
        upcoming: appointments.filter((a) => a.status === 'confirmed' && a.isFuture).length,
        completed: appointments.filter((a) => a.status === 'completed').length,
        freeSlots: slots.filter((s) => s.isFuture && !s.appointmentId).length,
      },
    });
  })
);

router.post(
  '/slots',
  requireAdmin,
  ah(async (req, res) => {
    const { date, startTime, endTime } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      return res.status(400).json({ error: 'Informe uma data válida.' });
    }
    if (!/^\d{2}:\d{2}$/.test(String(startTime || '')) || !/^\d{2}:\d{2}$/.test(String(endTime || ''))) {
      return res.status(400).json({ error: 'Informe o horário de início e fim (HH:MM).' });
    }
    if (slotDuration(startTime, endTime) <= 0) {
      return res.status(400).json({ error: 'O horário final precisa ser depois do início.' });
    }
    const futureRes = await query(
      `select (($1::date + $2::time) at time zone 'America/Sao_Paulo') > now() as is_future`,
      [date, startTime]
    );
    if (!futureRes.rows[0].is_future) {
      return res.status(400).json({ error: 'Escolha um horário que ainda não passou.' });
    }
    const overlap = await query(
      `select id from availability_slots
       where date = $1 and start_time < $3::time and end_time > $2::time limit 1`,
      [date, startTime, endTime]
    );
    if (overlap.rows[0]) {
      return res.status(409).json({ error: 'Já existe um horário nesse intervalo.' });
    }
    const { rows } = await query(
      `insert into availability_slots (date, start_time, end_time)
       values ($1, $2::time, $3::time)
       returning id,
         to_char(date, 'YYYY-MM-DD') as slot_date,
         to_char(start_time, 'HH24:MI') as start_time,
         to_char(end_time, 'HH24:MI') as end_time,
         true as is_future,
         null::int as booking_id, null::text as booking_status, null::text as patient_name`,
      [date, startTime, endTime]
    );
    res.status(201).json(mapSlot(rows[0]));
  })
);

router.delete(
  '/slots/:id',
  requireAdmin,
  ah(async (req, res) => {
    const slotId = Number(req.params.id);
    if (!(await slotIsFree(slotId))) {
      return res.status(409).json({ error: 'Este horário tem uma sessão vinculada. Cancele a sessão antes.' });
    }
    await query('delete from availability_slots where id = $1', [slotId]);
    res.json({ ok: true });
  })
);

router.patch(
  '/appointments/:id',
  requireAdmin,
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const { action, meetingUrl } = req.body || {};
    const current = await query('select * from appointments where id = $1', [id]);
    const appt = current.rows[0];
    if (!appt) return res.status(404).json({ error: 'Sessão não encontrada.' });

    if (action === 'confirm') {
      if (appt.status !== 'pending') {
        return res.status(400).json({ error: 'Esta solicitação não está pendente.' });
      }
      if (!(await slotIsFree(appt.slot_id, appt.id))) {
        return res.status(409).json({ error: 'Este horário já foi reservado. Recuse a solicitação.' });
      }
      await query(
        `update appointments set status = 'confirmed', updated_at = now() where id = $1`,
        [id]
      );
    } else if (action === 'decline') {
      if (!['pending', 'reschedule_requested'].includes(appt.status)) {
        return res.status(400).json({ error: 'Somente solicitações podem ser recusadas.' });
      }
      await query(
        `update appointments set status = 'cancelled', reschedule_slot_id = null,
          reschedule_note = '', updated_at = now() where id = $1`,
        [id]
      );
    } else if (action === 'complete') {
      if (appt.status !== 'confirmed') {
        return res.status(400).json({ error: 'Somente sessões confirmadas podem ser concluídas.' });
      }
      await query(`update appointments set status = 'completed', updated_at = now() where id = $1`, [
        id,
      ]);
    } else if (action === 'cancel') {
      if (!['pending', 'confirmed', 'reschedule_requested'].includes(appt.status)) {
        return res.status(400).json({ error: 'Esta sessão não pode ser cancelada.' });
      }
      await query(
        `update appointments set status = 'cancelled', reschedule_slot_id = null,
          reschedule_note = '', updated_at = now() where id = $1`,
        [id]
      );
    } else if (action === 'meeting_url') {
      const value = String(meetingUrl || '').trim();
      if (value && !/^https?:\/\/\S+$/i.test(value)) {
        return res.status(400).json({ error: 'Informe um link válido começando com http:// ou https://.' });
      }
      await query('update appointments set meeting_url = $1, updated_at = now() where id = $2', [
        value || null,
        id,
      ]);
    } else if (action === 'reschedule_accept') {
      if (appt.status !== 'reschedule_requested' || !appt.reschedule_slot_id) {
        return res.status(400).json({ error: 'Não há remarcação pendente para esta sessão.' });
      }
      const slot = await loadFutureSlot(appt.reschedule_slot_id);
      if (!slot || !slot.is_future) {
        return res.status(409).json({ error: 'O novo horário solicitado não está mais disponível.' });
      }
      if (!(await slotIsFree(slot.id, appt.id))) {
        return res.status(409).json({ error: 'O novo horário solicitado não está mais disponível.' });
      }
      await query(
        `update appointments set scheduled_date = $1, scheduled_time = $2::time,
          slot_id = $3, reschedule_slot_id = null, reschedule_note = '', status = 'confirmed',
          updated_at = now()
         where id = $4`,
        [slot.day, slot.start_time_text, slot.id, id]
      );
    } else if (action === 'reschedule_decline') {
      if (appt.status !== 'reschedule_requested') {
        return res.status(400).json({ error: 'Não há remarcação pendente para esta sessão.' });
      }
      await query(
        `update appointments set status = 'confirmed', reschedule_slot_id = null,
          reschedule_note = '', updated_at = now() where id = $1`,
        [id]
      );
    } else {
      return res.status(400).json({ error: 'Ação inválida.' });
    }

    res.json(await loadAppointment(id));
  })
);

/* ---------------- Paciente ---------------- */

router.get(
  '/me/agenda',
  requirePatient,
  ah(async (req, res) => {
    const patientId = req.user.pid;
    const [slotsRes, apptRes] = await Promise.all([
      query(
        slotSelect(
          `where s.is_active and s.date >= current_date
            and ((s.date + s.start_time) at time zone 'America/Sao_Paulo') > now()
            and b.id is null`
        )
      ),
      query(appointmentSelect('where a.patient_id = $1', 'a.scheduled_date asc, a.scheduled_time asc'), [
        patientId,
      ]),
    ]);
    const appointments = apptRes.rows.map(mapAppointment);
    res.json({
      availability: slotsRes.rows.map(mapSlot),
      upcoming: appointments.filter(
        (a) =>
          ['pending', 'confirmed', 'reschedule_requested'].includes(a.status) &&
          (a.isFuture || a.status === 'reschedule_requested')
      ),
      history: appointments
        .filter((a) => a.status === 'completed')
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
    });
  })
);

router.post(
  '/me/appointments',
  requirePatient,
  ah(async (req, res) => {
    const patientId = req.user.pid;
    const slotId = Number(req.body?.slotId);
    const note = String(req.body?.note || '').trim();
    if (!slotId) return res.status(400).json({ error: 'Escolha um horário disponível.' });

    const pendingRes = await query(
      `select id from appointments where patient_id = $1 and status = 'pending' limit 1`,
      [patientId]
    );
    if (pendingRes.rows[0]) {
      return res.status(409).json({ error: 'Você já tem uma solicitação aguardando confirmação.' });
    }

    const slot = await loadFutureSlot(slotId);
    if (!slot || !slot.is_future) {
      return res.status(409).json({ error: 'Este horário não está mais disponível.' });
    }
    if (!(await slotIsFree(slotId))) {
      return res.status(409).json({ error: 'Este horário já foi reservado por outro paciente.' });
    }

    const { rows } = await query(
      `insert into appointments
        (patient_id, slot_id, scheduled_date, scheduled_time, duration_minutes, status, patient_note)
       values ($1, $2, $3, $4::time, $5, 'pending', $6) returning id`,
      [
        patientId,
        slotId,
        slot.day,
        slot.start_time_text,
        slotDuration(slot.start_time_text, slot.end_time_text),
        note || null,
      ]
    );
    res.status(201).json(await loadAppointment(rows[0].id));
  })
);

router.post(
  '/me/appointments/:id/reschedule',
  requirePatient,
  ah(async (req, res) => {
    const patientId = req.user.pid;
    const id = Number(req.params.id);
    const slotId = Number(req.body?.slotId);
    const note = String(req.body?.note || '').trim();
    if (!slotId) return res.status(400).json({ error: 'Escolha o novo horário desejado.' });

    const current = await query(
      'select * from appointments where id = $1 and patient_id = $2',
      [id, patientId]
    );
    const appt = current.rows[0];
    if (!appt) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (appt.status !== 'confirmed') {
      return res.status(400).json({ error: 'Só é possível remarcar sessões confirmadas.' });
    }

    const slot = await loadFutureSlot(slotId);
    if (!slot || !slot.is_future) {
      return res.status(409).json({ error: 'Este horário não está mais disponível.' });
    }
    if (!(await slotIsFree(slotId, appt.id))) {
      return res.status(409).json({ error: 'Este horário já foi reservado por outro paciente.' });
    }

    await query(
      `update appointments set status = 'reschedule_requested', reschedule_slot_id = $1,
        reschedule_note = $2, updated_at = now() where id = $3`,
      [slotId, note || null, id]
    );
    res.json(await loadAppointment(id));
  })
);

export default router;
