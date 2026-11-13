import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { PatientFormModal } from '../components/modals.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Spinner,
  formatBRL,
  originLabel,
  useToast,
} from '../components/ui.jsx';
import { IconPlus, IconSearch, IconUsers, IconChevronRight } from '../components/icons.jsx';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'particular', label: 'Particular' },
  { value: 'leve_saude', label: 'Leve Saúde' },
];

export default function Patients() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/api/patients')
      .then(setPatients)
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      setEditing(null);
      setModalOpen(true);
    }
  }, [searchParams]);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    if (searchParams.get('novo')) {
      searchParams.delete('novo');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients.filter((p) => {
      const matchesFilter = filter === 'all' || p.origin === filter;
      const matchesTerm =
        !term ||
        [p.fullName, p.email, p.phone].filter(Boolean).some((v) => v.toLowerCase().includes(term));
      return matchesFilter && matchesTerm;
    });
  }, [patients, search, filter]);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Gestão de pacientes</p>
          <h1>Pacientes</h1>
          <p className="page-sub">
            {patients.length} cadastro{patients.length === 1 ? '' : 's'} · prontuários e pacotes
            vinculados.
          </p>
        </div>
        <div className="page-actions">
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <IconPlus width={18} height={18} /> Novo paciente
          </Button>
        </div>
      </header>

      <Card className="toolbar">
        <div className="search">
          <IconSearch width={18} height={18} />
          <input
            placeholder="Buscar por nome, e-mail ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="segmented">
          {FILTERS.map((f) => (
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
      </Card>

      {loading ? (
        <Spinner label="Carregando pacientes" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconUsers />}
            title={patients.length ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            description={
              patients.length
                ? 'Ajuste a busca ou o filtro de origem para encontrar o paciente.'
                : 'Cadastre o primeiro paciente para começar o acompanhamento.'
            }
            action={
              <Button onClick={() => setModalOpen(true)}>
                <IconPlus width={18} height={18} /> Novo paciente
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="patient-grid">
          {filtered.map((patient) => (
            <Link key={patient.id} to={`/pacientes/${patient.id}`} className="patient-card">
              <div className="patient-card-head">
                <Avatar name={patient.fullName} />
                <div>
                  <strong>{patient.fullName}</strong>
                  <span>{patient.age ? `${patient.age} anos` : 'Idade não informada'}</span>
                </div>
                <Badge tone={patient.origin === 'leve_saude' ? 'teal' : 'neutral'}>
                  {originLabel(patient.origin)}
                </Badge>
              </div>
              <div className="patient-card-meta">
                <span>{patient.phone || 'Sem telefone'}</span>
                <span>{patient.email || 'Sem e-mail'}</span>
              </div>
              <div className="patient-card-foot">
                <div>
                  <span className="meta-label">Pacotes ativos</span>
                  <strong>{patient.activePackages ?? 0}</strong>
                </div>
                <div>
                  <span className="meta-label">A receber</span>
                  <strong>{formatBRL(patient.pendingAmount ?? 0)}</strong>
                </div>
                <span className="patient-open">
                  Abrir <IconChevronRight width={16} height={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <PatientFormModal
        open={modalOpen}
        onClose={closeModal}
        patient={editing}
        onSaved={() => load()}
      />
    </div>
  );
}
