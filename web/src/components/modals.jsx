import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Field, Modal, formatBRL, todayISO, useToast } from './ui.jsx';

const emptyPatient = {
  fullName: '',
  age: '',
  phone: '',
  email: '',
  origin: 'particular',
  password: '',
};

export function PatientFormModal({ open, onClose, patient, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyPatient);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(patient?.id);

  useEffect(() => {
    if (!open) return;
    setForm(
      patient
        ? {
            fullName: patient.fullName || '',
            age: patient.age || '',
            phone: patient.phone || '',
            email: patient.email || '',
            origin: patient.origin || 'particular',
            password: '',
          }
        : emptyPatient
    );
  }, [open, patient]);

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.fullName.trim()) {
      toast('Informe o nome completo do paciente.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        age: form.age === '' ? null : Number(form.age),
        phone: form.phone,
        email: form.email,
        origin: form.origin,
      };
      if (form.password) payload.password = form.password;
      const saved = editing
        ? await api.patch(`/api/patients/${patient.id}`, payload)
        : await api.post('/api/patients', payload);
      toast(editing ? 'Cadastro atualizado.' : 'Paciente cadastrado com sucesso.');
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar paciente' : 'Novo paciente'}
      subtitle="Dados de contato e origem do atendimento."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="patient-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar paciente'}
          </button>
        </>
      }
    >
      <form id="patient-form" className="form" onSubmit={submit}>
        <Field label="Nome completo *">
          <input
            value={form.fullName}
            onChange={update('fullName')}
            placeholder="Ex.: Maria Oliveira"
            required
          />
        </Field>
        <div className="form-row">
          <Field label="Idade">
            <input
              type="number"
              min="0"
              max="120"
              value={form.age}
              onChange={update('age')}
              placeholder="34"
            />
          </Field>
          <Field label="Telefone">
            <input value={form.phone} onChange={update('phone')} placeholder="(11) 90000-0000" />
          </Field>
        </div>
        <Field label="E-mail" hint="Com um e-mail, o paciente recebe acesso à própria área.">
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="paciente@email.com"
          />
        </Field>
        <Field label="Origem do atendimento">
          <div className="choice-grid">
            <label className={`choice ${form.origin === 'particular' ? 'choice-active' : ''}`}>
              <input
                type="radio"
                name="origin"
                value="particular"
                checked={form.origin === 'particular'}
                onChange={update('origin')}
              />
              <strong>Particular</strong>
              <span>Valor integral das sessões</span>
            </label>
            <label className={`choice ${form.origin === 'leve_saude' ? 'choice-active' : ''}`}>
              <input
                type="radio"
                name="origin"
                value="leve_saude"
                checked={form.origin === 'leve_saude'}
                onChange={update('origin')}
              />
              <strong>Convênio Leve Saúde</strong>
              <span>Desconto configurável aplicado</span>
            </label>
          </div>
        </Field>
        <Field
          label={editing ? 'Nova senha de acesso (opcional)' : 'Senha de acesso do paciente (opcional)'}
          hint={editing ? 'Deixe em branco para manter a senha atual.' : 'Padrão: paciente123'}
        >
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>
      </form>
    </Modal>
  );
}

const SESSION_OPTIONS = [
  { value: '1', label: 'Avulso', hint: '1 sessão' },
  { value: '2', label: 'Pacote', hint: '2 sessões' },
  { value: '4', label: 'Pacote', hint: '4 sessões' },
  { value: 'custom', label: 'Personalizado', hint: 'Você define' },
];

