import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { ah, mapDocument } from '../helpers.js';
import { storeFileRecord, upload } from '../upload.js';

const router = Router();
router.use(requireAdmin);

router.get(
  '/:id/documents',
  ah(async (req, res) => {
    const { rows } = await query(
      `select d.*, f.original_name, f.mime, f.size
       from documents d join files f on f.id = d.file_id
       where d.patient_id = $1 order by d.created_at desc`,
      [Number(req.params.id)]
    );
    res.json(rows.map(mapDocument));
  })
);

router.post(
  '/:id/documents',
  upload.single('file'),
  ah(async (req, res) => {
    const patientId = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'Selecione um arquivo para enviar.' });
    const kind = req.body?.kind === 'receipt' ? 'receipt' : 'document';
    const fileId = await storeFileRecord(req.file);
    const { rows } = await query(
      `insert into documents (patient_id, file_id, title, kind, direction)
       values ($1, $2, $3, $4, 'to_patient') returning *`,
      [patientId, fileId, String(req.body?.title || '').trim() || req.file.originalname, kind]
    );
    const doc = rows[0];
    res.status(201).json({
      ...mapDocument(doc),
      fileName: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
    });
  })
);

router.delete(
  '/:id/documents/:docId',
  ah(async (req, res) => {
    await query('delete from documents where id = $1 and patient_id = $2', [
      Number(req.params.docId),
      Number(req.params.id),
    ]);
    res.json({ ok: true });
  })
);

export default router;
