import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './auth.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const query = (text, params) => pool.query(text, params);

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

const SCHEMA = `
create table if not exists settings (
  id integer primary key default 1,
  clinic_name text not null default 'Espaço Acolher',
  logo_file_id integer,
  primary_color text not null default '#4f7f6b',
  background_type text not null default 'color',
  background_color text not null default '#f3f5f1',
  background_file_id integer,
  font_key text not null default 'modern',
  pix_key text not null default '',
  leve_saude_discount numeric(5,2) not null default 15,
  updated_at timestamptz not null default now()
);

create table if not exists patients (
  id serial primary key,
  full_name text not null,
  age integer,
  phone text,
  email text,
  origin text not null default 'particular',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  role text not null default 'patient',
  name text not null,
  patient_id integer references patients(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists evolution_notes (
  id serial primary key,
  patient_id integer not null references patients(id) on delete cascade,
  note_date date not null default current_date,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists packages (
  id serial primary key,
  patient_id integer not null references patients(id) on delete cascade,
  label text not null,
  sessions_total integer not null,
  sessions_used integer not null default 0,
  base_value numeric(10,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  final_value numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id serial primary key,
  patient_id integer not null references patients(id) on delete cascade,
  package_id integer references packages(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  status text not null default 'pending',
  method text,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id serial primary key,
  original_name text not null,
  stored_name text not null,
  mime text not null,
  size integer not null default 0,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id serial primary key,
  patient_id integer not null references patients(id) on delete cascade,
  file_id integer not null references files(id) on delete cascade,
  title text not null,
  kind text not null default 'document',
  direction text not null default 'to_patient',
  payment_id integer references payments(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists availability_slots (
  id serial primary key,
  date date not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (date, start_time)
);

create table if not exists appointments (
  id serial primary key,
  patient_id integer not null references patients(id) on delete cascade,
  slot_id integer references availability_slots(id) on delete set null,
  scheduled_date date not null,
  scheduled_time time not null,
  duration_minutes integer not null default 50,
  status text not null default 'pending',
  meeting_url text,
  patient_note text,
  admin_note text,
  reschedule_slot_id integer references availability_slots(id) on delete set null,
  reschedule_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id serial primary key,
  patient_id integer not null references patients(id) on delete cascade,
  sender_role text not null,
  sender_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_patient on evolution_notes(patient_id);
create index if not exists idx_packages_patient on packages(patient_id);
create index if not exists idx_payments_patient on payments(patient_id);
create index if not exists idx_documents_patient on documents(patient_id);
create index if not exists idx_slots_date on availability_slots(date);
create index if not exists idx_appointments_patient on appointments(patient_id);
create index if not exists idx_appointments_slot on appointments(slot_id);
create index if not exists idx_chat_patient on chat_messages(patient_id, created_at);
`;

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function seed() {
  const settingsCount = await query('select count(*)::int as c from settings');
  if (settingsCount.rows[0].c === 0) {
    await query(
      `insert into settings (id, clinic_name, primary_color, background_type, background_color, font_key, pix_key, leve_saude_discount)
       values (1, $1, $2, 'color', $3, 'modern', $4, 15)`,
      ['Espaço Acolher', '#4f7f6b', '#f3f5f1', 'psi.helena@espacoacolher.com.br']
    );
  }

  const adminCount = await query("select count(*)::int as c from users where role = 'admin'");
  if (adminCount.rows[0].c === 0) {
    const email = (process.env.ADMIN_EMAIL || 'psi@consultorio.app').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'psi123456';
    await query(
      `insert into users (email, password_hash, role, name)
       values ($1, $2, 'admin', $3)
       on conflict (email) do nothing`,
      [email, hashPassword(password), 'Dra. Helena Martins']
    );
  }

  if (process.env.SEED_DEMO === 'false') return;

  const patientCount = await query('select count(*)::int as c from patients');
  if (patientCount.rows[0].c > 0) return;

  const maria = await query(
    `insert into patients (full_name, age, phone, email, origin)
     values ($1, 34, $2, $3, 'leve_saude') returning id`,
    ['Maria Oliveira', '(11) 98877-1122', 'maria.oliveira@email.com']
  );
  const joao = await query(
    `insert into patients (full_name, age, phone, email, origin)
     values ($1, 27, $2, $3, 'particular') returning id`,
    ['João Ferreira', '(11) 97654-3210', 'joao.ferreira@email.com']
  );
  const camila = await query(
    `insert into patients (full_name, age, phone, email, origin)
     values ($1, 41, $2, $3, 'leve_saude') returning id`,
    ['Camila Souza', '(11) 96543-2211', 'camila.souza@email.com']
  );

  await query(
    `insert into users (email, password_hash, role, name, patient_id)
     values ($1, $2, 'patient', $3, $4)
     on conflict (email) do nothing`,
    ['paciente@demo.app', hashPassword('paciente123'), 'Maria Oliveira', maria.rows[0].id]
  );

  const mariaId = maria.rows[0].id;
  const joaoId = joao.rows[0].id;
  const camilaId = camila.rows[0].id;

  const notes = [
    [mariaId, '2026-10-02', 'Primeira sessão: chegou relatando ansiedade antecipatória relacionada ao trabalho. Estabelecemos contrato terapêutico e metas iniciais.'],
    [mariaId, '2026-10-16', 'Boa adesão aos exercícios de respiração. Relatou melhora no sono. Trabalhamos reestruturação cognitiva sobre cobranças no ambiente profissional.'],
    [mariaId, '2026-11-06', 'Paciente demonstra maior autonomia para nomear emoções. Seguimos explorando relações familiares e limites.'],
    [joaoId, '2026-10-29', 'Sessão inicial: demanda de luto recente. Acolhimento e psicoeducação sobre o processo de elaboração da perda.'],
    [camilaId, '2026-11-03', 'Retomada do acompanhamento após alta de 2024. Foco em autoestima e retorno gradual ao convívio social.'],
  ];
  for (const [pid, date, content] of notes) {
    await query('insert into evolution_notes (patient_id, note_date, content) values ($1, $2, $3)', [pid, date, content]);
  }

  const mariaPkg = await query(
    `insert into packages (patient_id, label, sessions_total, sessions_used, base_value, discount_percent, final_value)
     values ($1, 'Pacote 4 sessões', 4, 2, 640, 15, 544) returning id`,
    [mariaId]
  );
  await query(
    `insert into payments (patient_id, package_id, amount, status, method, paid_at, due_date)
     values ($1, $2, 544, 'paid', 'pix', now() - interval '20 days', $3)`,
    [mariaId, mariaPkg.rows[0].id, '2026-10-20']
  );

  const mariaPending = await query(
    `insert into packages (patient_id, label, sessions_total, sessions_used, base_value, discount_percent, final_value)
     values ($1, 'Pacote 2 sessões', 2, 0, 320, 15, 272) returning id`,
    [mariaId]
  );
  await query(
    `insert into payments (patient_id, package_id, amount, status, method, due_date)
     values ($1, $2, 272, 'pending', 'pix', $3)`,
    [mariaId, mariaPending.rows[0].id, '2026-11-25']
  );

  const joaoPkg = await query(
    `insert into packages (patient_id, label, sessions_total, sessions_used, base_value, discount_percent, final_value)
     values ($1, 'Sessão avulsa', 1, 1, 180, 0, 180) returning id`,
    [joaoId]
  );
  await query(
    `insert into payments (patient_id, package_id, amount, status, method, paid_at)
     values ($1, $2, 180, 'paid', 'dinheiro', now() - interval '5 days')`,
    [joaoId, joaoPkg.rows[0].id]
  );

  const camilaPkg = await query(
    `insert into packages (patient_id, label, sessions_total, sessions_used, base_value, discount_percent, final_value)
     values ($1, 'Pacote 4 sessões', 4, 1, 600, 15, 510) returning id`,
    [camilaId]
  );
  await query(
    `insert into payments (patient_id, package_id, amount, status, method, due_date)
     values ($1, $2, 510, 'pending', 'pix', $3)`,
    [camilaId, camilaPkg.rows[0].id, '2026-11-30']
  );

  // A demo receipt the psychologist already sent to Maria
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const storedName = `seed-${crypto.randomBytes(6).toString('hex')}.txt`;
    const storedPath = path.join(UPLOAD_DIR, storedName);
    const now = new Date();
    const receipt = [
      'RECIBO DE PAGAMENTO',
      '',
      'Espaço Acolher — Psicologia Clínica',
      'Dra. Helena Martins — CRP 06/123456',
      '',
      'Paciente: Maria Oliveira',
      'Referente a: Pacote de 4 sessões',
      'Valor pago: R$ 544,00',
      `Data: ${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`,
      '',
      'Recebemos o valor acima referente ao acompanhamento psicológico.',
      '',
      'Documento gerado eletronicamente pelo sistema de gestão do consultório.',
    ].join('\n');
    fs.writeFileSync(storedPath, receipt, 'utf8');
    const fileRow = await query(
      `insert into files (original_name, stored_name, mime, size, path)
       values ('recibo-pacote-4-sessoes.txt', $1, 'text/plain', $2, $3) returning id`,
      [storedName, Buffer.byteLength(receipt), storedPath]
    );
    await query(
      `insert into documents (patient_id, file_id, title, kind, direction)
       values ($1, $2, 'Recibo — Pacote 4 sessões', 'receipt', 'to_patient')`,
      [mariaId, fileRow.rows[0].id]
    );
  } catch (err) {
    console.warn('Não foi possível criar o recibo de demonstração:', err.message);
  }

  // Agenda de demonstração: noites de semana e finais de semana.
  const slotsCount = await query('select count(*)::int as c from availability_slots');
  if (slotsCount.rows[0].c === 0) {
    const upcomingWeekday = (target) => {
      const base = new Date();
      base.setUTCHours(12, 0, 0, 0);
      const diff = (target - base.getUTCDay() + 7) % 7 || 7;
      base.setUTCDate(base.getUTCDate() + diff);
      return base.toISOString().slice(0, 10);
    };
    const saturday = upcomingWeekday(6);
    const sunday = upcomingWeekday(0);
    const tuesday = upcomingWeekday(2);
    const thursday = upcomingWeekday(4);
    const lastSaturday = (() => {
      const base = new Date();
      base.setUTCHours(12, 0, 0, 0);
      base.setUTCDate(base.getUTCDate() - 7);
      return base.toISOString().slice(0, 10);
    })();

    const slotRes = await query(
      `insert into availability_slots (date, start_time, end_time) values
        ($1, '09:00', '09:50'), ($1, '10:00', '10:50'),
        ($2, '18:00', '18:50'),
        ($3, '19:00', '19:50'),
        ($4, '20:00', '20:50'),
        ($5, '19:00', '19:50')
       returning id, to_char(date, 'YYYY-MM-DD') as day, to_char(start_time, 'HH24:MI') as start_time`,
      [saturday, sunday, tuesday, thursday, lastSaturday]
    );
    const findSlot = (day, startTime) =>
      slotRes.rows.find((row) => row.day === day && row.start_time === startTime);

    const mariaSaturday = findSlot(saturday, '09:00');
    const joaoSunday = findSlot(sunday, '18:00');
    const mariaPast = findSlot(lastSaturday, '19:00');

    if (mariaSaturday) {
      await query(
        `insert into appointments
          (patient_id, slot_id, scheduled_date, scheduled_time, duration_minutes, status, meeting_url)
         values ($1, $2, $3, '09:00', 50, 'confirmed', $4)`,
        [mariaId, mariaSaturday.id, saturday, 'https://meet.google.com/demo-sala-helena']
      );
    }
    if (joaoSunday) {
      await query(
        `insert into appointments
          (patient_id, slot_id, scheduled_date, scheduled_time, duration_minutes, status, patient_note)
         values ($1, $2, $3, '18:00', 50, 'pending', $4)`,
        [joaoId, joaoSunday.id, sunday, 'Prefiro no fim do dia, se possível.']
      );
    }
    if (mariaPast) {
      await query(
        `insert into appointments
          (patient_id, slot_id, scheduled_date, scheduled_time, duration_minutes, status)
         values ($1, $2, $3, '19:00', 50, 'completed')`,
        [mariaId, mariaPast.id, lastSaturday]
      );
    }
  }

  const chatCount = await query('select count(*)::int as c from chat_messages');
  if (chatCount.rows[0].c === 0) {
    await query(
      `insert into chat_messages (patient_id, sender_role, sender_name, body, created_at) values
        ($1, 'patient', 'Maria Oliveira', 'Olá, Dra. Helena! Consegui pagar o pacote pelo PIX hoje.', now() - interval '2 days'),
        ($1, 'admin', 'Dra. Helena Martins', 'Que ótimo, Maria! Já registrei o recebimento. Qualquer coisa me avise por aqui.', now() - interval '2 days' + interval '1 hour'),
        ($2, 'patient', 'João Ferreira', 'Dra., posso remarcar nossa sessão de domingo?', now() - interval '5 hours')`,
      [mariaId, joaoId]
    );
  }

  console.log('Seed de demonstração aplicado.');
}

export async function initDb() {
  let attempts = 0;
  while (attempts < 20) {
    try {
      await pool.query(SCHEMA);
      break;
    } catch (err) {
      attempts += 1;
      if (attempts >= 20) throw err;
      console.warn(`Banco ainda não disponível (${err.code || err.message}). Tentando novamente...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  await seed();
  console.log('Banco de dados pronto.', todayISO());
}
