import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  MoreHorizontal,
  Search,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import {
  api,
  categories,
  date,
  initials,
  money,
  productStatus,
  queryString,
  statusLabels,
  usageLabel,
  useResource,
} from '../api';
import {
  Empty,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  ProductThumb,
  Status,
} from '../components/UI';

const configs = {
  products: {
    title: 'Anúncios',
    description: 'Acompanha e gere os produtos da comunidade.',
    search: 'Pesquisar produto ou localidade…',
    statuses: ['active', 'inactive', 'sold', 'deleted'],
  },
  users: {
    title: 'Utilizadores',
    description: 'Conhece e cuida de quem faz parte da Figo.',
    search: 'Pesquisar nome ou email…',
    statuses: ['active', 'suspended', 'deactivated', 'deletion_pending', 'deleted'],
  },
  transactions: {
    title: 'Transações',
    description: 'Acompanha os acordos entre compradores e vendedores.',
    search: 'Pesquisar produto…',
    statuses: [
      'pending',
      'accepted',
      'buyer_confirmed',
      'seller_confirmed',
      'completed',
      'reviewed',
      'declined',
      'cancelled',
    ],
  },
};
export default function Records({ kind }) {
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState(params.get('search') || '');
  const config = configs[kind];
  const status = params.get('status') || '';
  const category = params.get('category') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  useEffect(() => {
    setSearch(params.get('search') || '');
    setSelected(null);
  }, [params, kind]);
  const path = `/${kind}?${queryString({ search: params.get('search') || '', status, category: kind === 'products' ? category : '', page })}`;
  const { data, loading, error, reload } = useResource(path);
  function filter(changes) {
    const next = new URLSearchParams(params);
    next.delete('page');
    for (const [key, value] of Object.entries(changes))
      value ? next.set(key, String(value)) : next.delete(key);
    setParams(next);
  }
  return (
    <>
      <PageHeader title={config.title} description={config.description}>
        <span className="page-badge">
          <span className="live-dot" />
          Comunidade Figo
        </span>
      </PageHeader>
      <section className="panel records-panel">
        <div className="records-toolbar">
          <form
            className="list-search"
            onSubmit={(event) => {
              event.preventDefault();
              filter({ search: search.trim() });
            }}
          >
            <Search size={17} />
            <input
              aria-label={config.search}
              placeholder={config.search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" className="icon-button" aria-label="Aplicar pesquisa">
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="record-filters">
            {kind === 'products' && (
              <select
                aria-label="Filtrar por categoria"
                value={category}
                onChange={(event) => filter({ category: event.target.value })}
              >
                <option value="">Todas as categorias</option>
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            )}
            <div className="filter-select">
              <SlidersHorizontal size={15} />
              <select
                aria-label="Filtrar por estado"
                value={status}
                onChange={(event) => filter({ status: event.target.value })}
              >
                <option value="">Todos os estados</option>
                {config.statuses.map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            {(params.get('search') || status || category) && (
              <button className="text-link" onClick={() => setParams({})}>
                Limpar
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={reload} />
        ) : (
          <>
            {data.items.length ? (
              <div className="table-scroll">
                <table className="records-table">
                  <thead>
                    {kind === 'products' ? (
                      <tr>
                        <th>Produto</th>
                        <th>Vendedor</th>
                        <th>Categoria</th>
                        <th>Preço</th>
                        <th>Estado</th>
                        <th>Publicado</th>
                        <th>
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    ) : kind === 'users' ? (
                      <tr>
                        <th>Utilizador</th>
                        <th>Localidade</th>
                        <th>Interesse inicial</th>
                        <th>Registo</th>
                        <th>Estado</th>
                        <th>
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Produto</th>
                        <th>Comprador</th>
                        <th>Vendedor</th>
                        <th>Valor acordado</th>
                        <th>Estado</th>
                        <th>Data</th>
                        <th>
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {data.items.map((item, index) => (
                      <tr key={item.id}>
                        {kind === 'products' ? (
                          <>
                            <td>
                              <button className="product-cell" onClick={() => setSelected(item)}>
                                <ProductThumb product={item} />
                                <span>
                                  {item.title}
                                  <small>{item.location}</small>
                                </span>
                              </button>
                            </td>
                            <td>{item.seller?.name || 'Conta indisponível'}</td>
                            <td>{item.category}</td>
                            <td className="amount">
                              {money(item.price)}
                              <small>{item.unit.replace('€/', '/')}</small>
                            </td>
                            <td>
                              <Status value={productStatus(item)} />
                              {item.featured === true && (
                                <small className="featured-mark">★ Em destaque</small>
                              )}
                            </td>
                            <td>{date(item.createdAt)}</td>
                          </>
                        ) : kind === 'users' ? (
                          <>
                            <td>
                              <button className="user-cell" onClick={() => setSelected(item)}>
                                <span className={`avatar avatar-${index % 4}`}>
                                  {initials(item.name)}
                                </span>
                                <span>
                                  {item.name}
                                  <small>{item.email}</small>
                                </span>
                              </button>
                            </td>
                            <td>{item.location?.municipality || item.location?.city || '—'}</td>
                            <td>{usageLabel(item.usageIntent)}</td>
                            <td>{date(item.createdAt)}</td>
                            <td>
                              <Status value={item.status} />
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <button className="cell-link" onClick={() => setSelected(item)}>
                                {item.productTitle}
                                <small>
                                  {item.quantity} × {money(item.unitPriceSnapshot)}
                                </small>
                              </button>
                            </td>
                            <td>{item.buyer?.name || 'Conta indisponível'}</td>
                            <td>{item.seller?.name || 'Conta indisponível'}</td>
                            <td className="amount">{money(item.totalPriceSnapshot)}</td>
                            <td>
                              <Status value={item.status} />
                            </td>
                            <td>{date(item.createdAt)}</td>
                          </>
                        )}
                        <td>
                          <button
                            className="row-action"
                            aria-label={`Ver detalhes de ${item.title || item.name || item.productTitle}`}
                            onClick={() => setSelected(item)}
                          >
                            <MoreHorizontal size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Nenhum resultado encontrado"
                text="Experimenta alterar a pesquisa ou os filtros selecionados."
              />
            )}
            <Pagination value={data.pagination} onChange={(page) => filter({ page })} />
          </>
        )}
      </section>
      {kind === 'transactions' && (
        <p className="section-note">
          Os valores representam os acordos registados na app. A Figo não confirma pagamentos neste
          ecrã.
        </p>
      )}
      {selected && (
        <RecordDialog
          kind={kind}
          item={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}

export function RecordDialog({ kind, item, onClose, onSaved }) {
  if (kind === 'products') return <ProductDialog item={item} onClose={onClose} onSaved={onSaved} />;
  if (kind === 'users') return <UserDialog item={item} onClose={onClose} onSaved={onSaved} />;
  return (
    <Modal title="Detalhes da transação" onClose={onClose}>
      <div className="detail-hero">
        <span className="detail-icon">
          <ArrowRight size={25} />
        </span>
        <div>
          <h3>{item.productTitle}</h3>
          <Status value={item.status} />
        </div>
      </div>
      <dl className="detail-list">
        <dt>Comprador</dt>
        <dd>{item.buyer?.name || 'Conta indisponível'}</dd>
        <dt>Vendedor</dt>
        <dd>{item.seller?.name || 'Conta indisponível'}</dd>
        <dt>Quantidade</dt>
        <dd>{item.quantity}</dd>
        <dt>Preço acordado</dt>
        <dd>
          {money(item.unitPriceSnapshot)} {item.unit.replace('€/', '/')}
        </dd>
        <dt>Total acordado</dt>
        <dd>
          <strong>{money(item.totalPriceSnapshot)}</strong>
        </dd>
        <dt>Registada em</dt>
        <dd>{date(item.createdAt)}</dd>
        <dt>Concluída em</dt>
        <dd>{date(item.completedAt)}</dd>
      </dl>
      <p className="notice">O estado resulta das confirmações dos participantes na aplicação.</p>
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
function ProductDialog({ item, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    title: item.title,
    description: item.description,
    category: item.category,
    price: item.price,
    unit: item.unit,
    is_active: item.is_active !== false,
    featured: item.featured === true,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const editable = item.status !== 'deleted';
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  async function save(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const original = {
        title: item.title,
        description: item.description,
        category: item.category,
        price: item.price,
        unit: item.unit,
        is_active: item.is_active !== false,
        featured: item.featured === true,
      };
      const changes = Object.fromEntries(
        Object.entries({ ...draft, price: Number(draft.price) }).filter(
          ([key, value]) => original[key] !== value
        )
      );
      if (Object.keys(changes).length)
        await api(`/products/${item.id}`, { method: 'PATCH', body: changes });
      onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      title="Detalhes do anúncio"
      wide
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <div className="detail-hero">
        <ProductThumb product={item} />
        <div>
          <h3>{item.title}</h3>
          <p>
            {item.seller?.name || 'Conta indisponível'} · {date(item.createdAt)}
          </p>
        </div>
        <Status value={productStatus(item)} />
      </div>
      <form onSubmit={save}>
        <fieldset disabled={!editable || pending}>
          <label>
            Título
            <input
              required
              minLength={2}
              maxLength={120}
              value={draft.title}
              onChange={(event) => set('title', event.target.value)}
            />
          </label>
          <label>
            Descrição
            <textarea
              required
              rows={4}
              maxLength={2000}
              value={draft.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Categoria
              <select
                value={draft.category}
                onChange={(event) => set('category', event.target.value)}
              >
                {categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Preço (€)
              <input
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                required
                value={draft.price}
                onChange={(event) => set('price', event.target.value)}
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Unidade
              <select value={draft.unit} onChange={(event) => set('unit', event.target.value)}>
                {['€/kg', '€/unidade', '€/dúzia', '€/frasco', '€/caixa'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Localidade
              <input disabled value={item.location} />
            </label>
          </div>
          <label className="switch-label">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(event) => set('is_active', event.target.checked)}
            />
            <span className="switch" />
            <span>
              Publicado na plataforma
              <small>
                A disponibilidade do produto mantém-se. O vendedor pode voltar a alterar a
                publicação na app.
              </small>
            </span>
          </label>
          <label className="switch-label">
            <input
              type="checkbox"
              aria-label="Destacar anúncio"
              checked={draft.featured}
              onChange={(event) => set('featured', event.target.checked)}
            />
            <span className="switch" />
            <span>
              Destacar anúncio
              <small>
                Aparece na secção “Produtos em destaque” da app enquanto estiver publicado e a conta
                do vendedor estiver ativa. Desativa esta opção para retirar o destaque.
              </small>
            </span>
          </label>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!editable && <p className="notice">Este anúncio foi removido e não pode ser alterado.</p>}
        <div className="modal-actions">
          <button type="button" disabled={pending} className="button secondary" onClick={onClose}>
            Fechar
          </button>
          {editable && (
            <button className="button primary" disabled={pending}>
              <Check size={17} />
              {pending ? 'A guardar…' : 'Guardar alterações'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
function UserDialog({ item, onClose, onSaved }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const canChange = ['active', 'suspended'].includes(item.status);
  const suspend = item.status === 'active';
  async function save() {
    setPending(true);
    setError('');
    try {
      await api(`/users/${item.id}/status`, {
        method: 'PATCH',
        body: { status: suspend ? 'suspended' : 'active' },
      });
      onSaved();
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      title="Detalhes do utilizador"
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <div className="detail-hero">
        <span className="avatar large-avatar">{initials(item.name)}</span>
        <div>
          <h3>{item.name}</h3>
          <p>{item.email}</p>
        </div>
      </div>
      <dl className="detail-list">
        <dt>Estado</dt>
        <dd>
          <Status value={item.status} />
        </dd>
        <dt>Email verificado</dt>
        <dd>{item.emailVerified ? 'Sim' : 'Não'}</dd>
        <dt>Telefone</dt>
        <dd>{item.phone || 'Não indicado'}</dd>
        <dt>Localidade</dt>
        <dd>{item.location?.municipality || item.location?.city || 'Não indicada'}</dd>
        <dt>Interesse inicial</dt>
        <dd>{usageLabel(item.usageIntent)}</dd>
        <dt>Registo</dt>
        <dd>{date(item.createdAt)}</dd>
        <dt>Último acesso</dt>
        <dd>{date(item.lastLoginAt)}</dd>
      </dl>
      {confirm && (
        <div className="confirmation">
          <ShieldAlert size={21} />
          <div>
            <strong>{suspend ? 'Suspender este utilizador?' : 'Reativar este utilizador?'}</strong>
            <p>
              {suspend
                ? 'O acesso será bloqueado, as sessões serão terminadas e os seus anúncios deixarão de estar visíveis.'
                : 'O utilizador poderá iniciar sessão novamente e os seus anúncios publicados voltarão a estar visíveis.'}
            </p>
          </div>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="button secondary" disabled={pending} onClick={onClose}>
          Fechar
        </button>
        {canChange && (
          <button
            className={`button ${suspend ? 'danger' : 'primary'}`}
            disabled={pending}
            onClick={() => (confirm ? save() : setConfirm(true))}
          >
            {pending
              ? 'A guardar…'
              : confirm
                ? 'Confirmar alteração'
                : suspend
                  ? 'Suspender utilizador'
                  : 'Reativar utilizador'}
          </button>
        )}
      </div>
    </Modal>
  );
}
