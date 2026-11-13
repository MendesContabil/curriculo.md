import { Router } from 'express';
import fs from 'node:fs';
import multer from 'multer';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { ah, mapDocument, mapPackage, mapPayment } from '../helpers.js';
import { storeFileRecord, upload } from '../upload.js';

const router = Router();
router.use(requireAdmin);

router.get(
  '/overview',
  ah(async (_req, res) => {
    const { rows } = await query(
      `select
        (select count(*) from patients)::int as patients_total,
        (select count(*) from patients where origin = 'leve_saude')::int as leve_saude_total,
        (select count(*) from packages where sessions_used < sessions_total)::int as active_packages,
        (select coalesce(sum(amount), 0) from payments where status = 'paid')::float8 as received_total,
        (select coalesce(sum(amount), 0) from payments where status = 'pending')::float8 as pending_total,
        (select coalesce(sum(amount), 0) from payments
          where status = 'paid' and paid_at >= date_trunc('month', now()))::float8 as received_month`
    );
    const s = rows[0];
    res.json({
      patientsTotal: s.patients_total,
      leveSaudeTotal: s.leve_saude_total,
      activePackages: s.active_packages,
      receivedTotal: Number(s.received_total),
      pendingTotal: Number(s.pending_total),
      receivedMonth: Number(s.received_month),
    });
  })
);

router.get(
  '/packages',
  ah(async (req, res) => {
    const params = [];
    let where = '';
    if (req.query.patientId) {
      params.push(Number(req.query.patientId));
      where = 'where pk.patient_id = $1';
    }
    const { rows } = await query(
      `select pk.*, p.full_name as patient_name
       from packages pk join patients p on p.id = pk.patient_id
       ${where}
       order by pk.created_at desc limit 200`,
      params
    );
    res.json(rows.map(mapPackage));
  })
);

router.get(
  '/payments',
  ah(async (req, res) => {
    const params = [];
    let where = '';
    if (req.query.patientId) {
      params.push(Number(req.query.patientId));
      where = 'where pay.patient_id = $1';
    }
    const { rows } = await query(
      `select pay.*, p.full_name as patient_name, pk.label as package_label
       from payments pay
       join patients p on p.id = pay.patient_id
       left join packages pk on pk.id = pay.package_id
       ${where}
       order by pay.status asc, pay.created_at desc limit 200`,
      params
    );
    res.json(rows.map(mapPayment));
  })
);

router.get(
  '/patients/:id/packages',
  ah(async (req, res) => {
    const { rows } = await query(
      `select pk.*, p.full_name as patient_name
       from packages pk join patients p on p.id = pk.patient_id
       where pk.patient_id = $1 order by pk.created_at desc`,
      [Number(req.params.id)]
    );
    res.json(rows.map(mapPackage));
  })
);

