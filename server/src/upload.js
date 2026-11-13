import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { query } from './db.js';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 12);
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export async function storeFileRecord(file) {
  if (!file) return null;
  const { rows } = await query(
    `insert into files (original_name, stored_name, mime, size, path)
     values ($1, $2, $3, $4, $5) returning id`,
    [file.originalname, file.filename, file.mimetype, file.size, file.path]
  );
  return rows[0].id;
}


