import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { ah, mapChatMessage } from '../helpers.js';

const router = Router();
router.use(requireAuth);

async function loadThread(patientId) {
  const patientRes = await query(
    'select id, full_name, phone, email from patients where id = $1',
    [patientId]
  );
  if (!patientRes.rows[0]) return null;
  const messagesRes = await query(
    `select id, patient_id, sender_role, sender_name, body, created_at
     from chat_messages where patient_id = $1
     order by created_at asc, id asc limit 500`,
    [patientId]
  );
  const p = patientRes.rows[0];
  return {
    patient: { id: p.id, name: p.full_name, phone: p.phone || '', email: p.email || '' },
    messages: messagesRes.rows.map(mapChatMessage),
  };
}

router.get(
  '/',
  ah(async (req, res) => {
    if (req.user.role === 'admin') {
      const patientId = req.query.patientId ? Number(req.query.patientId) : null;
      if (patientId) {
        const thread = await loadThread(patientId);
        if (!thread) return res.status(404).json({ error: 'Paciente não encontrado.' });
        return res.json(thread);
      }
      const { rows } = await query(
        `select p.id as patient_id, p.full_name, p.phone, p.email,
          last.body as last_message, last.created_at as last_at, last.sender_role as last_role,
          (select count(*) from chat_messages m where m.patient_id = p.id)::int as message_count
         from patients p
         left join lateral (
           select body, created_at, sender_role from chat_messages m
           where m.patient_id = p.id
           order by m.created_at desc, m.id desc limit 1
         ) last on true
         order by (last.created_at is null), last.created_at desc, p.full_name asc`
      );
      return res.json({
        conversations: rows.map((row) => ({
          patientId: row.patient_id,
          patientName: row.full_name,
          patientPhone: row.phone || '',
          patientEmail: row.email || '',
          lastMessage: row.last_message || '',
          lastAt: row.last_at,
          lastRole: row.last_role || null,
          messageCount: Number(row.message_count || 0),
        })),
      });
    }

    const thread = await loadThread(req.user.pid);
    if (!thread) return res.status(404).json({ error: 'Paciente não encontrado.' });
    res.json(thread);
  })
);

router.post(
  '/',
  ah(async (req, res) => {
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Escreva uma mensagem.' });
    if (body.length > 4000) {
      return res.status(400).json({ error: 'A mensagem é muito longa (máximo 4000 caracteres).' });
    }

    const patientId = req.user.role === 'admin' ? Number(req.body?.patientId) : req.user.pid;
    if (!patientId) return res.status(400).json({ error: 'Selecione o paciente da conversa.' });

    const patientRes = await query('select id from patients where id = $1', [patientId]);
    if (!patientRes.rows[0]) return res.status(404).json({ error: 'Paciente não encontrado.' });

    const { rows } = await query(
      `insert into chat_messages (patient_id, sender_role, sender_name, body)
       values ($1, $2, $3, $4)
       returning id, patient_id, sender_role, sender_name, body, created_at`,
      [patientId, req.user.role, req.user.name || null, body]
    );
    res.status(201).json(mapChatMessage(rows[0]));
  })
);

export default router;
