import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Download,
  Euro,
  MoreHorizontal,
  Package,
  Users,
} from 'lucide-react';
import {
  api,
  date,
  initials,
  money,
  number,
  productStatus,
  queryString,
  usageLabel,
  useResource,
} from '../api';
import {
  DateRange,
  defaultRange,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  ProductThumb,
  Status,
} from '../components/UI';
import { ActivityChart, CategoryChart, RevenueTable } from '../components/Charts';
import { RecordDialog } from './Records';

function Growth({ metric }) {
  if (!metric.previous)
    return (
      <span className="metric-note">
        {metric.value ? 'Sem registos no período anterior' : 'Sem variação no período'}
      </span>
    );
  const percent = Math.round(((metric.value - metric.previous) / metric.previous) * 100);
  const Icon = percent >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`metric-growth ${percent < 0 ? 'negative' : ''}`}>
      <Icon size={16} />
      {percent > 0 ? '+' : ''}
      {percent}% <small>vs. período anterior</small>
    </span>
  );
}
export default function Dashboard({ report = false }) {
  const [range, setRange] = useState(defaultRange);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { data, loading, error, reload } = useResource(`/dashboard?${queryString(range)}`);
  async function download() {
    setExporting(true);
    setExportError('');
    try {
      const blob = await api(`/reports/export?${queryString(range)}`, { file: true });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `figo-relatorio-${range.from}-${range.to}.csv`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(error.message);
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <PageHeader
        title={report ? 'Relatórios' : 'Dashboard'}
        description={
          report
            ? 'A evolução da comunidade, em números.'
            : 'Visão geral da atividade da plataforma.'
        }
      >
        <DateRange value={range} onChange={setRange} />
        {report && (
          <button
            className="button primary"
            onClick={download}
            disabled={exporting || loading || !!error}
          >
            <Download size={16} />
            {exporting ? 'A exportar…' : 'Exportar CSV'}
          </button>
        )}
      </PageHeader>
      {exportError && (
        <p className="form-error" role="alert">
          {exportError}
        </p>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        <>
          <div className="metric-grid">
            {[
              {
                title: 'Anúncios ativos',
                value: number(data.stats.activeProducts),
                icon: Package,
                color: 'purple',
                note: `${number(data.stats.newProducts.value)} criados no período`,
              },
              {
                title: 'Utilizadores registados',
                value: number(data.stats.registeredUsers),
                icon: Users,
                color: 'green',
                note: `${number(data.stats.newUsers.value)} novos no período`,
              },
              {
                title: 'Transações concluídas',
                value: number(data.stats.transactions.value),
                icon: CreditCard,
                color: 'yellow',
                metric: data.stats.transactions,
              },
              {
                title: 'Valor transacionado',
                value: money(data.stats.revenue.value),
                icon: Euro,
                color: 'pink',
                metric: data.stats.revenue,
              },
            ].map(({ title, value, icon: Icon, color, note, metric }) => (
              <article className={`metric-card ${color}`} key={title}>
                <span className="metric-icon">
                  <Icon size={25} strokeWidth={1.7} />
                </span>
                <div>
                  <h2>{title}</h2>
                  <strong className="metric-value">{value}</strong>
                  {note ? (
                    <span className="metric-note">
                      <ArrowUpRight size={14} />
                      {note}
                    </span>
                  ) : (
                    <Growth metric={metric} />
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="charts-grid">
            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Atividade na plataforma</h2>
                  <p>O crescimento da nossa comunidade</p>
                </div>
                <span className="period-pill">{data.range.days} dias</span>
              </div>
              <ActivityChart data={data.activity} />
            </section>
            <section className="panel category-panel">
              <div className="panel-heading">
                <div>
                  <h2>Anúncios por categoria</h2>
                  <p>Todos os anúncios registados</p>
                </div>
                <Link className="text-link" to="/categorias">
                  Ver todas <ArrowRight size={15} />
                </Link>
              </div>
              <CategoryChart data={data.categories} />
            </section>
          </div>
          {report ? (
            <section className="panel report-panel">
              <div className="panel-heading">
                <div>
                  <h2>Atividade por dia</h2>
                  <p>
                    Transações concluídas por data de conclusão · valores acordados entre
                    utilizadores, sem confirmação de pagamento.
                  </p>
                </div>
              </div>
              <RevenueTable data={data.activity} />
            </section>
          ) : (
            <div className="recent-grid">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Anúncios mais recentes</h2>
                  <Link className="text-link" to="/anuncios">
                    Ver todos <ArrowRight size={15} />
                  </Link>
                </div>
                {data.recentProducts.length ? (
                  <div className="table-scroll">
                    <table className="recent-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Utilizador</th>
                          <th>Categoria</th>
                          <th>Estado</th>
                          <th>Data</th>
                          <th>
                            <span className="sr-only">Ações</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentProducts.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <button
                                className="product-cell"
                                onClick={() => setSelected({ kind: 'products', item })}
                              >
                                <ProductThumb product={item} />
                                <span>{item.title}</span>
                              </button>
                            </td>
                            <td>{item.seller?.name || 'Conta indisponível'}</td>
                            <td>{item.category}</td>
                            <td>
                              <Status value={productStatus(item)} />
                            </td>
                            <td className="nowrap">{date(item.createdAt)}</td>
                            <td>
                              <button
                                className="row-action"
                                aria-label={`Ver anúncio ${item.title}`}
                                onClick={() => setSelected({ kind: 'products', item })}
                              >
                                <MoreHorizontal size={19} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty />
                )}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Utilizadores recentes</h2>
                  <Link className="text-link" to="/utilizadores">
                    Ver todos <ArrowRight size={15} />
                  </Link>
                </div>
                {data.recentUsers.length ? (
                  <div className="table-scroll">
                    <table className="recent-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Interesse</th>
                          <th>Registo</th>
                          <th>Estado</th>
                          <th>
                            <span className="sr-only">Ações</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentUsers.map((item, index) => (
                          <tr key={item.id}>
                            <td>
                              <button
                                className="user-cell"
                                onClick={() => setSelected({ kind: 'users', item })}
                              >
                                <span className={`avatar avatar-${index % 4}`}>
                                  {initials(item.name)}
                                </span>
                                <span>{item.name}</span>
                              </button>
                            </td>
                            <td>{usageLabel(item.usageIntent)}</td>
                            <td className="nowrap">{date(item.createdAt)}</td>
                            <td>
                              <Status value={item.status} />
                            </td>
                            <td>
                              <button
                                className="row-action"
                                aria-label={`Ver utilizador ${item.name}`}
                                onClick={() => setSelected({ kind: 'users', item })}
                              >
                                <MoreHorizontal size={19} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty />
                )}
              </section>
            </div>
          )}
          {!report && (
            <div className="dashboard-note">
              <span className="live-dot" />
              Dados do backend · Totais atuais e atividade no período selecionado.
            </div>
          )}
        </>
      )}
      {selected && (
        <RecordDialog
          {...selected}
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
