import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Finance from './pages/Finance.jsx';
import Settings from './pages/Settings.jsx';
import PatientArea from './pages/PatientArea.jsx';
import Schedule from './pages/Schedule.jsx';
import Documents from './pages/Documents.jsx';
import Chat from './pages/Chat.jsx';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="boot">
        <span className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/' : '/minha-area'} replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected roles={['admin']}>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/pacientes"
          element={
            <Protected roles={['admin']}>
              <Patients />
            </Protected>
          }
        />
        <Route
          path="/pacientes/:id"
          element={
            <Protected roles={['admin']}>
              <PatientDetail />
            </Protected>
          }
        />
        <Route
          path="/agenda"
          element={
            <Protected roles={['admin']}>
              <Schedule />
            </Protected>
          }
        />
        <Route
          path="/financeiro"
          element={
            <Protected roles={['admin']}>
              <Finance />
            </Protected>
          }
        />
        <Route
          path="/documentos"
          element={
            <Protected roles={['admin']}>
              <Documents />
            </Protected>
          }
        />
        <Route
          path="/chat"
          element={
            <Protected roles={['admin']}>
              <Chat />
            </Protected>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <Protected roles={['admin']}>
              <Settings />
            </Protected>
          }
        />
        <Route
          path="/minha-area"
          element={
            <Protected roles={['patient']}>
              <PatientArea section="resumo" />
            </Protected>
          }
        />
        <Route
          path="/minha-area/pagamentos"
          element={
            <Protected roles={['patient']}>
              <PatientArea section="pagamentos" />
            </Protected>
          }
        />
        <Route
          path="/minha-area/agenda"
          element={
            <Protected roles={['patient']}>
              <PatientArea section="agenda" />
            </Protected>
          }
        />
        <Route
          path="/minha-area/documentos"
          element={
            <Protected roles={['patient']}>
              <PatientArea section="documentos" />
            </Protected>
          }
        />
        <Route
          path="/minha-area/chat"
          element={
            <Protected roles={['patient']}>
              <Chat />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
