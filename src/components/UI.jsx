import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Inbox,
  LoaderCircle,
  Package,
  X,
} from 'lucide-react';
import { number, productImage, statusLabels } from '../api';

export function Brand() {
  return (
    <div className="brand">
      <img src="/figo.png" alt="" />
      <div>
        <span>
          figo<span className="brand-dot">.</span>
        </span>
        <small>Backoffice</small>
      </div>
    </div>
  );
}
export function Status({ value }) {
  return (
    <span className={`status status-${value}`}>
      <i />
      {statusLabels[value] || value}
    </span>
  );
}
export function ProductThumb({ product }) {
  const [failed, setFailed] = useState(false);
  const source = productImage(product);
  return (
    <span className="product-thumb">
      {source && !failed ? (
        <img src={source} alt="" onError={() => setFailed(true)} />
      ) : (
        <Package size={18} />
      )}
    </span>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={23} /> A carregar informação…
    </div>
  );
}
export function ErrorState({ message, retry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={24} />
      <h3>Não foi possível carregar os dados</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function Empty({
  title = 'Ainda não há resultados',
  text = 'Os registos aparecerão aqui quando estiverem disponíveis.',
}) {
  return (
    <div className="empty">
      <span>
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function PageHeader({ title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Pagination({ value, onChange }) {
  return (
    <div className="pagination">
      <span>
        {number(value.total)} resultados · Página {value.pages ? value.page : 0} de {value.pages}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Página anterior"
          disabled={value.page <= 1}
          onClick={() => onChange(value.page - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Página seguinte"
          disabled={value.page >= value.pages}
          onClick={() => onChange(value.page + 1)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function defaultRange(days = 30) {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
export function DateRange({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const format = (value) =>
    new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return (
    <>
      <button
        className="date-trigger"
        onClick={() => {
          setDraft(value);
          setError('');
          setOpen(true);
        }}
      >
        <CalendarDays size={18} />
        <span>
          {format(value.from)} — {format(value.to)}
        </span>
      </button>
      {open && (
        <Modal title="Selecionar período" onClose={() => setOpen(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const days = (new Date(draft.to) - new Date(draft.from)) / 86400000 + 1;
              if (!Number.isFinite(days) || days < 1 || days > 366)
                return setError('Seleciona um período entre 1 e 366 dias.');
              onChange(draft);
              setOpen(false);
            }}
          >
            <div className="quick-ranges">
              {[7, 30, 90].map((days) => (
                <button
                  type="button"
                  className="button secondary"
                  key={days}
                  onClick={() => setDraft(defaultRange(days))}
                >
                  Últimos {days} dias
                </button>
              ))}
            </div>
            <div className="form-grid">
              <label>
                De
                <input
                  type="date"
                  required
                  value={draft.from}
                  onChange={(event) => setDraft({ ...draft, from: event.target.value })}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  required
                  value={draft.to}
                  onChange={(event) => setDraft({ ...draft, to: event.target.value })}
                />
              </label>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button className="button primary">Aplicar período</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
