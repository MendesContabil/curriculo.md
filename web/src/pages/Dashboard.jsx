import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Spinner,
  StatCard,
  formatBRL,
  formatDate,
  originLabel,
  useToast,
} from '../components/ui.jsx';
import {
  IconCalendar,
  IconChevronRight,
  IconPlus,
  IconUsers,
  IconWallet,
  IconCard,
  IconClock,
} from '../components/icons.jsx';

const greetingDate = () =>
  new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/api/overview'), api.get('/api/payments'), api.get('/api/patients')])
      .then(([overview, pays, pats]) => {
        if (!active) return;
        setData(overview);
        setPayments(pays);
        setPatients(pats);
      })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [toast]);

  const firstName = (user?.name || '').replace(/^(Dra?\.?|Psicóloga)\s*/i, '').split(' ')[0];

  if (loading && !data) return <Spinner label="Carregando seu painel" />;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">{greetingDate()}</p>
          <h1>Olá, {firstName || 'psicóloga'}</h1>
          <p className="page-sub">Aqui está o retrato do seu consultório hoje.</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => navigate('/pacientes?novo=1')}>
            <IconPlus width={18} height={18} /> Novo paciente
          </Button>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard
          icon={<IconUsers />}
          label="Pacientes ativos"
          value={data?.patientsTotal ?? 0}
          hint={`${data?.leveSaudeTotal ?? 0} pelo convênio Leve Saúde`}
        />
        <StatCard
          icon={<IconCalendar />}
          label="Pacotes em andamento"
          value={data?.activePackages ?? 0}
          hint="Com sessões disponíveis"
          tone="blue"
        />
        <StatCard
          icon={<IconWallet />}
          label="Recebido no mês"
          value={formatBRL(data?.receivedMonth ?? 0)}
          hint={`Total histórico ${formatBRL(data?.receivedTotal ?? 0)}`}
          tone="green"
        />
        <StatCard
          icon={<IconCard />}
          label="A receber"
          value={formatBRL(data?.pendingTotal ?? 0)}
          hint="Cobranças pendentes"
          tone="amber"
        />
      </div>

      <div className="split">
        <Card className="panel">
          <div className="panel-head">
            <div>
              <h2>Pagamentos recentes</h2>
              <p>Acompanhe as cobranças do consultório.</p>
            </div>
            <Link to="/financeiro" className="link-more">
              Ver financeiro <IconChevronRight width={16} height={16} />
            </Link>
          </div>

          {payments.length === 0 ? (
            <EmptyState
              icon={<IconWallet />}
              title="Nenhuma cobrança ainda"
              description="Ao registrar um pacote, a cobrança aparece aqui automaticamente."
            />
          ) : (
            <ul className="list">
              {payments.slice(0, 5).map((payment) => (
                <li key={payment.id} className="list-row">
                  <Avatar name={payment.patientName} size="sm" />
                  <div className="list-main">
                    <strong>{payment.patientName}</strong>
                    <span>
                      {payment.packageLabel || 'Cobrança avulsa'} ·{' '}
                      {payment.dueDate ? `vence ${formatDate(payment.dueDate)}` : 'sem vencimento'}
                    </span>
                  </div>
                  <div className="list-end">
                    <strong>{formatBRL(payment.amount)}</strong>
                    {payment.status === 'paid' ? (
                      <Badge tone="success">Pago</Badge>
                    ) : (
                      <Badge tone="warning">Pendente</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="panel">
          <div className="panel-head">
            <div>
              <h2>Seus pacientes</h2>
              <p>Prontuários e pacotes em dia.</p>
            </div>
            <Link to="/pacientes" className="link-more">
              Ver todos <IconChevronRight width={16} height={16} />
            </Link>
          </div>

          {patients.length === 0 ? (
            <EmptyState
              icon={<IconUsers />}
              title="Comece por um paciente"
              description="Cadastre o primeiro paciente para abrir o prontuário."
            />
          ) : (
            <ul className="list">
              {patients.slice(0, 5).map((patient) => (
                <li key={patient.id} className="list-row">
                  <Avatar name={patient.fullName} size="sm" />
                  <div className="list-main">
                    <strong>{patient.fullName}</strong>
                    <span>
                      {patient.age ? `${patient.age} anos` : 'Idade não informada'} ·{' '}
                      {patient.notesCount ?? 0} nota{(patient.notesCount ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Badge tone={patient.origin === 'leve_saude' ? 'teal' : 'neutral'}>
                    {originLabel(patient.origin)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="analytics-card">
        <div className="analytics-icon">
          <IconClock />
        </div>
        <div>
          <h3>Rotina leve, prontuário em ordem</h3>
          <p>
            Registre as evoluções logo após cada sessão e mantenha os pacotes atualizados. A
            cobrança do pacote já nasce vinculada ao paciente.
          </p>
        </div>
        <Link className="btn btn-subtle" to="/pacientes">
          Abrir pacientes
        </Link>
      </Card>
    </div>
  );
}