router.post(
  '/patients/:id/packages',
  ah(async (req, res) => {
    const patientId = Number(req.params.id);
    const { sessionsTotal, baseValue, discountPercent, applyDiscount, dueDate } = req.body || {};
    const sessions = Math.max(1, Number(sessionsTotal) || 1);
    const base = Math.max(0, Number(baseValue) || 0);

    const patientRes = await query('select id, origin from patients where id = $1', [patientId]);
    const patient = patientRes.rows[0];
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

    const settingsRes = await query('select leve_saude_discount from settings where id = 1');
    const defaultDiscount = Number(settingsRes.rows[0]?.leve_saude_discount || 0);
    const automatic = patient.origin === 'leve_saude' && applyDiscount !== false;
    const discount = automatic
      ? Math.min(100, Math.max(0, discountPercent === undefined ? defaultDiscount : Number(discountPercent)))
      : 0;
    const finalValue = Math.round(base * (1 - discount / 100) * 100) / 100;
    const label = sessions === 1 ? 'Sessão avulsa' : `Pacote ${sessions} sessões`;

    const pkgRes = await query(
      `insert into packages (patient_id, label, sessions_total, base_value, discount_percent, final_value)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [patientId, label, sessions, base, discount, finalValue]
    );
    const pkg = pkgRes.rows[0];

    const payRes = await query(
      `insert into payments (patient_id, package_id, amount, status, due_date)
       values ($1, $2, $3, 'pending', coalesce($4::date, current_date)) returning *`,
      [patientId, pkg.id, finalValue, dueDate || null]
    );

    res.status(201).json({
      package: mapPackage(pkg),
      payment: mapPayment(payRes.rows[0]),
    });
  })
);

router.patch(
  '/packages/:id',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const { action, sessionsTotal, baseValue, discountPercent, sessionsUsed } = req.body || {};
    const current = await query('select * from packages where id = $1', [id]);
    const pkg = current.rows[0];
    if (!pkg) return res.status(404).json({ error: 'Pacote não encontrado.' });

    let used = pkg.sessions_used;
    let total = pkg.sessions_total;
    if (action === 'use_session') {
      if (used >= total) return res.status(400).json({ error: 'Todas as sessões já foram utilizadas.' });
      used += 1;
    } else if (action === 'undo_session') {
      used = Math.max(0, used - 1);
    }
    if (sessionsUsed !== undefined) used = Math.max(0, Number(sessionsUsed) || 0);
    if (sessionsTotal !== undefined) total = Math.max(1, Number(sessionsTotal) || 1);

    const base = baseValue !== undefined ? Math.max(0, Number(baseValue) || 0) : Number(pkg.base_value);
    const discount = discountPercent !== undefined
      ? Math.min(100, Math.max(0, Number(discountPercent) || 0))
      : Number(pkg.discount_percent);
    const finalValue = Math.round(base * (1 - discount / 100) * 100) / 100;
    const label = total === 1 ? 'Sessão avulsa' : `Pacote ${total} sessões`;

    const { rows } = await query(
      `update packages set sessions_used = $1, sessions_total = $2, base_value = $3,
        discount_percent = $4, final_value = $5, label = $6
       where id = $7 returning *`,
      [used, total, base, discount, finalValue, label, id]
    );

    await query(
      `update payments set amount = $1 where package_id = $2 and status = 'pending'`,
      [finalValue, id]
    );

    res.json(mapPackage(rows[0]));
  })
);

router.delete(
  '/packages/:id',
  ah(async (req, res) => {
    await query('delete from packages where id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

router.get(
  '/patients/:id/payments',
  ah(async (req, res) => {
    const { rows } = await query(
      `select pay.*, p.full_name as patient_name, pk.label as package_label
       from payments pay
       join patients p on p.id = pay.patient_id
       left join packages pk on pk.id = pay.package_id
       where pay.patient_id = $1 order by pay.created_at desc`,
      [Number(req.params.id)]
    );
    res.json(rows.map(mapPayment));
  })
);

router.post(
  '/patients/:id/payments',
  ah(async (req, res) => {
    const patientId = Number(req.params.id);
    const { amount, method, dueDate, packageId } = req.body || {};
    const { rows } = await query(
      `insert into payments (patient_id, package_id, amount, status, method, due_date)
       values ($1, $2, $3, 'pending', $4, coalesce($5::date, current_date)) returning *`,
      [patientId, packageId ? Number(packageId) : null, Math.max(0, Number(amount) || 0), method || null, dueDate || null]
    );
    res.status(201).json(mapPayment(rows[0]));
  })
);

router.patch(
  '/payments/:id',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const { status, method, dueDate, amount } = req.body || {};
    const current = await query('select * from payments where id = $1', [id]);
    const payment = current.rows[0];
    if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });

    const nextStatus = status === 'paid' ? 'paid' : status === 'pending' ? 'pending' : payment.status;
    const paidAt = nextStatus === 'paid' ? payment.paid_at || new Date() : null;
    const { rows } = await query(
      `update payments set status = $1,
        paid_at = $2,
        method = coalesce($3, method),
        due_date = coalesce($4::date, due_date),
        amount = coalesce($5, amount)
       where id = $6 returning *`,
      [
        nextStatus,
        paidAt,
        method === undefined ? null : method,
        dueDate || null,
        amount === undefined ? null : Number(amount),
        id,
      ]
    );
    res.json(mapPayment(rows[0]));
  })
);

export default router;
