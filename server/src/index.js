import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import { initDb, query } from './db.js';
import {
  COOKIE_NAME,
  attachUser,
  createSessionToken,
  requireAuth,
  sessionCookieOptions,
  verifyPassword,
} from './auth.js';
import { ah } from './helpers.js';
import settingsRoutes from './routes/settings.js';
import patientsRoutes from './routes/patients.js';
import documentsRoutes from './routes/documents.js';
import financeRoutes from './routes/finance.js';
import patientAreaRoutes from './routes/patientArea.js';
import filesRoutes from './routes/files.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post(
  '/api/auth/login',
  ah(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }
    const { rows } = await query(
      `select id, email, password_hash, role, name, patient_id
       from users where lower(email) = $1`,
      [email]
    );
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    const token = createSessionToken(user);
    res.cookie(COOKIE_NAME, token, sessionCookieOptions());
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        patientId: user.patient_id,
      },
    });
  })
);

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...sessionCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.uid,
      role: req.user.role,
      name: req.user.name,
      patientId: req.user.pid,
    },
  });
});

app.get(
  '/api/public/branding',
  ah(async (_req, res) => {
    const { rows } = await query(
      `select clinic_name, primary_color, background_type, background_color,
              font_key, logo_file_id, background_file_id
       from settings where id = 1`
    );
    const s = rows[0] || {};
    res.json({
      clinicName: s.clinic_name || 'Consultório de Psicologia',
      primaryColor: s.primary_color || '#4f7f6b',
      backgroundType: s.background_type || 'color',
      backgroundColor: s.background_color || '#f3f5f1',
      fontKey: s.font_key || 'modern',
      logoUrl: s.logo_file_id ? `/api/public/assets/logo?v=${s.logo_file_id}` : null,
      backgroundUrl: s.background_file_id
        ? `/api/public/assets/background?v=${s.background_file_id}`
        : null,
    });
  })
);

app.get(
  '/api/public/assets/:kind',
  ah(async (req, res) => {
    const column = req.params.kind === 'logo' ? 'logo_file_id' : 'background_file_id';
    if (!['logo', 'background'].includes(req.params.kind)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }
    const { rows } = await query(
      `select f.* from settings s join files f on f.id = s.${column} where s.id = 1`
    );
    const file = rows[0];
    if (!file || !fs.existsSync(file.path)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(file.path);
  })
);

app.use('/api/settings', settingsRoutes);
app.use('/api/patients', documentsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/me', patientAreaRoutes);
app.use('/api', financeRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use((err, _req, res, _next) => {
  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: `Falha no envio do arquivo: ${err.message}` });
  }
  console.error(err);
  res.status(500).json({ error: err?.message || 'Erro interno do servidor.' });
});

const PORT = Number(process.env.PORT || 8000);

initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`API de gestão psicológica ouvindo na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Não foi possível iniciar a API:', err);
    process.exit(1);
  });
