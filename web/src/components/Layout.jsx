import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useBranding } from '../theme.jsx';
import { Avatar } from './ui.jsx';
import {
  IconHome,
  IconUsers,
  IconWallet,
  IconPalette,
  IconLogout,
  IconMenu,
  IconFile,
  IconX,
  IconCard,
  IconClipboard,
} from './icons.jsx';

const ADMIN_NAV = [
  { to: '/', label: 'Painel', icon: IconHome, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: IconUsers },
  { to: '/financeiro', label: 'Financeiro', icon: IconWallet },
  { to: '/configuracoes', label: 'Aparência', icon: IconPalette },
];

const PATIENT_NAV = [
  { to: '/minha-area', label: 'Minha área', icon: IconHome, end: true },
  { to: '/minha-area/pagamentos', label: 'Pagamentos', icon: IconCard },
  { to: '/minha-area/documentos', label: 'Documentos', icon: IconFile },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const nav = isAdmin ? ADMIN_NAV : PATIENT_NAV;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.clinicName} />
            ) : (
              <IconClipboard />
            )}
          </span>
          <div className="brand-text">
            <strong>{branding.clinicName}</strong>
            <span>{isAdmin ? 'Área da psicóloga' : 'Área do paciente'}</span>
          </div>
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <IconX />
          </button>
        </div>

        <nav className="nav">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-card-title">
            {isAdmin ? 'Prontuário protegido' : 'Seu espaço é sigiloso'}
          </p>
          <p>
            {isAdmin
              ? 'Notas de evolução ficam visíveis apenas para você.'
              : 'As anotações clínicas são de uso exclusivo da psicóloga.'}
          </p>
        </div>

        <div className="sidebar-user">
          <Avatar name={user?.name} size="sm" />
          <div className="sidebar-user-text">
            <strong>{user?.name}</strong>
            <span>{isAdmin ? 'Psicóloga • Admin' : 'Paciente'}</span>
          </div>
          <button className="icon-btn" onClick={handleLogout} aria-label="Sair" title="Sair">
            <IconLogout />
          </button>
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <IconMenu />
          </button>
          <div className="topbar-brand">
            {branding.logoUrl && <img src={branding.logoUrl} alt="" />}
            <strong>{branding.clinicName}</strong>
          </div>
          <Avatar name={user?.name} size="xs" />
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
