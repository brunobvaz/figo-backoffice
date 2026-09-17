import { Link } from 'react-router-dom';
import {
  Apple,
  ArrowUpRight,
  Carrot,
  Coffee,
  Cookie,
  Egg,
  GlassWater,
  Leaf,
  Milk,
  Package,
  Tag,
} from 'lucide-react';
import { categories, categoryColors, number, useResource } from '../api';
import { ErrorState, Loading, PageHeader } from '../components/UI';

const icons = [Apple, Carrot, Egg, Cookie, Milk, Leaf, Coffee, GlassWater, Package];
export default function Categories() {
  const { data, loading, error, reload } = useResource('/categories');
  return (
    <>
      <PageHeader title="Categorias" description="Cada produto, no seu lugar." />
      <p className="category-intro">
        As categorias disponíveis na aplicação Figo. Consulta os anúncios de cada categoria para os
        organizar e atualizar.
      </p>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (
        <div className="category-grid">
          {data.map((item) => {
            const index = categories.indexOf(item.name);
            const Icon = icons[index] || Tag;
            return (
              <Link
                key={item.name}
                to={`/anuncios?category=${encodeURIComponent(item.name)}`}
                className="category-card"
              >
                <div className="category-card-top">
                  <span
                    style={{
                      color: categoryColors[index],
                      background: `${categoryColors[index]}18`,
                    }}
                  >
                    <Icon size={28} strokeWidth={1.7} />
                  </span>
                  <ArrowUpRight size={20} />
                </div>
                <h2>{item.name}</h2>
                <strong>
                  {number(item.total)} <span>anúncios</span>
                </strong>
                <div className="category-card-bottom">
                  <span>
                    <i className="live-dot" />
                    {number(item.active)} publicados e disponíveis
                  </span>
                  <ArrowUpRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
