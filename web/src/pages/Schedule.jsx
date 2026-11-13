import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { MeetingLinkModal } from '../components/scheduleModals.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Spinner,
  StatCard,
  formatClock,
  formatDate,
  formatWeekday,
  todayISO,
  useToast,
} from '../components/ui.jsx';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconLink,
  IconPlus,
  IconTrash,
  IconVideo,
  IconX,
} from '../components/icons.jsx';

const TABS = [
  { key: 'requests', label: 'Solicitações' },
  { key: 'upcoming', label: 'Próximas sessões' },
  { key: 'slots', label: 'Horários livres' },
  { key: 'history', label: 'Realizadas' },
];

const STATUS_META = {
  pending: { label: 'Aguardando confirmação', tone: 'warning' },
  confirmed: { label: 'Confirmada', tone: 'success' },
  reschedule_requested: { label: 'Remarcação solicitada', tone: 'teal' },
  completed: { label: 'Realizada', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

function whatsappLink(appointment) {
  const digits = String(appointment.patientPhone || '').replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.startsWith('55') ? digits : `55${digits}`;
  const firstName = (appointment.patientName || '').split(' ')[0];
  const message = `Olá, ${firstName}! Confirmando nossa sessão de psicoterapia em ${formatDate(
    appointment.date
  )} às ${formatClock(appointment.time)}. Até lá!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function SessionRow({ appointment, onMeeting, onAction }) {
  const meta = STATUS_META[appointment.status] || STATUS_META.pending;
  const whatsapp = whatsappLink(appointment);
  return (
    <li className="session-card">
      <Avatar name={appointment.patientName} size="sm" />
      <div className="list-main">
        <div className="session-title">
          <strong>{appointment.patientName}</strong>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <span>
          {formatDate(appointment.date)} · {formatWeekday(appointment.date)} ·{' '}
          {formatClock(appointment.time)} ({appointment.durationMinutes} min)
        </span>
        {appointment.patientNote && (
          <p className="session-note">“{appointment.patientNote}”</p>
        )}
        {appointment.status === 'reschedule_requested' && appointment.rescheduleDate && (
          <p className="session-reschedule">
            <IconCalendar width={15} height={15} /> Novo horário pedido: {formatDate(appointment.rescheduleDate)} às{' '}
            {formatClock(appointment.rescheduleTime)}
            {appointment.rescheduleNote ? ` — “${appointment.rescheduleNote}”` : ''}
          </p>
        )}
        {appointment.status === 'completed' && appointment.meetingUrl && (
          <span className="session-link">
            <IconLink width={14} height={14} /> {appointment.meetingUrl}
          </span>
        )}
      </div>
      <div className="session-actions">
        {appointment.status === 'pending' && (
          <>
            <Button size="sm" onClick={() => onAction(appointment, 'confirm')}>
              <IconCheck width={16} height={16} /> Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAction(appointment, 'decline')}>
              <IconX width={16} height={16} /> Recusar
            </Button>
          </>
        )}
        {appointment.status === 'reschedule_requested' && (
          <>
            <Button size="sm" onClick={() => onAction(appointment, 'reschedule_accept')}>
              <IconCheck width={16} height={16} /> Aceitar novo horário
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAction(appointment, 'reschedule_decline')}>
              Manter horário
            </Button>
          </>
        )}
        {appointment.status === 'confirmed' && (
          <>
            <Button size="sm" variant="subtle" onClick={() => onMeeting(appointment)}>
              <IconVideo width={16} height={16} /> Link da sala
            </Button>
            {appointment.meetingUrl && (
              <a
                className="icon-btn"
                href={appointment.meetingUrl}
                target="_blank"
                rel="noreferrer"
                title="Abrir sala de vídeo"
                aria-label="Abrir sala de vídeo"
              >
                <IconLink width={17} height={17} />
              </a>
            )}
            {whatsapp && (
              <a
                className="btn btn-ghost btn-sm"
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                title="Enviar confirmação pelo WhatsApp"
              >
                WhatsApp
              </a>
            )}
            <Button size="sm" variant="ghost" onClick={() => onAction(appointment, 'complete')}>
              Concluir
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export default function Schedule() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('requests');
  const [meeting, setMeeting] = useState(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotForm, setSlotForm] = useState({
    date: todayISO(),
    startTime: '19:00',
    endTime: '19:50',
  });

  const load = () => {
    setLoading(true);
    api
      .get('/api/agenda')
      .then(setData)
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requests = useMemo(
    () =>
      (data?.appointments || [])
        .filter((a) => ['pending', 'reschedule_requested'].includes(a.status))
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [data]
  );

  const upcoming = useMemo(
    () =>
      (data?.appointments || [])
        .filter((a) => a.status === 'confirmed' && a.isFuture)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [data]
  );

  const completed = useMemo(
    () =>
      (data?.appointments || [])
        .filter((a) => a.status === 'completed')
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
    [data]
  );

  const addSlot = async (event) => {
    event.preventDefault();
    setSavingSlot(true);
    try {
      await api.post('/api/slots', slotForm);
      toast('Horário disponível publicado.');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingSlot(false);
    }
  };

  const deleteSlot = async (slot) => {
    if (!window.confirm('Remover este horário da agenda?')) return;
    try {
      await api.del(`/api/slots/${slot.id}`);
      load();
      toast('Horário removido.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const action = async (appointment, name) => {
    const messages = {
      confirm: 'Confirmar esta sessão para o paciente?',
      decline: 'Recusar esta solicitação? O horário volta a ficar livre.',
      complete: 'Marcar esta sessão como realizada?',
      cancel: 'Cancelar esta sessão?',
      reschedule_accept: 'Aceitar o novo horário solicitado pelo paciente?',
      reschedule_decline: 'Manter o horário original e recusar a remarcação?',
    };
    if (messages[name] && !window.confirm(messages[name])) return;
    try {
      await api.patch(`/api/appointments/${appointment.id}`, { action: name });
      load();
      toast('Agenda atualizada.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading && !data) return <Spinner label="Carregando agenda" />;
  if (!data) return null;

  const slots = data.slots || [];

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Teleatendimento</p>
          <h1>Agenda</h1>
          <p className="page-sub">
            Publique noites e finais de semana, confirme solicitações e envie o link da sala.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" onClick={() => setTab('slots')}>
            <IconPlus width={17} height={17} /> Publicar horário
          </Button>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard
          icon={<IconClock />}
          label="Solicitações"
          value={data.stats.pendingRequests}
          hint="Aguardando sua confirmação"
          tone="amber"
        />
        <StatCard
          icon={<IconCalendar />}
          label="Próximas sessões"
          value={data.stats.upcoming}
          hint="Confirmadas"
          tone="blue"
        />
        <StatCard
          icon={<IconCheck />}
          label="Realizadas"
          value={data.stats.completed}
          hint="Histórico do consultório"
          tone="green"
        />
        <StatCard
          icon={<IconVideo />}
          label="Horários livres"
          value={data.stats.freeSlots}
          hint="Disponíveis para o paciente"
        />
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`tab ${tab === item.key ? 'tab-active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            {item.key === 'requests' && requests.length > 0 && (
              <span className="tab-count">{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <Card className="panel">
          <div className="panel-head">
            <div>
              <h2>Solicitações de agendamento</h2>
              <p>Confirme novos horários ou avalie pedidos de remarcação.</p>
            </div>
          </div>
          {requests.length === 0 ? (
            <EmptyState
              icon={<IconClock />}
              title="Nenhuma solicitação pendente"
              description="Quando um paciente pedir um horário publicado, ele aparece aqui."
            />
          ) : (
            <ul className="session-list">
              {requests.map((appointment) => (
                <SessionRow
                  key={appointment.id}
                  appointment={appointment}
                  onMeeting={setMeeting}
                  onAction={action}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'upcoming' && (
        <Card className="panel">
          <div className="panel-head">
            <div>
              <h2>Próximas sessões</h2>
              <p>Insira o link da sala e envie a confirmação ao paciente.</p>
            </div>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<IconCalendar />}
              title="Nenhuma sessão confirmada"
              description="Confirme uma solicitação para montar sua agenda."
            />
          ) : (
            <ul className="session-list">
              {upcoming.map((appointment) => (
                <SessionRow
                  key={appointment.id}
                  appointment={appointment}
                  onMeeting={setMeeting}
                  onAction={action}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'slots' && (
        <div className="split split-agenda">
          <Card className="panel">
            <div className="panel-head">
              <div>
                <h2>Publicar horário livre</h2>
                <p>Foco em noites de semana e finais de semana.</p>
              </div>
            </div>
            <form className="form" onSubmit={addSlot}>
              <Field label="Data">
                <input
                  type="date"
                  value={slotForm.date}
                  min={todayISO()}
                  onChange={(event) => setSlotForm((f) => ({ ...f, date: event.target.value }))}
                  required
                />
              </Field>
              <div className="form-row">
                <Field label="Início">
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={(event) => setSlotForm((f) => ({ ...f, startTime: event.target.value }))}
                    required
                  />
                </Field>
                <Field label="Fim">
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={(event) => setSlotForm((f) => ({ ...f, endTime: event.target.value }))}
                    required
                  />
                </Field>
              </div>
              <p className="field-hint">
                Sugestão: 50 minutos por sessão. Ex.: terça e quinta às 19h; sábados pela manhã.
              </p>
              <div className="form-actions">
                <Button type="submit" disabled={savingSlot}>
                  {savingSlot ? 'Publicando…' : 'Publicar horário'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="panel">
            <div className="panel-head">
              <div>
                <h2>Horários publicados</h2>
                <p>{slots.length} horário(s) a partir de hoje.</p>
              </div>
            </div>
            {slots.length === 0 ? (
              <EmptyState
                icon={<IconCalendar />}
                title="Nenhum horário publicado"
                description="Publique horários para que os pacientes possam solicitar sessões."
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Horário</th>
                      <th>Status</th>
                      <th className="ta-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => {
                      const booked = Boolean(slot.appointmentId);
                      return (
                        <tr key={slot.id}>
                          <td>
                            <strong>{formatDate(slot.date)}</strong>
                            <span className="table-sub">{formatWeekday(slot.date)}</span>
                          </td>
                          <td>
                            {formatClock(slot.startTime)} – {formatClock(slot.endTime)}
                          </td>
                          <td>
                            {!slot.isFuture ? (
                              <Badge tone="neutral">Passado</Badge>
                            ) : booked ? (
                              <Badge tone="teal">Reservado</Badge>
                            ) : (
                              <Badge tone="success">Livre</Badge>
                            )}
                          </td>
                          <td className="ta-right">
                            <button
                              type="button"
                              className="icon-btn icon-btn-danger"
                              onClick={() => deleteSlot(slot)}
                              disabled={booked}
                              aria-label="Remover horário"
                            >
                              <IconTrash width={16} height={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card className="panel">
          <div className="panel-head">
            <div>
              <h2>Consultas realizadas</h2>
              <p>Histórico de sessões concluídas.</p>
            </div>
          </div>
          {completed.length === 0 ? (
            <EmptyState
              icon={<IconCheck />}
              title="Nenhuma sessão concluída"
              description="Ao concluir uma sessão confirmada, ela entra neste histórico."
            />
          ) : (
            <ul className="session-list">
              {completed.map((appointment) => (
                <SessionRow
                  key={appointment.id}
                  appointment={appointment}
                  onMeeting={setMeeting}
                  onAction={action}
                />
              ))}
            </ul>
          )}
        </Card>
      )}

      <MeetingLinkModal
        open={Boolean(meeting)}
        onClose={() => setMeeting(null)}
        appointment={meeting}
        onSaved={load}
      />
    </div>
  );
}
