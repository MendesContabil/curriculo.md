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

export const DOC_KINDS = ['document', 'receipt', 'certificate', 'declaration', 'support'];

export function mapSlot(row) {
  return {
    id: row.id,
    date: row.slot_date,
    startTime: row.start_time,
    endTime: row.end_time,
    isActive: row.is_active,
    isFuture: row.is_future,
    status: row.booking_id ? 'booked' : 'free',
    appointmentId: row.booking_id || null,
    appointmentStatus: row.booking_status || null,
    patientName: row.patient_name || null,
  };
}

export function mapAppointment(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name || null,
    patientPhone: row.patient_phone || null,
    patientEmail: row.patient_email || null,
    slotId: row.slot_id,
    date: row.scheduled_date,
    time: row.scheduled_time,
    durationMinutes: row.duration_minutes,
    status: row.status,
    meetingUrl: row.meeting_url || '',
    patientNote: row.patient_note || '',
    adminNote: row.admin_note || '',
    rescheduleSlotId: row.reschedule_slot_id,
    rescheduleDate: row.reschedule_date || null,
    rescheduleTime: row.reschedule_time || null,
    rescheduleNote: row.reschedule_note || '',
    isFuture: row.is_future,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapChatMessage(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    senderRole: row.sender_role,
    senderName: row.sender_name || '',
    body: row.body,
    createdAt: row.created_at,
  };
}

export function formatLabel(sessions) {
  if (sessions === 1) return 'Sessão avulsa';
  return `Pacote ${sessions} sessões`;
}
