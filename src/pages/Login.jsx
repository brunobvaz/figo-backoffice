import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { Brand } from '../components/UI';

export default function Login({ onLogin, expired }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      onLogin(data.admin);
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-content">
          <span className="eyebrow">
            <Leaf size={16} /> DE PERTO, PARA TODOS
          </span>
          <h1>
            Uma comunidade
            <br />
            que dá <em>frutos.</em>
          </h1>
          <p>
            O cuidado com a nossa comunidade começa aqui. Tudo o que precisas para fazer a Figo
            crescer.
          </p>
          <div className="login-art">
            <img src="/figo.png" alt="Mascote Figo" />
            <span className="art-tag">
              <Leaf size={16} /> Local. Fresco. Próximo.
            </span>
          </div>
        </div>
        <span className="login-copyright">Figo · Uma comunidade mais local e sustentável.</span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <div className="login-lock">
            <LockKeyhole size={25} />
          </div>
          <span className="eyebrow">FIGO BACKOFFICE</span>
          <h2>Bem-vindo de volta.</h2>
          <p>Entra na tua área de administração.</p>
          {expired && <div className="notice">A tua sessão expirou. Inicia sessão novamente.</div>}
          <form onSubmit={submit}>
            <label>
              Email de administrador
              <input
                type="email"
                autoComplete="username"
                placeholder="nome@figo.pt"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Palavra-passe
              <span className="password-field">
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="A tua palavra-passe"
                  required
                  maxLength={256}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  aria-label={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  onClick={() => setVisible((value) => !value)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary login-submit" disabled={pending}>
              {pending ? 'A iniciar sessão…' : 'Entrar no backoffice'}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-security">
            <ShieldCheck size={17} />
            <span>Acesso exclusivo a administradores autorizados.</span>
          </div>
        </div>
        <p className="login-support">Precisas de acesso? Contacta o responsável pela plataforma.</p>
      </section>
    </div>
  );
}
