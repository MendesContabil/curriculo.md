import { useEffect, useState } from 'react';
import { api } from '../api';
import { Field, Modal, formatClock, formatDate, formatWeekday, useToast } from './ui.jsx';
import { IconLink, IconVideo } from './icons.jsx';

export function SlotRequestModal({ open, onClose, slot, appointment, onSaved }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const rescheduling = Boolean(appointment?.id);

  useEffect(() => {
    if (open) setNote('');
  }, [open, slot]);

  if (!open || !slot) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (rescheduling) {
        await api.post(`/api/me/appointments/${appointment.id}/reschedule`, {
          slotId: slot.id,
          note,
        });
        toast('Remarcação solicitada. Aguarde a confirmação da psicóloga.');
      } else {
        await api.post('/api/me/appointments', { slotId: slot.id, note });
        toast('Agendamento solicitado com sucesso.');
      }
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
      title={rescheduling ? 'Solicitar remarcação' : 'Solicitar agendamento'}
      subtitle={
        rescheduling
          ? 'A psicóloga precisa confirmar o novo horário antes de valer.'
          : 'Sua solicitação ficará aguardando a confirmação da psicóloga.'
      }
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="slot-request-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enviando…' : rescheduling ? 'Solicitar remarcação' : 'Solicitar horário'}
          </button>
        </>
      }
    >
      <form id="slot-request-form" className="form" onSubmit={submit}>
        <div className="slot-summary">
          <span className="slot-summary-icon">
            <IconVideo width={20} height={20} />
          </span>
          <div>
            <strong>{formatDate(slot.date)}</strong>
            <span>
              {formatWeekday(slot.date)} · {formatClock(slot.startTime)} às {formatClock(slot.endTime)}
            </span>
          </div>
        </div>
        {rescheduling && (
          <p className="muted">
            Sessão atual: {formatDate(appointment.date)} às {formatClock(appointment.time)}.
          </p>
        )}
        <Field label="Observação (opcional)" hint="Conte à psicóloga se precisa de alguma acomodação.">
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: prefiro o primeiro horário da noite."
          />
        </Field>
      </form>
    </Modal>
  );
}

export function SlotPickerModal({ open, onClose, slots = [], onPick }) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Escolher novo horário"
      subtitle="Selecione um dos horários livres publicados pela psicóloga."
      size="sm"
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Voltar
        </button>
      }
    >
      {slots.length === 0 ? (
        <p className="muted">Não há horários livres no momento. Fale com a psicóloga pelo chat.</p>
      ) : (
        <ul className="slot-picker">
          {slots.map((slot) => (
            <li key={slot.id}>
              <button type="button" className="slot-picker-item" onClick={() => onPick(slot)}>
                <span>
                  <strong>{formatDate(slot.date)}</strong>
                  <span>{formatWeekday(slot.date)}</span>
                </span>
                <span className="slot-picker-time">
                  {formatClock(slot.startTime)} – {formatClock(slot.endTime)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function MeetingLinkModal({ open, onClose, appointment, onSaved }) {
  const toast = useToast();
  const [meetingUrl, setMeetingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setMeetingUrl(appointment?.meetingUrl || '');
  }, [open, appointment]);

  if (!open || !appointment) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/appointments/${appointment.id}`, {
        action: 'meeting_url',
        meetingUrl,
      });
      toast(meetingUrl.trim() ? 'Link da sala de vídeo salvo.' : 'Link da sala removido.');
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
      title="Link da sala de vídeo"
      subtitle={`${appointment.patientName || 'Paciente'} · ${formatDate(appointment.date)} às ${formatClock(appointment.time)}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="meeting-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar link'}
          </button>
        </>
      }
    >
      <form id="meeting-form" className="form" onSubmit={submit}>
        <div className="notice-box">
          <span className="notice-box-icon">
            <IconLink width={18} height={18} />
          </span>
          <p>
            Cole o link do Google Meet, Zoom ou Whereby. O paciente vê o botão “Entrar na sala”
            assim que a sessão estiver confirmada.
          </p>
        </div>
        <Field label="Link da sala virtual">
          <input
            type="url"
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
          />
        </Field>
      </form>
    </Modal>
  );
}