export function PackageModal({ open, onClose, patients = [], fixedPatient, defaultDiscount = 0, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    patientId: '',
    option: '4',
    custom: 6,
    baseValue: '',
    applyDiscount: false,
    discountPercent: defaultDiscount,
    dueDate: todayISO(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      patientId: fixedPatient?.id ? String(fixedPatient.id) : '',
      option: '4',
      custom: 6,
      baseValue: '',
      applyDiscount: fixedPatient?.origin === 'leve_saude',
      discountPercent: defaultDiscount,
      dueDate: todayISO(),
    });
  }, [open, fixedPatient, defaultDiscount]);

  const selectedPatient = useMemo(
    () => fixedPatient || patients.find((p) => String(p.id) === String(form.patientId)),
    [fixedPatient, patients, form.patientId]
  );

  const sessions = form.option === 'custom' ? Math.max(1, Number(form.custom) || 1) : Number(form.option);
  const base = Number(form.baseValue) || 0;
  const discount = form.applyDiscount ? Math.min(100, Math.max(0, Number(form.discountPercent) || 0)) : 0;
  const finalValue = Math.round(base * (1 - discount / 100) * 100) / 100;

  const handlePatient = (event) => {
    const patient = patients.find((p) => String(p.id) === event.target.value);
    setForm((f) => ({
      ...f,
      patientId: event.target.value,
      applyDiscount: patient?.origin === 'leve_saude',
      discountPercent: defaultDiscount,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedPatient) {
      toast('Selecione o paciente do pacote.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/patients/${selectedPatient.id}/packages`, {
        sessionsTotal: sessions,
        baseValue: base,
        applyDiscount: form.applyDiscount,
        discountPercent: form.applyDiscount ? discount : 0,
        dueDate: form.dueDate || null,
      });
      toast('Pacote registrado e cobrança criada.');
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pacote"
      subtitle="O valor final gera automaticamente uma cobrança pendente."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="package-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Registrando…' : 'Registrar pacote'}
          </button>
        </>
      }
    >
      <form id="package-form" className="form" onSubmit={submit}>
        {!fixedPatient && (
          <Field label="Paciente *">
            <select value={form.patientId} onChange={handlePatient} required>
              <option value="">Selecione…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} — {p.origin === 'leve_saude' ? 'Leve Saúde' : 'Particular'}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Formato do pacote">
          <div className="session-options">
            {SESSION_OPTIONS.map((opt) => {
              const active = form.option === opt.value;
              return (
                <label key={opt.value} className={`session-option ${active ? 'session-option-active' : ''}`}>
                  <input
                    type="radio"
                    name="sessions"
                    value={opt.value}
                    checked={active}
                    onChange={() => setForm((f) => ({ ...f, option: opt.value }))}
                  />
                  <strong>{opt.label}</strong>
                  <span>{opt.hint}</span>
                </label>
              );
            })}
          </div>
        </Field>

        {form.option === 'custom' && (
          <Field label="Quantidade de sessões">
            <input
              type="number"
              min="1"
              max="60"
              value={form.custom}
              onChange={(e) => setForm((f) => ({ ...f, custom: e.target.value }))}
            />
          </Field>
        )}

        <div className="form-row">
          <Field label="Valor cheio do pacote (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.baseValue}
              onChange={(e) => setForm((f) => ({ ...f, baseValue: e.target.value }))}
              placeholder="640,00"
              required
            />
          </Field>
          <Field label="Vencimento da cobrança">
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </Field>
        </div>

        <div className={`discount-box ${form.applyDiscount ? 'discount-active' : ''}`}>
          <label className="switch">
            <input
              type="checkbox"
              checked={form.applyDiscount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  applyDiscount: e.target.checked,
                  discountPercent: e.target.checked ? f.discountPercent || defaultDiscount : 0,
                }))
              }
            />
            <span className="switch-track" aria-hidden="true" />
            <span>
              Aplicar desconto Leve Saúde
              {selectedPatient && selectedPatient.origin !== 'leve_saude' && (
                <em> — paciente Particular</em>
              )}
            </span>
          </label>
          {form.applyDiscount && (
            <div className="discount-input">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.discountPercent}
                onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
              />
              <span>% de desconto</span>
            </div>
          )}
        </div>

        <div className="value-preview">
          <div>
            <span>Valor cheio</span>
            <strong>{formatBRL(base)}</strong>
          </div>
          <div>
            <span>Desconto</span>
            <strong>{discount ? `− ${formatBRL((base * discount) / 100)}` : '—'}</strong>
          </div>
          <div className="value-final">
            <span>Total a pagar</span>
            <strong>{formatBRL(finalValue)}</strong>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function PaymentModal({ open, onClose, patientId, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ amount: '', method: 'pix', dueDate: todayISO() });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ amount: '', method: 'pix', dueDate: todayISO() });
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/patients/${patientId}/payments`, {
        amount: Number(form.amount) || 0,
        method: form.method,
        dueDate: form.dueDate,
      });
      toast('Cobrança registrada.');
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova cobrança"
      subtitle="Registre um valor avulso para este paciente."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="payment-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Registrar cobrança'}
          </button>
        </>
      }
    >
      <form id="payment-form" className="form" onSubmit={submit}>
        <div className="form-row">
          <Field label="Valor (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </Field>
          <Field label="Forma de pagamento">
            <select
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="transferencia">Transferência</option>
            </select>
          </Field>
        </div>
        <Field label="Vencimento">
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
        </Field>
      </form>
    </Modal>
  );
}

export function ProofModal({ open, onClose, payments = [], preselected, onSaved }) {
  const toast = useToast();
  const pending = payments.filter((p) => p.status === 'pending');
  const [paymentId, setPaymentId] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaymentId(preselected ? String(preselected) : pending[0] ? String(pending[0].id) : '');
    setFile(null);
  }, [open, preselected]);

  const submit = async (event) => {
    event.preventDefault();
    if (!file) {
      toast('Selecione o arquivo do comprovante.', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append('file', file);
      if (paymentId) data.append('paymentId', paymentId);
      data.append('title', 'Comprovante de pagamento');
      await api.upload('/api/me/proofs', data);
      toast('Comprovante enviado para a psicóloga.');
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar comprovante"
      subtitle="Anexe o comprovante do PIX ou de outro pagamento."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="proof-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enviando…' : 'Enviar comprovante'}
          </button>
        </>
      }
    >
      <form id="proof-form" className="form" onSubmit={submit}>
        <Field label="Cobrança relacionada">
          <select value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
            <option value="">Sem vínculo específico</option>
            {pending.map((p) => (
              <option key={p.id} value={p.id}>
                {formatBRL(p.amount)} — vence {p.dueDate || 'sem data'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Arquivo (PDF ou imagem)">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
      </form>
    </Modal>
  );
}
