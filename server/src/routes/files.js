import fs from 'node:fs';
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { ah } from '../helpers.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/:id',
  ah(async (req, res) => {
    const fileId = Number(req.params.id);
    const { rows } = await query('select * from files where id = $1', [fileId]);
    const file = rows[0];
    if (!file) return res.status(404).json({ error: 'Arquivo não encontrado.' });

    if (req.user.role !== 'admin') {
      const allowed = await query(
        'select 1 from documents where file_id = $1 and patient_id = $2',
        [fileId, req.user.pid]
      );
      if (!allowed.rows[0]) return res.status(403).json({ error: 'Sem acesso a este arquivo.' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ error: 'Arquivo indisponível no servidor.' });
    }

    const disposition = req.query.download ? 'attachment' : 'inline';
    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`
    );
    res.sendFile(file.path);
  })
);

export default router;
