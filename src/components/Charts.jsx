import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { categoryColors, categories, money, number } from '../api';
import { Empty } from './UI';

const dayLabel = (value) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
export function ActivityChart({ data }) {
  const hasData = data.some((row) => row.products || row.users || row.transactions);
  if (!hasData)
    return (
      <div className="chart-empty">
        <Empty
          title="A atividade começa aqui"
          text="Não existem novos registos no período selecionado."
        />
      </div>
    );
  return (
    <>
      <div
        className="activity-chart"
        role="img"
        aria-label="Evolução diária de anúncios criados, novos utilizadores e transações concluídas"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 14, right: 12, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8751a6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#8751a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f0eef3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={dayLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={50}
              tick={{ fontSize: 11, fill: '#8b8999' }}
              dy={9}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8b8999' }}
            />
            <Tooltip
              labelFormatter={dayLabel}
              contentStyle={{ border: '1px solid #ece8f0', borderRadius: 10, fontSize: 12 }}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="products"
              name="Anúncios criados"
              stroke="#8551a5"
              strokeWidth={2.5}
              fill="url(#activityFill)"
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="users"
              name="Novos utilizadores"
              stroke="#4aa778"
              strokeWidth={2.3}
              dot={false}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="transactions"
              name="Transações concluídas"
              stroke="#e9b347"
              strokeWidth={2.3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span>
          <i style={{ background: '#8551a5' }} />
          Anúncios criados
        </span>
        <span>
          <i style={{ background: '#4aa778' }} />
          Novos utilizadores
        </span>
        <span>
          <i style={{ background: '#e9b347' }} />
          Transações concluídas
        </span>
      </div>
    </>
  );
}
export function CategoryChart({ data }) {
  const total = data.reduce((sum, row) => sum + row.total, 0);
  if (!total)
    return (
      <div className="chart-empty">
        <Empty title="Ainda sem anúncios" text="A distribuição por categoria aparecerá aqui." />
      </div>
    );
  return (
    <div className="category-chart">
      <div className="donut-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data.filter((row) => row.total)}
              dataKey="total"
              nameKey="name"
              innerRadius="69%"
              outerRadius="94%"
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data
                .filter((row) => row.total)
                .map((row) => (
                  <Cell key={row.name} fill={categoryColors[categories.indexOf(row.name)]} />
                ))}
            </Pie>
            <Tooltip
              formatter={(value) => [number(value), 'Anúncios']}
              contentStyle={{ borderRadius: 10, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{number(total)}</strong>
          <span>anúncios</span>
        </div>
      </div>
      <div className="category-legend">
        {data
          .filter((row) => row.total)
          .map((row) => (
            <div key={row.name}>
              <span>
                <i style={{ background: categoryColors[categories.indexOf(row.name)] }} />
                {row.name}
              </span>
              <strong>
                {Math.round((row.total / total) * 100)}
                <small>%</small>
              </strong>
            </div>
          ))}
      </div>
    </div>
  );
}
export function RevenueTable({ data }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Dia (UTC)</th>
            <th>Anúncios criados</th>
            <th>Novos utilizadores</th>
            <th>Transações concluídas</th>
            <th>Valor acordado</th>
          </tr>
        </thead>
        <tbody>
          {[...data].reverse().map((row) => (
            <tr key={row.date}>
              <td>{dayLabel(row.date)}</td>
              <td>{number(row.products)}</td>
              <td>{number(row.users)}</td>
              <td>{number(row.transactions)}</td>
              <td className="amount">{money(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
