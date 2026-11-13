import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { DOC_KINDS, ah, mapDocument } from '../helpers.js';
import { storeFileRecord, upload } from '../upload.js';

const router = Router();
router.use(requireAdmin);

router.get(
  '/',
  ah(async (req, res) => {
    const params = [];
    const where = ["d.direction = 'to_patient'"];
    if (req.query.patientId) {
      params.push(Number(req.query.patientId));
      where.push(`d.patient_id = $${params.length}`);
    }
    if (req.query.kind && DOC_KINDS.includes(String(req.query.kind))) {
      params.push(String(req.query.kind));
      where.push(`d.kind = $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${String(req.query.q).trim()}%`);
      where.push(`(d.title ilike $${params.length} or p.full_name ilike $${params.length})`);
    }
    const { rows } = await query(
      `select d.*, f.original_name, f.mime, f.size, p.full_name as patient_name
       from documents d
       join files f on f.id = d.file_id
       join patients p on p.id = d.patient_id
       where ${where.join(' and ')}
       order by d.created_at desc limit 300`,
      params
    );
    res.json(rows.map(mapDocument));
  })
);

router.post(
  '/',
  upload.single('file'),
  ah(async (req, res) => {
    const patientId = Number(req.body?.patientId);
    if (!patientId) return res.status(400).json({ error: 'Selecione o paciente que receberá o documento.' });
    if (!req.file) return res.status(400).json({ error: 'Selecione o arquivo para compartilhar.' });
    const patientRes = await query('select id, full_name from patients where id = $1', [patientId]);
    const patient = patientRes.rows[0];
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });

    const kind = DOC_KINDS.includes(String(req.body?.kind)) ? String(req.body.kind) : 'document';
    const fileId = await storeFileRecord(req.file);
    const { rows } = await query(
      `insert into documents (patient_id, file_id, title, kind, direction)
       values ($1, $2, $3, $4, 'to_patient') returning *`,
      [
        patientId,
        fileId,
        String(req.body?.title || '').trim() || req.file.originalname,
        kind,
      ]
    );
    res.status(201).json(
      mapDocument({
        ...rows[0],
        patient_name: patient.full_name,
        original_name: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size,
      })
    );
  })
);

router.delete(
  '/:id',
  ah(async (req, res) => {
    await query('delete from documents where id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

export default router;
