import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ProofModal } from '../components/modals.jsx';
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
  originLabel,
  useToast,
} from '../components/ui.jsx';
import {
  IconCalendar,
  IconCard,
  IconCheck,
  IconCopy,
  IconDownload,
  IconFile,
  IconUpload,
  IconWallet,
} from '../components/icons.jsx';

const TABS = [
  { key: 'resumo', to: '/minha-area', label: 'Resumo' },
  { key: 'pagamentos', to: '/minha-area/pagamentos', label: 'Pagamentos' },
  { key: 'documentos', to: '/minha-area/documentos', label: 'Documentos' },
];

function DocumentList({ documents, emptyTitle, emptyText, onProof }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<IconFile />}
        title={emptyTitle}
        description={emptyText}
        action={
          onProof ? (
            <Button variant="ghost" size="sm" onClick={onProof}>
              <IconUpload width={16} height={16} /> Enviar comprovante
            </Button>
          ) : null
        }
      />
    );
  }
  return (
    <ul className="list">
      {documents.map((doc) => (
        <li key={doc.id} className="list-row">
          <span className="file-icon">
            <IconFile width={18} height={18} />
          </span>
          <div className="list-main">
            <strong>{doc.title}</strong>
            <span>
              {formatDate(doc.createdAt)} · {doc.fileName}
            </span>
          </div>
          <div className="row-actions">
            {doc.kind === 'receipt' && <Badge tone="teal">Recibo</Badge>}
            <a
              className="icon-btn"
              href={`/api/files/${doc.fileId}?download=1`}
              aria-label={`Baixar ${doc.title}`}
            >
              <IconDownload width={17} height={17} />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PatientArea({ section = 'resumo' }) {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proofOpen, setProofOpen] = useState(false);
  const [preselected, setPreselected] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/api/me/overview')
      .then(setData)
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingPayments = useMemo(
    () => (data?.payments || []).filter((p) => p.status === 'pending'),
    [data]
  );

  const sessionsRemaining = useMemo(
    () =>
      (data?.packages || []).reduce(
        (sum, pkg) => sum + Math.max(0, pkg.sessionsTotal - pkg.sessionsUsed),
        0
      ),
    [data]
  );

  const activePackages = (data?.packages || []).filter(
    (pkg) => pkg.sessionsUsed < pkg.sessionsTotal
  );

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(data?.pixKey || '');
      toast('Chave PIX copiada.');
    } catch {
      toast('Não foi possível copiar. Selecione a chave manualmente.', 'error');
    }
  };

  const openProof = (paymentId) => {
    setPreselected(paymentId || null);
    setProofOpen(true);
  };

  if (loading && !data) return <Spinner label="Carregando sua área" />;
  if (!data) return null;

  const firstName = (data.patient.fullName || '').split(' ')[0];
  const receivedDocuments = data.documents.filter((d) => d.direction === 'to_patient');
  const sentProofs = data.documents.filter((d) => d.direction === 'from_patient');

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Área do paciente</p>
          <h1>Olá, {firstName}</h1>
          <p className="page-sub">
            Acompanhe suas sessões, pagamentos e documentos com a {data.clinicName || 'sua psicóloga'}.
          </p>
        </div>
        <div className="page-actions">
          <Badge tone={data.patient.origin === 'leve_saude' ? 'teal' : 'neutral'}>
            {originLabel(data.patient.origin)}
          </Badge>
          <Button variant="ghost" onClick={() => openProof(null)}>
            <IconUpload width={17} height={17} /> Enviar comprovante
          </Button>
        </div>
      </header>

      <div className="tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            end={tab.key === 'resumo'}
            className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {section === 'resumo' && (
        <>
          <div className="stat-grid">
            <StatCard
              icon={<IconCalendar />}
              label="Pacotes ativos"
              value={activePackages.length}
              hint="Em andamento"
              tone="blue"
            />
            <StatCard
              icon={<IconCheck />}
              label="Sessões restantes"
              value={sessionsRemaining}
              hint="Disponíveis nos pacotes"
              tone="green"
            />
            <StatCard
              icon={<IconCard />}
              label="A pagar"
              value={formatBRL(data.pendingTotal)}
              hint={`${pendingPayments.length} cobrança(s) em aberto`}
              tone="amber"
            />
            <StatCard
              icon={<IconWallet />}
              label="Total pago"
              value={formatBRL(data.paidTotal)}
              hint="Histórico de pagamentos"
            />
          </div>

          <div className="split">
            <Card className="pix-card">
              <div className="pix-head">
                <span className="pix-icon">
                  <IconCopy width={20} height={20} />
                </span>
                <div>
                  <h2>Chave PIX do consultório</h2>
                  <p>Use esta chave para pagar suas sessões.</p>
                </div>
              </div>
              {data.pixKey ? (
                <>
                  <div className="pix-key">{data.pixKey}</div>
                  <div className="pix-actions">
                    <Button variant="ghost" onClick={copyPix}>
                      <IconCopy width={16} height={16} /> Copiar chave
                    </Button>
                    <Button onClick={() => openProof(null)}>
                      <IconUpload width={16} height={16} /> Anexar comprovante
                    </Button>
                  </div>
                </>
              ) : (
                <p className="muted">
                  A psicóloga ainda não cadastrou a chave PIX. Fale com ela para combinar o
                  pagamento.
                </p>
              )}
            </Card>

            <Card className="panel">
              <div className="panel-head">
                <div>
                  <h2>Cobranças em aberto</h2>
                  <p>Pague e envie o comprovante por aqui.</p>
                </div>
              </div>
              {pendingPayments.length === 0 ? (
                <EmptyState
                  icon={<IconCheck />}
                  title="Tudo em dia"
                  description="Você não tem cobranças pendentes neste momento."
                />
              ) : (
                <ul className="list">
                  {pendingPayments.map((payment) => (
                    <li key={payment.id} className="list-row">
                      <span className="file-icon file-icon-amber">
                        <IconCard width={18} height={18} />
                      </span>
                      <div className="list-main">
                        <strong>{formatBRL(payment.amount)}</strong>
                        <span>
                          {payment.packageLabel || 'Cobrança avulsa'} · vence{' '}
                          {formatDate(payment.dueDate)}
                        </span>
                      </div>
                      <Button size="sm" variant="subtle" onClick={() => openProof(payment.id)}>
                        Enviar comprovante
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="panel">
            <div className="panel-head">
              <div>
                <h2>Documentos recentes</h2>
                <p>Recibos e arquivos enviados pela psicóloga.</p>
              </div>
              <NavLink className="link-more" to="/minha-area/documentos">
                Ver todos
              </NavLink>
            </div>
            <DocumentList
              documents={receivedDocuments.slice(0, 3)}
              emptyTitle="Nenhum documento recebido"
              emptyText="Recibos e materiais enviados pela psicóloga aparecerão aqui."
            />
          </Card>
        </>
      )}

      {section === 'pagamentos' && (
        <>
          <div className="stat-grid">
            <StatCard
              icon={<IconCard />}
              label="A pagar"
              value={formatBRL(data.pendingTotal)}
              hint="Cobranças pendentes"
              tone="amber"
            />
            <StatCard
              icon={<IconWallet />}
              label="Total pago"
              value={formatBRL(data.paidTotal)}
              hint="Desde o início do acompanhamento"
              tone="green"
            />
            <StatCard
              icon={<IconCalendar />}
              label="Sessões disponíveis"
              value={sessionsRemaining}
              hint={`${activePackages.length} pacote(s) ativo(s)`}
            />
          </div>

          <div className="section-bar">
            <div>
              <h2>Seus pacotes</h2>
              <p>Progresso das sessões contratadas.</p>
            </div>
          </div>

          {data.packages.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconCalendar />}
                title="Nenhum pacote ainda"
                description="Quando a psicóloga registrar suas sessões, elas aparecem aqui."
              />
            </Card>
          ) : (
            <div className="package-grid">
              {data.packages.map((pkg) => {
                const done = pkg.sessionsUsed >= pkg.sessionsTotal;
                return (
                  <Card key={pkg.id} className="package-card">
                    <div className="package-head">
                      <div>
                        <h3>{pkg.label}</h3>
                        <span className="muted">
                          {pkg.sessionsUsed} de {pkg.sessionsTotal} sessões realizadas
                        </span>
                      </div>
                      <Badge tone={done ? 'neutral' : 'success'}>
                        {done ? 'Concluído' : 'Ativo'}
                      </Badge>
                    </div>
                    <Progress value={pkg.sessionsUsed} max={pkg.sessionsTotal} />
                    <div className="package-values">
                      <div>
                        <span>Valor do pacote</span>
                        <strong>{formatBRL(pkg.finalValue)}</strong>
                      </div>
                      {pkg.discountPercent > 0 && (
                        <div>
                          <span>Desconto Leve Saúde</span>
                          <strong>{pkg.discountPercent}%</strong>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="panel">
            <div className="panel-head">
              <div>
                <h2>Histórico de pagamentos</h2>
                <p>Cobranças geradas pelos seus pacotes.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openProof(null)}>
                <IconUpload width={16} height={16} /> Comprovante
              </Button>
            </div>
            {data.payments.length === 0 ? (
              <EmptyState
                icon={<IconWallet />}
                title="Nenhum pagamento"
                description="Seus pagamentos aparecerão aqui conforme forem registrados."
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Status</th>
                      <th className="ta-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <strong>{payment.packageLabel || 'Cobrança avulsa'}</strong>
                        </td>
                        <td>{formatBRL(payment.amount)}</td>
                        <td>{formatDate(payment.dueDate)}</td>
                        <td>
                          {payment.status === 'paid' ? (
                            <Badge tone="success">Pago</Badge>
                          ) : (
                            <Badge tone="warning">Pendente</Badge>
                          )}
                        </td>
                        <td className="ta-right">
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="subtle"
                              onClick={() => openProof(payment.id)}
                            >
                              Enviar comprovante
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {section === 'documentos' && (
        <div className="split split-docs">
          <Card className="panel">
            <div className="panel-head">
              <div>
                <h2>Recebidos da psicóloga</h2>
                <p>Recibos e documentos para baixar.</p>
              </div>
            </div>
            <DocumentList
              documents={receivedDocuments}
              emptyTitle="Nenhum documento recebido"
              emptyText="Recibos e materiais enviados pela psicóloga aparecerão aqui."
            />
          </Card>

          <Card className="panel">
            <div className="panel-head">
              <div>
                <h2>Comprovantes enviados</h2>
                <p>Anexos que você enviou para o consultório.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openProof(null)}>
                <IconUpload width={16} height={16} /> Enviar
              </Button>
            </div>
            <DocumentList
              documents={sentProofs}
              emptyTitle="Nenhum comprovante enviado"
              emptyText="Depois de pagar via PIX, anexe o comprovante para a psicóloga conferir."
              onProof={() => openProof(null)}
            />
          </Card>
        </div>
      )}

      <ProofModal
        open={proofOpen}
        onClose={() => setProofOpen(false)}
        payments={data.payments}
        preselected={preselected}
        onSaved={load}
      />
    </div>
  );
}
