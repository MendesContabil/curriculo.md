import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { SharedDocumentModal } from '../components/documentModals.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Spinner,
  docKindMeta,
  formatDate,
  useToast,
} from '../components/ui.jsx';
import {
  IconDownload,
  IconFile,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../components/icons.jsx';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'certificate', label: 'Atestados' },
  { value: 'declaration', label: 'Declarações' },
  { value: 'support', label: 'Materiais' },
  { value: 'receipt', label: 'Recibos' },
];

export default function Documents() {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/api/shared-documents'), api.get('/api/patients')])
      .then(([docs, pats]) => {
        setDocuments(docs);
        setPatients(pats);
      })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesKind = filter === 'all' || doc.kind === filter;
      const matchesTerm =
        !term ||
        [doc.title, doc.fileName, doc.patientName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      return matchesKind && matchesTerm;
    });
  }, [documents, search, filter]);

  const remove = async (doc) => {
    if (!window.confirm(`Remover "${doc.title}" da área do paciente?`)) return;
    try {
      await api.del(`/api/shared-documents/${doc.id}`);
      await load();
      toast('Documento removido.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading && documents.length === 0) return <Spinner label="Carregando documentos" />;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Documentos compartilhados</p>
          <h1>Documentos</h1>
          <p className="page-sub">
            Atestados, declarações e PDFs de apoio que o paciente pode baixar na própria área.
          </p>
        </div>
        <div className="page-actions">
          <Button onClick={() => setModalOpen(true)}>
            <IconPlus width={18} height={18} /> Compartilhar documento
          </Button>
        </div>
      </header>

      <Card className="toolbar">
        <div className="search">
          <IconSearch width={18} height={18} />
          <input
            placeholder="Buscar por título, arquivo ou paciente"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="segmented">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? 'segmented-active' : ''}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <div className="panel-head">
          <div>
            <h2>Arquivos compartilhados</h2>
            <p>{filtered.length} documento(s) disponíveis para download.</p>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<IconFile />}
            title="Nenhum documento encontrado"
            description="Compartilhe atestados, declarações ou materiais de apoio com seus pacientes."
            action={<Button onClick={() => setModalOpen(true)}>Compartilhar documento</Button>}
          />
        ) : (
          <ul className="list">
            {filtered.map((doc) => {
              const meta = docKindMeta(doc.kind);
              return (
                <li key={doc.id} className="list-row">
                  <span className="file-icon">
                    <IconFile width={18} height={18} />
                  </span>
                  <div className="list-main">
                    <strong>{doc.title}</strong>
                    <span>
                      {doc.patientName} · {formatDate(doc.createdAt)} · {doc.fileName}
                    </span>
                  </div>
                  <div className="row-actions">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <a
                      className="icon-btn"
                      href={`/api/files/${doc.fileId}?download=1`}
                      aria-label={`Baixar ${doc.title}`}
                    >
                      <IconDownload width={17} height={17} />
                    </a>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => remove(doc)}
                      aria-label={`Remover ${doc.title}`}
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <SharedDocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        patients={patients}
        onSaved={load}
      />
    </div>
  );
}
