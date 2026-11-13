import { Router } from 'express';
import { query } from '../db.js';
import { hashPassword, requireAdmin } from '../auth.js';
import { ah, mapPatient } from '../helpers.js';

const router = Router();
router.use(requireAdmin);

function selectPatients() {
  return `select p.*,
    (select count(*) from packages pk
      where pk.patient_id = p.id and pk.sessions_used < pk.sessions_total)::int as active_packages,
    (select coalesce(sum(pay.amount), 0) from payments pay
      where pay.patient_id = p.id and pay.status = 'pending')::float8 as pending_amount,
    (select count(*) from evolution_notes n where n.patient_id = p.id)::int as notes_count,
    (select count(*) from users u where u.patient_id = p.id)::int > 0 as has_account
    from patients p`;
}

router.get(
  '/',
  ah(async (_req, res) => {
    const { rows } = await query(`${selectPatients()} order by p.full_name asc`);
    res.json(rows.map(mapPatient));
  })
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const { rows } = await query(`${selectPatients()} where p.id = $1`, [Number(req.params.id)]);
    if (!rows[0]) return res.status(404).json({ error: 'Paciente não encontrado.' });
    res.json(mapPatient(rows[0]));
  })
);

router.post(
  '/',
  ah(async (req, res) => {
    const { fullName, age, phone, email, origin, password } = req.body || {};
    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ error: 'Informe o nome completo do paciente.' });
    }
    const normalizedOrigin = origin === 'leve_saude' ? 'leve_saude' : 'particular';
    const { rows } = await query(
      `insert into patients (full_name, age, phone, email, origin)
       values ($1, $2, $3, $4, $5) returning *`,
      [
        String(fullName).trim(),
        age ? Number(age) : null,
        phone ? String(phone).trim() : null,
        email ? String(email).trim().toLowerCase() : null,
        normalizedOrigin,
      ]
    );
    const patient = rows[0];

    if (patient.email) {
      const userEmail = patient.email.toLowerCase();
      const existing = await query('select id, role from users where lower(email) = $1', [userEmail]);
      if (existing.rows[0]?.role === 'admin') {
        // never hijack the psychologist account
      } else if (existing.rows[0]) {
        await query(
          `update users set name = $1, patient_id = $2 where id = $3`,
          [patient.full_name, patient.id, existing.rows[0].id]
        );
        if (password) {
          await query('update users set password_hash = $1 where id = $2', [
            hashPassword(String(password)),
            existing.rows[0].id,
          ]);
        }
      } else {
        await query(
          `insert into users (email, password_hash, role, name, patient_id)
           values ($1, $2, 'patient', $3, $4)`,
          [userEmail, hashPassword(String(password || 'paciente123')), patient.full_name, patient.id]
        );
      }
    }

    const fresh = await query(`${selectPatients()} where p.id = $1`, [patient.id]);
    res.status(201).json(mapPatient(fresh.rows[0]));
  })
);

router.patch(
  '/:id',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const { fullName, age, phone, email, origin, password } = req.body || {};
    const { rows } = await query(
      `update patients set
        full_name = coalesce($1, full_name),
        age = $2,
        phone = coalesce($3, phone),
        email = coalesce($4, email),
        origin = coalesce($5, origin)
       where id = $6 returning *`,
      [
        fullName ? String(fullName).trim() : null,
        age === undefined || age === '' || age === null ? null : Number(age),
        phone === undefined ? null : String(phone).trim() || null,
        email === undefined ? null : String(email).trim().toLowerCase() || null,
        origin === undefined ? null : origin === 'leve_saude' ? 'leve_saude' : 'particular',
        id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Paciente não encontrado.' });

    const linked = await query(
      "select id from users where patient_id = $1 and role = 'patient'",
      [id]
    );
    if (linked.rows[0]) {
      await query('update users set name = $1 where id = $2', [rows[0].full_name, linked.rows[0].id]);
      if (rows[0].email) {
        try {
          await query('update users set email = $1 where id = $2', [
            rows[0].email,
            linked.rows[0].id,
          ]);
        } catch {
          /* email já usado por outra conta */
        }
      }
      if (password) {
        await query('update users set password_hash = $1 where id = $2', [
          hashPassword(String(password)),
          linked.rows[0].id,
        ]);
      }
    }

    const fresh = await query(`${selectPatients()} where p.id = $1`, [id]);
    res.json(mapPatient(fresh.rows[0]));
  })
);

router.delete(
  '/:id',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    await query('delete from patients where id = $1', [id]);
    res.json({ ok: true });
  })
);

router.get(
  '/:id/notes',
  ah(async (req, res) => {
    const { rows } = await query(
      `select id, patient_id, to_char(note_date, 'YYYY-MM-DD') as note_date, content, created_at
       from evolution_notes where patient_id = $1
       order by note_date desc, id desc`,
      [Number(req.params.id)]
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        patientId: r.patient_id,
        date: r.note_date,
        content: r.content,
        createdAt: r.created_at,
      }))
    );
  })
);

router.post(
  '/:id/notes',
  ah(async (req, res) => {
    const patientId = Number(req.params.id);
    const content = String(req.body?.content || '').trim();
    const date = req.body?.date ? String(req.body.date) : null;
    if (!content) return res.status(400).json({ error: 'Escreva o conteúdo da evolução.' });
    const { rows } = await query(
      `insert into evolution_notes (patient_id, note_date, content)
       values ($1, coalesce($2::date, current_date), $3)
       returning id, patient_id, to_char(note_date, 'YYYY-MM-DD') as note_date, content, created_at`,
      [patientId, date, content]
    );
    const r = rows[0];
    res.status(201).json({
      id: r.id,
      patientId: r.patient_id,
      date: r.note_date,
      content: r.content,
      createdAt: r.created_at,
    });
  })
);

router.delete(
  '/:id/notes/:noteId',
  ah(async (req, res) => {
    await query('delete from evolution_notes where id = $1 and patient_id = $2', [
      Number(req.params.noteId),
      Number(req.params.id),
    ]);
    res.json({ ok: true });
  })
);

export default router;
