import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { PackageModal, PatientFormModal, PaymentModal } from '../components/modals.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Progress,
  Spinner,
  formatBRL,
  formatDate,
  formatDateTime,
  originLabel,
  todayISO,
  docKindMeta,
  useToast,
} from '../components/ui.jsx';
import {
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconDownload,
  IconFile,
  IconPlus,
  IconTrash,
  IconWallet,
} from '../components/icons.jsx';

const TABS = [
  { key: 'prontuario', label: 'Prontuário', icon: IconClipboard },
  { key: 'pacotes', label: 'Pacotes', icon: IconCalendar },
  { key: 'pagamentos', label: 'Pagamentos', icon: IconWallet },
  { key: 'documentos', label: 'Documentos', icon: IconFile },
];

const emptyNote = { date: todayISO(), content: '' };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [patient, setPatient] = useState(null);
  const [notes, setNotes] = useState([]);
  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('prontuario');

  const [editOpen, setEditOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [savingNote, setSavingNote] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', kind: 'document', file: null });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadNotes = () => api.get(`/api/patients/${id}/notes`).then(setNotes);
  const loadPackages = () => api.get(`/api/patients/${id}/packages`).then(setPackages);
  const loadPayments = () => api.get(`/api/patients/${id}/payments`).then(setPayments);
  const loadDocuments = () => api.get(`/api/patients/${id}/documents`).then(setDocuments);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get(`/api/patients/${id}`),
      api.get(`/api/patients/${id}/notes`),
      api.get(`/api/patients/${id}/packages`),
      api.get(`/api/patients/${id}/payments`),
      api.get(`/api/patients/${id}/documents`),
      api.get('/api/settings'),
    ])
      .then(([pat, noteList, pkgList, payList, docList, set]) => {
        if (!active) return;
        setPatient(pat);
        setNotes(noteList);
        setPackages(pkgList);
        setPayments(payList);
        setDocuments(docList);
        setSettings(set);
      })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, toast]);

  const addNote = async (event) => {
    event.preventDefault();
    if (!noteForm.content.trim()) {
      toast('Escreva a anotação da evolução.', 'error');
      return;
    }
    setSavingNote(true);
    try {
      await api.post(`/api/patients/${id}/notes`, noteForm);
      setNoteForm(emptyNote);
      await loadNotes();
      toast('Nota de evolução registrada.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm('Excluir esta nota de evolução? A ação não pode ser desfeita.')) return;
    try {
      await api.del(`/api/patients/${id}/notes/${noteId}`);
      await loadNotes();
      toast('Nota removida.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const useSession = async (pkg) => {
    try {
      await api.patch(`/api/packages/${pkg.id}`, { action: 'use_session' });
      await loadPackages();
      toast('Sessão registrada no pacote.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deletePackage = async (pkg) => {
    if (!window.confirm(`Excluir "${pkg.label}"? A cobrança vinculada também será removida.`)) return;
    try {
      await api.del(`/api/packages/${pkg.id}`);
      await loadPackages();
      await loadPayments();
      toast('Pacote removido.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const togglePayment = async (payment) => {
    try {
      const next = payment.status === 'paid' ? 'pending' : 'paid';
      await api.patch(`/api/payments/${payment.id}`, { status: next });
      await loadPayments();
      toast(next === 'paid' ? 'Pagamento marcado como pago.' : 'Pagamento reaberto como pendente.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!docForm.file) {
      toast('Selecione o arquivo que deseja enviar ao paciente.', 'error');
      return;
    }
    setUploadingDoc(true);
    try {
      const data = new FormData();
      data.append('file', docForm.file);
      data.append('kind', docForm.kind);
      data.append('title', docForm.title || docForm.file.name);
      await api.upload(`/api/patients/${id}/documents`, data);
      setDocForm({ title: '', kind: 'document', file: null });
      await loadDocuments();
      toast('Documento enviado ao paciente.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Remover este documento do prontuário?')) return;
    try {
      await api.del(`/api/patients/${id}/documents/${docId}`);
      await loadDocuments();
      toast('Documento removido.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deletePatient = async () => {
    if (
      !window.confirm(
        `Excluir ${patient.fullName}? Notas, pacotes, cobranças e documentos serão apagados.`
      )
    )
      return;
    try {
      await api.del(`/api/patients/${patient.id}`);
      navigate('/pacientes', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <Spinner label="Abrindo prontuário" />;
  if (!patient) {
    return (
      <Card>
        <EmptyState
          title="Paciente não encontrado"
          description="O cadastro pode ter sido removido."
          action={<Link className="btn btn-primary" to="/pacientes">Voltar para pacientes</Link>}
        />
      </Card>
    );
  }

  const activePackages = packages.filter((p) => p.sessionsUsed < p.sessionsTotal);

  return (
    <div className="stack">
      <Link to="/pacientes" className="back-link">
        <IconArrowLeft width={18} height={18} /> Pacientes
      </Link>

      <Card className="profile-card">
        <div className="profile-main">
          <Avatar name={patient.fullName} size="lg" />
          <div className="profile-text">
            <div className="profile-title">
              <h1>{patient.fullName}</h1>
              <Badge tone={patient.origin === 'leve_saude' ? 'teal' : 'neutral'}>
                {originLabel(patient.origin)}
              </Badge>
            </div>
            <p className="profile-contact">
              {patient.age ? `${patient.age} anos` : 'Idade não informada'}
              {patient.phone ? ` · ${patient.phone}` : ''}
              {patient.email ? ` · ${patient.email}` : ''}
            </p>
            <p className="profile-hint">
              {patient.hasAccount
                ? 'O paciente possui acesso à própria área.'
                : 'Cadastre um e-mail para liberar o acesso do paciente.'}
            </p>
          </div>
        </div>
        <div className="profile-actions">
          <Button variant="ghost" onClick={() => setEditOpen(true)}>
            Editar dados
          </Button>
          <Button variant="danger-ghost" onClick={deletePatient}>
            <IconTrash width={17} height={17} /> Excluir
          </Button>
        </div>
      </Card>

      <div className="tabs" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`tab ${tab === key ? 'tab-active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon width={18} height={18} /> {label}
            {key === 'prontuario' && notes.length > 0 && (
              <span className="tab-count">{notes.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'prontuario' && (
        <div className="stack">
          <Card className="note-composer">
            <div className="note-composer-head">
              <div>
                <h2>
                  <IconClipboard width={18} height={18} /> Bloco de notas de evolução
                </h2>
                <p>Registro clínico visível apenas para a psicóloga.</p>
              </div>
              <Badge tone="locked">Sigiloso</Badge>
            </div>
            <form className="form" onSubmit={addNote}>
              <Field label="Data da sessão">
                <input
                  type="date"
                  value={noteForm.date}
                  onChange={(e) => setNoteForm((f) => ({ ...f, date: e.target.value }))}
                />
              </Field>
              <Field label="Evolução">
                <textarea
                  rows={4}
                  value={noteForm.content}
                  onChange={(e) => setNoteForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Descreva o desenvolvimento clínico, hipóteses e condutas da sessão…"
                />
              </Field>
              <div className="form-actions">
                <Button type="submit" disabled={savingNote}>
                  {savingNote ? 'Salvando…' : 'Adicionar nota'}
                </Button>
              </div>
            </form>
          </Card>

          {notes.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconClipboard />}
                title="Nenhuma nota registrada"
                description="A primeira anotação de evolução aparecerá aqui, em ordem cronológica."
              />
            </Card>
          ) : (
            <ol className="timeline">
              {notes.map((note) => (
                <li key={note.id} className="timeline-item">
                  <span className="timeline-dot" />
                  <article className="note">
                    <header>
                      <span className="note-date">
                        <IconCalendar width={16} height={16} /> {formatDate(note.date)}
                      </span>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={() => deleteNote(note.id)}
                        aria-label="Excluir nota"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </header>
                    <p>{note.content}</p>
                    <footer>Criada em {formatDateTime(note.createdAt)}</footer>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {tab === 'pacotes' && (
        <div className="stack">
          <div className="section-bar">
            <div>
              <h2>Pacotes de sessões</h2>
              <p>{activePackages.length} em andamento de {packages.length} registrados.</p>
            </div>
            <Button onClick={() => setPackageOpen(true)}>
              <IconPlus width={18} height={18} /> Novo pacote
            </Button>
          </div>

          {packages.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconCalendar />}
                title="Nenhum pacote registrado"
                description="Registre sessões avulsas, pacotes de 2 ou 4 sessões, ou um formato personalizado."
                action={<Button onClick={() => setPackageOpen(true)}>Registrar pacote</Button>}
              />
            </Card>
          ) : (
            <div className="package-grid">
              {packages.map((pkg) => {
                const done = pkg.sessionsUsed >= pkg.sessionsTotal;
                return (
                  <Card key={pkg.id} className="package-card">
                    <div className="package-head">
                      <div>
                        <h3>{pkg.label}</h3>
                        <span className="muted">
                          {pkg.sessionsUsed} de {pkg.sessionsTotal} sessões usadas
                        </span>
                      </div>
                      <Badge tone={done ? 'neutral' : 'success'}>
                        {done ? 'Concluído' : 'Ativo'}
                      </Badge>
                    </div>
                    <Progress value={pkg.sessionsUsed} max={pkg.sessionsTotal} />
                    <div className="package-values">
                      <div>
                        <span>Valor cheio</span>
                        <strong>{formatBRL(pkg.baseValue)}</strong>
                      </div>
                      <div>
                        <span>Desconto</span>
                        <strong>{pkg.discountPercent ? `${pkg.discountPercent}%` : '—'}</strong>
                      </div>
                      <div>
                        <span>Total</span>
                        <strong>{formatBRL(pkg.finalValue)}</strong>
                      </div>
                    </div>
                    <div className="package-actions">
                      <Button
                        variant="subtle"
                        size="sm"
                        disabled={done}
                        onClick={() => useSession(pkg)}
                      >
                        <IconCheck width={16} height={16} /> Registrar sessão
                      </Button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={() => deletePackage(pkg)}
                        aria-label="Excluir pacote"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'pagamentos' && (
        <div className="stack">
          <div className="section-bar">
            <div>
              <h2>Pagamentos do paciente</h2>
              <p>Cobranças geradas pelos pacotes e valores avulsos.</p>
            </div>
            <Button variant="ghost" onClick={() => setPaymentOpen(true)}>
              <IconPlus width={18} height={18} /> Nova cobrança
            </Button>
          </div>

          {payments.length === 0 ? (
            <Card>
              <EmptyState
                icon={<IconWallet />}
                title="Sem cobranças"
                description="Ao registrar um pacote, a cobrança é criada automaticamente."
              />
            </Card>
          ) : (
            <Card className="panel">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th>Valor</th>
                      <th>Vencimento</th>
                      <th>Forma</th>
                      <th>Status</th>
                      <th className="ta-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <strong>{payment.packageLabel || 'Cobrança avulsa'}</strong>
                        </td>
                        <td>{formatBRL(payment.amount)}</td>
                        <td>{formatDate(payment.dueDate)}</td>
                        <td className="muted">{payment.method || '—'}</td>
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
            </Card>
          )}
        </div>
      )}

      {tab === 'documentos' && (
        <div className="stack">
          <div className="split split-docs">
            <Card className="panel">
              <div className="panel-head">
                <div>
                  <h2>Enviar documento</h2>
                  <p>Recibos e materiais ficam disponíveis na área do paciente.</p>
                </div>
              </div>
              <form className="form" onSubmit={uploadDocument}>
                <Field label="Título">
                  <input
                    value={docForm.title}
                    onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ex.: Recibo de novembro"
                  />
                </Field>
                <div className="form-row">
                  <Field label="Tipo">
                    <select
                      value={docForm.kind}
                      onChange={(e) => setDocForm((f) => ({ ...f, kind: e.target.value }))}
                    >
                      <option value="document">Documento</option>
                      <option value="receipt">Recibo</option>
                      <option value="certificate">Atestado</option>
                      <option value="declaration">Declaração</option>
                      <option value="support">Material de apoio</option>
                    </select>
                  </Field>
                  <Field label="Arquivo">
                    <input
                      type="file"
                      accept="image/*,.pdf,.txt,.doc,.docx"
                      onChange={(e) =>
                        setDocForm((f) => ({ ...f, file: e.target.files?.[0] || null }))
                      }
                    />
                  </Field>
                </div>
                <div className="form-actions">
                  <Button type="submit" disabled={uploadingDoc}>
                    {uploadingDoc ? 'Enviando…' : 'Enviar ao paciente'}
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="panel">
              <div className="panel-head">
                <div>
                  <h2>Documentos</h2>
                  <p>{documents.length} arquivo(s) no prontuário.</p>
                </div>
              </div>
              {documents.length === 0 ? (
                <EmptyState
                  icon={<IconFile />}
                  title="Nenhum documento"
                  description="Envie recibos ou documentos para o paciente baixar."
                />
              ) : (
                <ul className="list">
                  {documents.map((doc) => (
                    <li key={doc.id} className="list-row">
                      <span className="file-icon">
                        <IconFile width={18} height={18} />
                      </span>
                      <div className="list-main">
                        <strong>{doc.title}</strong>
                        <span>
                          {formatDate(doc.createdAt)} ·{' '}
                          {doc.direction === 'from_patient'
                            ? 'Comprovante do paciente'
                            : `${docKindMeta(doc.kind).label} enviado`}
                        </span>
                      </div>
                      <div className="row-actions">
                        <a
                          className="icon-btn"
                          href={`/api/files/${doc.fileId}?download=1`}
                          aria-label="Baixar documento"
                        >
                          <IconDownload width={17} height={17} />
                        </a>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger"
                          onClick={() => deleteDocument(doc.id)}
                          aria-label="Remover documento"
                        >
                          <IconTrash width={16} height={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      <PatientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patient={patient}
        onSaved={(saved) => setPatient((p) => ({ ...p, ...saved }))}
      />
      <PackageModal
        open={packageOpen}
        onClose={() => setPackageOpen(false)}
        fixedPatient={patient}
        defaultDiscount={settings?.leveSaudeDiscount ?? 0}
        onSaved={() => {
          loadPackages();
          loadPayments();
        }}
      />
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        patientId={patient.id}
        onSaved={loadPayments}
      />
    </div>
  );
}
