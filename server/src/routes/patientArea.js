import { Router } from 'express';
import { query } from '../db.js';
import { requirePatient } from '../auth.js';
import { ah, mapDocument, mapPackage, mapPayment } from '../helpers.js';
import { storeFileRecord, upload } from '../upload.js';

const router = Router();
router.use(requirePatient);

router.get(
  '/overview',
  ah(async (req, res) => {
    const patientId = req.user.pid;
    const patientRes = await query(
      `select id, full_name, age, phone, email, origin from patients where id = $1`,
      [patientId]
    );
    if (!patientRes.rows[0]) return res.status(404).json({ error: 'Paciente não encontrado.' });
    const p = patientRes.rows[0];

    const packagesRes = await query(
      `select * from packages where patient_id = $1 order by created_at desc`,
      [patientId]
    );
    const paymentsRes = await query(
      `select pay.*, pk.label as package_label from payments pay
       left join packages pk on pk.id = pay.package_id
       where pay.patient_id = $1 order by pay.created_at desc`,
      [patientId]
    );
    const documentsRes = await query(
      `select d.*, f.original_name, f.mime, f.size
       from documents d join files f on f.id = d.file_id
       where d.patient_id = $1 order by d.created_at desc`,
      [patientId]
    );
    const settingsRes = await query(
      `select clinic_name, pix_key, primary_color from settings where id = 1`
    );
    const s = settingsRes.rows[0] || {};

    const payments = paymentsRes.rows.map(mapPayment);
    res.json({
      patient: {
        id: p.id,
        fullName: p.full_name,
        age: p.age,
        phone: p.phone,
        email: p.email,
        origin: p.origin,
      },
      packages: packagesRes.rows.map(mapPackage),
      payments,
      documents: documentsRes.rows.map(mapDocument),
      pixKey: s.pix_key || '',
      clinicName: s.clinic_name || '',
      pendingTotal: payments
        .filter((pay) => pay.status === 'pending')
        .reduce((sum, pay) => sum + pay.amount, 0),
      paidTotal: payments
        .filter((pay) => pay.status === 'paid')
        .reduce((sum, pay) => sum + pay.amount, 0),
    });
  })
);

router.post(
  '/proofs',
  upload.single('file'),
  ah(async (req, res) => {
    const patientId = req.user.pid;
    if (!req.file) return res.status(400).json({ error: 'Selecione o comprovante para enviar.' });
    const paymentId = req.body?.paymentId ? Number(req.body.paymentId) : null;
    if (paymentId) {
      const owned = await query('select id from payments where id = $1 and patient_id = $2', [
        paymentId,
        patientId,
      ]);
      if (!owned.rows[0]) return res.status(400).json({ error: 'Pagamento não encontrado.' });
    }
    const fileId = await storeFileRecord(req.file);
    const { rows } = await query(
      `insert into documents (patient_id, file_id, title, kind, direction, payment_id)
       values ($1, $2, $3, 'proof', 'from_patient', $4) returning *`,
      [
        patientId,
        fileId,
        String(req.body?.title || '').trim() || 'Comprovante de pagamento',
        paymentId,
      ]
    );
    res.status(201).json({
      ...mapDocument(rows[0]),
      fileName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
    });
  })
);

export default router;
