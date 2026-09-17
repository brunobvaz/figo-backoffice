import { useCallback, useEffect, useState } from 'react';

export const apiBase = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');
export function queryString(values) {
  return new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== '' && value != null)
  ).toString();
}
export async function api(path, { body, method = 'GET', signal, file = false } = {}) {
  let response;
  try {
    response = await fetch(`${apiBase}/admin${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        'X-Figo-Backoffice': '1',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível contactar o servidor. Verifica a ligação e tenta novamente.');
  }
  if (response.status === 401 && !path.startsWith('/auth/'))
    window.dispatchEvent(new Event('figo:session-expired'));
  if (file && response.ok) return response.blob();
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    const error = new Error(
      result?.error?.message || 'O servidor não respondeu como esperado. Tenta novamente.'
    );
    error.status = response.status;
    throw error;
  }
  return result.data;
}
export function useResource(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: '', loading: true });
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: '', loading: false });
      })
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ data: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload };
}
export const number = (value) => new Intl.NumberFormat('pt-PT').format(value || 0);
export const money = (value) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);
export const date = (value) =>
  value ? new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC' }).format(new Date(value)) : '—';
export const initials = (name) =>
  (name || 'Figo')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
export const categories = [
  'Frutas',
  'Legumes',
  'Ovos',
  'Mel',
  'Laticínios',
  'Padaria',
  'Bebidas',
  'Conservas',
  'Outros',
];
export const categoryColors = [
  '#ed8950',
  '#69b982',
  '#d9cbb9',
  '#f3c75d',
  '#ab81c6',
  '#b79069',
  '#7bbbc3',
  '#bc748b',
  '#b7bbc9',
];
export const statusLabels = {
  active: 'Ativo',
  inactive: 'Inativo',
  sold: 'Esgotado',
  deleted: 'Removido',
  suspended: 'Suspenso',
  deactivated: 'Desativado',
  deletion_pending: 'Em eliminação',
  pending: 'Pendente',
  accepted: 'Aceite',
  buyer_confirmed: 'Confirmada pelo comprador',
  seller_confirmed: 'Confirmada pelo vendedor',
  completed: 'Concluída',
  reviewed: 'Avaliada',
  cancelled: 'Cancelada',
  declined: 'Recusada',
};
export const productStatus = (product) =>
  product.status === 'deleted'
    ? 'deleted'
    : product.is_active === false
      ? 'inactive'
      : product.status;
export const usageLabel = (value) =>
  ({ buy: 'Comprar', sell: 'Vender', both: 'Comprar e vender' })[value] || 'Não indicada';
export function productImage(product) {
  const filename = product.images?.[0]?.filename || product.imageFilename;
  const root = apiBase.replace(/\/api\/v1$/, '');
  const source = filename
    ? `${root}/uploads/products/${encodeURIComponent(filename)}?variant=thumb`
    : product.images?.[0]?.url || product.image;
  return source && (/^https?:\/\//.test(source) || source.startsWith('/')) ? source : null;
}
