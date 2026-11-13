import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useBranding } from '../theme';
import { Button, Field } from '../components/ui.jsx';
import { IconClipboard, IconShield, IconSparkle, IconClock } from '../components/icons.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/' : '/minha-area'} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const logged = await login(email.trim(), password);
      navigate(logged.role === 'admin' ? '/' : '/minha-area', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-brand">
        <div className="login-mark">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.clinicName} />
          ) : (
            <IconClipboard width={30} height={30} />
          )}
        </div>
        <div className="login-brand-text">
          <span className="login-kicker">Gestão e atendimento psicológico</span>
          <h1>{branding.clinicName}</h1>
          <p className="login-tagline">
            Prontuários, pacotes de sessões e pagamentos em um só lugar — com o cuidado e o sigilo
            que o seu consultório merece.
          </p>
        </div>
        <ul className="login-features">
          <li>
            <IconShield />
            <span>Notas de evolução protegidas, visíveis só para você</span>
          </li>
          <li>
            <IconSparkle />
            <span>Pacotes, descontos Leve Saúde e cobranças automáticas</span>
          </li>
          <li>
            <IconClock />
            <span>O paciente acompanha PIX, comprovantes e recibos</span>
          </li>
        </ul>
        <p className="login-foot">Espaço do paciente com acesso próprio e seguro.</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Bem-vinda de volta</h2>
          <p className="login-sub">Entre para acompanhar seus pacientes e sua agenda financeira.</p>

          <form className="form" onSubmit={submit}>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@consultorio.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
            {error && <p className="form-error">{error}</p>}
            <Button type="submit" disabled={busy} className="btn-block">
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
