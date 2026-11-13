import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { ah } from '../helpers.js';
import { storeFileRecord, upload } from '../upload.js';

const router = Router();
router.use(requireAdmin);

const FONTS = ['modern', 'classic', 'soft', 'minimal'];

async function readSettings() {
  const { rows } = await query(
    `select clinic_name, primary_color, background_type, background_color, font_key,
            pix_key, leve_saude_discount, logo_file_id, background_file_id
     from settings where id = 1`
  );
  const s = rows[0] || {};
  return {
    clinicName: s.clinic_name || 'Consultório de Psicologia',
    primaryColor: s.primary_color || '#4f7f6b',
    backgroundType: s.background_type || 'color',
    backgroundColor: s.background_color || '#f3f5f1',
    fontKey: s.font_key || 'modern',
    pixKey: s.pix_key || '',
    leveSaudeDiscount: Number(s.leve_saude_discount || 0),
    logoUrl: s.logo_file_id ? `/api/public/assets/logo?v=${s.logo_file_id}` : null,
    backgroundUrl: s.background_file_id
      ? `/api/public/assets/background?v=${s.background_file_id}`
      : null,
  };
}

router.get('/', ah(async (_req, res) => res.json(await readSettings())));

router.put(
  '/',
  ah(async (req, res) => {
    const body = req.body || {};
    const fontKey = FONTS.includes(body.fontKey) ? body.fontKey : null;
    const backgroundType = ['color', 'image'].includes(body.backgroundType)
      ? body.backgroundType
      : null;
    const color = /^#[0-9a-fA-F]{6}$/.test(body.primaryColor || '') ? body.primaryColor : null;
    const bgColor = /^#[0-9a-fA-F]{6}$/.test(body.backgroundColor || '')
      ? body.backgroundColor
      : null;
    const discount =
      body.leveSaudeDiscount === undefined
        ? null
        : Math.min(100, Math.max(0, Number(body.leveSaudeDiscount) || 0));

    await query(
      `update settings set
        clinic_name = coalesce($1, clinic_name),
        primary_color = coalesce($2, primary_color),
        background_type = coalesce($3, background_type),
        background_color = coalesce($4, background_color),
        font_key = coalesce($5, font_key),
        pix_key = coalesce($6, pix_key),
        leve_saude_discount = coalesce($7, leve_saude_discount),
        updated_at = now()
       where id = 1`,
      [
        body.clinicName === undefined ? null : String(body.clinicName).trim() || null,
        color,
        backgroundType,
        bgColor,
        fontKey,
        body.pixKey === undefined ? null : String(body.pixKey).trim(),
        discount,
      ]
    );

    res.json(await readSettings());
  })
);

router.post(
  '/assets',
  upload.single('file'),
  ah(async (req, res) => {
    const kind = req.body?.kind === 'background' ? 'background' : 'logo';
    if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem.' });
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'O arquivo precisa ser uma imagem.' });
    }
    const fileId = await storeFileRecord(req.file);
    const column = kind === 'logo' ? 'logo_file_id' : 'background_file_id';
    await query(`update settings set ${column} = $1, updated_at = now() where id = 1`, [fileId]);
    res.json(await readSettings());
  })
);

router.delete(
  '/assets/:kind',
  ah(async (req, res) => {
    const column = req.params.kind === 'background' ? 'background_file_id' : 'logo_file_id';
    await query(`update settings set ${column} = null, updated_at = now() where id = 1`);
    res.json(await readSettings());
  })
);

export default router;
