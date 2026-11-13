import { useEffect, useState } from 'react';
import { api } from '../api';
import { Field, Modal, useToast } from './ui.jsx';

const emptyForm = { patientId: '', title: '', kind: 'certificate', file: null };

export function SharedDocumentModal({ open, onClose, patients = [], defaultPatientId, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, patientId: defaultPatientId ? String(defaultPatientId) : '' });
  }, [open, defaultPatientId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.patientId) {
      toast('Selecione o paciente que receberá o documento.', 'error');
      return;
    }
    if (!form.file) {
      toast('Selecione o arquivo para compartilhar.', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append('patientId', form.patientId);
      data.append('title', form.title || form.file.name);
      data.append('kind', form.kind);
      data.append('file', form.file);
      await api.upload('/api/shared-documents', data);
      toast('Documento compartilhado com o paciente.');
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
      title="Compartilhar documento"
      subtitle="Atestados, declarações e materiais de apoio ficam disponíveis na área do paciente."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="shared-document-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enviando…' : 'Compartilhar documento'}
          </button>
        </>
      }
    >
      <form id="shared-document-form" className="form" onSubmit={submit}>
        <Field label="Paciente *">
          <select
            value={form.patientId}
            onChange={(event) => setForm((f) => ({ ...f, patientId: event.target.value }))}
            required
          >
            <option value="">Selecione o paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Título">
          <input
            value={form.title}
            onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
            placeholder="Ex.: Atestado de comparecimento"
          />
        </Field>
        <div className="form-row">
          <Field label="Tipo">
            <select
              value={form.kind}
              onChange={(event) => setForm((f) => ({ ...f, kind: event.target.value }))}
            >
              <option value="certificate">Atestado</option>
              <option value="declaration">Declaração</option>
              <option value="support">Material de apoio</option>
              <option value="receipt">Recibo</option>
              <option value="document">Documento</option>
            </select>
          </Field>
          <Field label="Arquivo *">
            <input
              type="file"
              accept=".pdf,image/*,.txt,.doc,.docx"
              onChange={(event) =>
                setForm((f) => ({ ...f, file: event.target.files?.[0] || null }))
              }
              required
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
