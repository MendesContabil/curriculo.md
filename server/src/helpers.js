export function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export const num = (value) => (value === null || value === undefined ? null : Number(value));

export function mapPackage(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    label: row.label,
    sessionsTotal: row.sessions_total,
    sessionsUsed: row.sessions_used,
    baseValue: num(row.base_value),
    discountPercent: num(row.discount_percent),
    finalValue: num(row.final_value),
    createdAt: row.created_at,
    patientName: row.patient_name || null,
  };
}

export function mapPayment(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    packageId: row.package_id,
    amount: num(row.amount),
    status: row.status,
    method: row.method,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    patientName: row.patient_name || null,
    packageLabel: row.package_label || null,
  };
}

export function mapPatient(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    age: row.age,
    phone: row.phone,
    email: row.email,
    origin: row.origin,
    createdAt: row.created_at,
    activePackages: row.active_packages !== undefined ? Number(row.active_packages) : undefined,
    pendingAmount: row.pending_amount !== undefined ? Number(row.pending_amount) : undefined,
    notesCount: row.notes_count !== undefined ? Number(row.notes_count) : undefined,
    hasAccount: row.has_account !== undefined ? row.has_account : undefined,
  };
}

export function mapDocument(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    fileId: row.file_id,
    title: row.title,
    kind: row.kind,
    direction: row.direction,
    paymentId: row.payment_id,
    createdAt: row.created_at,
    fileName: row.original_name,
    mime: row.mime,
    size: row.size,
    patientName: row.patient_name || null,
  };
}

export function formatLabel(sessions) {
  if (sessions === 1) return 'Sessão avulsa';
  return `Pacote ${sessions} sessões`;
}
