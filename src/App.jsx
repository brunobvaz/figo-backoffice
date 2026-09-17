import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { api, initials } from './api';
import { Brand, ErrorState, Loading } from './components/UI';
const Dashboard = lazy(() => import('./pages/Dashboard'));
import Records from './pages/Records';
import Categories from './pages/Categories';
import Login from './pages/Login';

const navigation = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/anuncios', label: 'Anúncios', icon: Package },
  { path: '/utilizadores', label: 'Utilizadores', icon: Users },
  { path: '/categorias', label: 'Categorias', icon: Tag },
  { path: '/transacoes', label: 'Transações', icon: CreditCard },
  { path: '/relatorios', label: 'Relatórios', icon: ChartNoAxesCombined },
];
export default function App() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api('/auth/me', { signal: controller.signal })
      .then((data) => setAdmin(data.admin))
      .catch((error) => {
        if (error.name !== 'AbortError' && error.status !== 401) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const expire = () => {
      setAdmin(null);
      setExpired(true);
    };
    window.addEventListener('figo:session-expired', expire);
    return () => window.removeEventListener('figo:session-expired', expire);
  }, []);
  if (loading)
    return (
      <div className="boot">
        <Brand />
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="boot">
        <Brand />
        <ErrorState message={error} retry={() => setRevision((value) => value + 1)} />
      </div>
    );
  if (!admin)
    return (
      <Login
        expired={expired}
        onLogin={(value) => {
          setAdmin(value);
          setExpired(false);
        }}
      />
    );
  return <Layout admin={admin} onLogout={() => setAdmin(null)} />;
}

function Layout({ admin, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('anuncios');
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setMobileOpen(false);
    document.title = `${navigation.find((item) => item.path === location.pathname)?.label || 'Backoffice'} · Figo`;
  }, [location.pathname]);
  async function logout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await api('/auth/logout', { method: 'POST' });
      onLogout();
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <span className="nav-caption">PLATAFORMA</span>
        <nav aria-label="Menu principal">
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={21} />
              <span>{label}</span>
              {path === '/anuncios' && <ChevronDown className="nav-chevron" size={15} />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="community-card">
            <span className="community-icon">
              <Leaf size={24} />
            </span>
            <strong>
              O que é local,
              <br />é especial.
            </strong>
            <p>Uma comunidade mais próxima e sustentável.</p>
            <span className="community-sign">
              A crescer juntos <ArrowUpRight size={13} />
            </span>
          </div>
          {logoutError && (
            <p className="form-error" role="alert">
              {logoutError}
            </p>
          )}
          <button className="nav-item logout" disabled={loggingOut} onClick={logout}>
            <LogOut size={21} />
            <span>{loggingOut ? 'A sair…' : 'Sair'}</span>
          </button>
          <span className="sidebar-version">
            FIGO BACKOFFICE <span>v1.0</span>
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <form
            className="global-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/${scope}?search=${encodeURIComponent(search.trim())}`);
            }}
          >
            <Search size={18} />
            <input
              aria-label="Pesquisar na plataforma"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar na plataforma…"
            />
            <select
              aria-label="Onde pesquisar"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="anuncios">Anúncios</option>
              <option value="utilizadores">Utilizadores</option>
              <option value="transacoes">Transações</option>
            </select>
            <button className="search-submit" aria-label="Pesquisar">
              <ArrowUpRight size={17} />
            </button>
          </form>
          <div className="topbar-account">
            <span className="secure-label">
              <ShieldCheck size={16} /> Acesso reservado
            </span>
            <span className="topbar-divider" />
            <details className="account-menu">
              <summary>
                <span className="avatar admin-avatar">{initials(admin.name)}</span>
                <span className="account-name">
                  {admin.name}
                  <small>Administrador</small>
                </span>
                <ChevronDown size={15} />
              </summary>
              <div className="account-popover">
                <strong>{admin.name}</strong>
                <p>{admin.email}</p>
                <button disabled={loggingOut} onClick={logout}>
                  <LogOut size={16} />
                  Terminar sessão
                </button>
              </div>
            </details>
          </div>
        </header>
        <main id="main-content">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/anuncios" element={<Records kind="products" />} />
              <Route path="/utilizadores" element={<Records kind="users" />} />
              <Route path="/categorias" element={<Categories />} />
              <Route path="/transacoes" element={<Records kind="transactions" />} />
              <Route path="/relatorios" element={<Dashboard report />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <footer className="page-footer">
            <span>Figo · De perto, para todos.</span>
            <span>Backoffice da comunidade</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
