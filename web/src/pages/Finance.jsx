import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { PackageModal } from '../components/modals.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Progress,
  Spinner,
  StatCard,
  formatBRL,
  formatDate,
  useToast,
} from '../components/ui.jsx';
import {
  IconCalendar,
  IconCard,
  IconPlus,
  IconUsers,
  IconWallet,
  IconSparkle,
} from '../components/icons.jsx';

export default function Finance() {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [packageOpen, setPackageOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/overview'),
      api.get('/api/packages'),
      api.get('/api/payments'),
      api.get('/api/patients'),
      api.get('/api/settings'),
    ])
      .then(([ov, pkgs, pays, pats, set]) => {
        setOverview(ov);
        setPackages(pkgs);
        setPayments(pays);
        setPatients(pats);
        setSettings(set);
      })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPayments = useMemo(
    () =>
      payments.filter((p) => (filter === 'all' ? true : filter === 'pending' ? p.status === 'pending' : p.status === 'paid')),
    [payments, filter]
  );

  const togglePayment = async (payment) => {
    try {
      await api.patch(`/api/payments/${payment.id}`, {
        status: payment.status === 'paid' ? 'pending' : 'paid',
      });
      const [ov, pays] = await Promise.all([api.get('/api/overview'), api.get('/api/payments')]);
      setOverview(ov);
      setPayments(pays);
      toast('Status do pagamento atualizado.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading && !overview) return <Spinner label="Carregando financeiro" />;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1>Controle de pagamentos</h1>
          <p className="page-sub">Pacotes, descontos e cobranças por paciente.</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => setPackageOpen(true)}>
            <IconPlus width={18} height={18} /> Registrar pacote
          </Button>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard
          icon={<IconWallet />}
          label="Recebido no mês"
          value={formatBRL(overview?.receivedMonth ?? 0)}
          hint={`Histórico ${formatBRL(overview?.receivedTotal ?? 0)}`}
          tone="green"
        />
        <StatCard
          icon={<IconCard />}
          label="A receber"
          value={formatBRL(overview?.pendingTotal ?? 0)}
          hint="Cobranças em aberto"
          tone="amber"
        />
        <StatCard
          icon={<IconCalendar />}
          label="Pacotes ativos"
          value={overview?.activePackages ?? 0}
          hint="Com sessões disponíveis"
          tone="blue"
        />
        <StatCard
          icon={<IconUsers />}
          label="Leve Saúde"
          value={overview?.leveSaudeTotal ?? 0}
          hint={`Desconto padrão de ${settings?.leveSaudeDiscount ?? 0}%`}
        />
      </div>

      <Card className="info-banner">
        <IconSparkle />
        <div>
          <strong>Desconto automático do convênio</strong>
          <p>
            Pacientes com origem Leve Saúde recebem {settings?.leveSaudeDiscount ?? 0}% de desconto
            ao registrar pacotes. Você pode ajustar o percentual em{' '}
            <Link to="/configuracoes">Aparência</Link> e alterar caso a caso.
          </p>
        </div>
      </Card>

      <Card className="panel">
        <div className="panel-head">
          <div>
            <h2>Pacotes registrados</h2>
            <p>Progresso das sessões e valores praticados.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPackageOpen(true)}>
            <IconPlus width={16} height={16} /> Novo pacote
          </Button>
        </div>

        {packages.length === 0 ? (
          <EmptyState
            icon={<IconCalendar />}
            title="Nenhum pacote registrado"
            description="Registre sessões avulsas, pacotes de 2 ou 4 sessões ou personalizados."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Pacote</th>
                  <th>Sessões</th>
                  <th>Desconto</th>
                  <th>Valor final</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>
                      <Link to={`/pacientes/${pkg.patientId}`} className="table-link">
                        {pkg.patientName}
                      </Link>
                    </td>
                    <td>
                      <strong>{pkg.label}</strong>
                      <div className="cell-sub">
                        {formatBRL(pkg.baseValue)} cheio
                      </div>
                    </td>
                    <td>
                      <div className="cell-progress">
                        <Progress value={pkg.sessionsUsed} max={pkg.sessionsTotal} />
                        <span>
                          {pkg.sessionsUsed}/{pkg.sessionsTotal}
                        </span>
                      </div>
                    </td>
                    <td>{pkg.discountPercent ? <Badge tone="teal">{pkg.discountPercent}%</Badge> : '—'}</td>
                    <td>
                      <strong>{formatBRL(pkg.finalValue)}</strong>
                    </td>
                    <td className="muted">{formatDate(pkg.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="panel">
        <div className="panel-head">
          <div>
            <h2>Pagamentos</h2>
            <p>Marque as cobranças recebidas e acompanhe os vencimentos.</p>
          </div>
          <div className="segmented">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'paid', label: 'Pagos' },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                className={filter === f.value ? 'segmented-active' : ''}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={<IconWallet />}
            title="Nenhum pagamento nesse filtro"
            description="As cobranças aparecem aqui conforme os pacotes são registrados."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Referência</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th className="ta-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <Link to={`/pacientes/${payment.patientId}`} className="table-link">
                        {payment.patientName}
                      </Link>
                    </td>
                    <td className="muted">{payment.packageLabel || 'Cobrança avulsa'}</td>
                    <td>
                      <strong>{formatBRL(payment.amount)}</strong>
                    </td>
                    <td>{formatDate(payment.dueDate)}</td>
                    <td>
                      {payment.status === 'paid' ? (
                        <Badge tone="success">Pago</Badge>
                      ) : (
                        <Badge tone="warning">Pendente</Badge>
                      )}
                    </td>
                    <td className="ta-right">
                      <Button
                        size="sm"
                        variant={payment.status === 'paid' ? 'ghost' : 'subtle'}
                        onClick={() => togglePayment(payment)}
                      >
                        {payment.status === 'paid' ? 'Reabrir' : 'Marcar pago'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PackageModal
        open={packageOpen}
        onClose={() => setPackageOpen(false)}
        patients={patients}
        defaultDiscount={settings?.leveSaudeDiscount ?? 0}
        onSaved={load}
      />
    </div>
  );
}
