import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('/');
  await page.getByLabel('Email de administrador').fill('admin@figo.test');
  await page.getByLabel('Palavra-passe', { exact: true }).fill('Figo-test-only-2026');
  await page.getByRole('button', { name: 'Entrar no backoffice' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Anúncios ativos', exact: true })).toBeVisible();
}

test('login administrativo, dashboard e layout do mockup', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('login.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByLabel('Email de administrador').fill('pessoa0@figo.test');
  await page.getByLabel('Palavra-passe', { exact: true }).fill('Figo-test-only-2026');
  await page.getByRole('button', { name: 'Entrar no backoffice' }).click();
  await expect(page.getByRole('alert')).toContainText('Email ou palavra-passe inválidos');
  await login(page);
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(6);
  for (const name of ['Mensagens', 'Avaliações', 'Conteúdos', 'Configurações'])
    await expect(page.getByRole('navigation').getByText(name, { exact: true })).toHaveCount(0);
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('dashboard.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('pesquisa, paginação, edição e persistência de anúncios', async ({ page }) => {
  await login(page);
  await page.getByRole('navigation').getByRole('link', { name: 'Anúncios', exact: true }).click();
  await expect(page.getByText('126 resultados')).toBeVisible();
  await page.getByRole('button', { name: 'Página seguinte' }).click();
  await expect(page.getByText('Página 2 de')).toBeVisible();
  await page.getByPlaceholder('Pesquisar produto ou localidade…').fill('Figos da quinta');
  await page.getByRole('button', { name: 'Aplicar pesquisa' }).click();
  await page.getByRole('button', { name: 'Ver detalhes de Figos da quinta' }).first().click();
  await page.getByLabel('Título', { exact: true }).fill('Figos biológicos da quinta');
  await page.getByRole('button', { name: 'Guardar alterações' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByPlaceholder('Pesquisar produto ou localidade…').fill('Figos biológicos');
  await page.getByRole('button', { name: 'Aplicar pesquisa' }).click();
  await expect(
    page.getByRole('button', { name: /Figos biológicos da quinta/ }).first()
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: /Figos biológicos da quinta/ }).first()
  ).toBeVisible();
});

test('suspensão com confirmação, categorias, transações e exportação', async ({ page }) => {
  await login(page);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Utilizadores', exact: true })
    .click();
  await page
    .getByRole('button', { name: /Ver detalhes de Tiago Silva/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Suspender utilizador' }).click();
  await expect(page.getByText('Suspender este utilizador?')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar alteração' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Filtrar por estado').selectOption('suspended');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('navigation').getByRole('link', { name: 'Categorias', exact: true }).click();
  await expect(page.locator('.category-card')).toHaveCount(9);
  await page.locator('.category-card').filter({ hasText: 'Mel' }).click();
  await expect(page.getByLabel('Filtrar por categoria')).toHaveValue('Mel');
  await page.getByRole('navigation').getByRole('link', { name: 'Transações', exact: true }).click();
  await page
    .getByRole('button', { name: /Ver detalhes/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Detalhes da transação' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click();
  await page.getByRole('navigation').getByRole('link', { name: 'Relatórios', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/^figo-relatorio-/);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
});

test('períodos, estados vazios, falhas da API e navegação móvel', async ({ page }, testInfo) => {
  await login(page);
  await page.locator('.date-trigger').click();
  await page.getByLabel('De', { exact: true }).fill('2020-01-01');
  await page.getByLabel('Até', { exact: true }).fill('2020-01-07');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  await expect(page.getByText('A atividade começa aqui')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Anúncios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Anúncios', exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390);
  await page.route('**/admin/products?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { message: 'Falha de teste' } }),
    })
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Falha de teste');
  await page.unroute('**/admin/products?*');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('destaca e retira um anúncio com persistência e reflexo na API pública da app', async ({
  page,
}, testInfo) => {
  await login(page);
  await page.getByRole('navigation').getByRole('link', { name: 'Anúncios', exact: true }).click();
  await page.getByPlaceholder('Pesquisar produto ou localidade…').fill('Mel de rosmaninho');
  await page.getByRole('button', { name: 'Aplicar pesquisa' }).click();
  await page.getByRole('button', { name: 'Ver detalhes de Mel de rosmaninho' }).first().click();
  const checkbox = page.getByRole('checkbox', { name: 'Destacar anúncio', exact: true });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await page.screenshot({
    path: testInfo.outputPath('destacar-anuncio.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Guardar alterações' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('★ Em destaque')).toBeVisible();
  const response = await page.request.get('http://127.0.0.1:3101/api/v1/products?featured=true');
  const data = (await response.json()).data;
  expect(data.items).toHaveLength(1);
  expect(data.items[0]).toMatchObject({ title: 'Mel de rosmaninho', featured: true });
  await page.getByRole('button', { name: 'Ver detalhes de Mel de rosmaninho' }).first().click();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await page.getByRole('button', { name: 'Guardar alterações' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const cleared = await page.request.get('http://127.0.0.1:3101/api/v1/products?featured=true');
  expect((await cleared.json()).data.items).toHaveLength(0);
  await expect(page.getByText('★ Em destaque')).toHaveCount(0);
});

test('Cloudflare: rotas diretas, headers e sessão segura no mesmo domínio', async ({ page, context }) => {
  test.skip(process.env.E2E_CLOUDFLARE !== '1', 'Requer o Worker local.');
  const response = await page.goto('/anuncios');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['content-security-policy']).toContain("connect-src 'self'");
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
  await login(page);
  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === 'figo_admin')).toMatchObject({
    domain: 'localhost', path: '/api/v1/admin', httpOnly: true, secure: true, sameSite: 'Strict',
  });
  const session = await page.request.get('/api/v1/admin/auth/me', {
    headers: { 'X-Figo-Backoffice': '1' },
  });
  expect(session.status()).toBe(200);
  expect(session.headers()['cache-control']).toBe('no-store');
  expect((await session.json()).data.admin.email).toBe('admin@figo.test');
  const blocked = await page.request.get('/api/v1/admin/auth/me');
  expect(blocked.status()).toBe(403);
  expect(blocked.headers()['content-type']).toContain('application/json');
  const missing = await page.request.get('/api/not-a-route');
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toContain('application/json');
});
