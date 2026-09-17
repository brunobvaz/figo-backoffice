# Figo Backoffice

Projeto React JavaScript + Vite para administrar o backend existente em `../backend`. Interface em português de Portugal, baseada no mockup Dashboard.png, com o nome e a mascote da Figo. Inclui Dashboard, Anúncios, Utilizadores, Categorias, Transações e Relatórios.

Deploy preparado para **Cloudflare Workers**, com o backend no Render. Consulta [CLOUDFLARE.md](./CLOUDFLARE.md) para publicar em `https://admin.figo-app.com`.

## Executar localmente

Requisitos: Node.js 22.12+ e o backend com MongoDB configurado.

1. No backend, instala as dependências (`npm install`), configura o `.env` existente e acrescenta `BACKOFFICE_ORIGIN=http://localhost:5173,http://127.0.0.1:5173`. Mantém os valores existentes de `CORS_ORIGIN` para a aplicação móvel.
2. Ainda no backend, executa `npm run admin:create`. O comando pede nome, email e uma palavra-passe de pelo menos 12 caracteres, sem a mostrar no terminal. Cria uma conta apenas em `admins`, na base configurada por `MONGODB_URI` e `MONGODB_DB_NAME`. Nunca substitui uma conta existente.
3. Inicia o backend com `npm run dev` (porta 3000 por omissão).
4. Neste projeto, executa `npm install`, copia `.env.example` para `.env` e inicia com `npm run dev`.
5. Abre http://localhost:5173 ou http://127.0.0.1:5173 e entra com o administrador criado.

O frontend envia pedidos a `/api/v1/admin`, usando o proxy de desenvolvimento para `http://localhost:3000`. Para apontar a outra API, altera `API_PROXY_TARGET` e reinicia o Vite. A API escolhida precisa de ter as novas rotas administrativas publicadas e de permitir a origem do backoffice em `BACKOFFICE_ORIGIN`.

Se surgir «Pedido de administração não autorizado», confirma que o endereço e a porta usados no navegador estão em `BACKOFFICE_ORIGIN`. Em desenvolvimento, a configuração acima autoriza os dois endereços locais. Depois de alterar o `.env`, reinicia o backend.

Não existem credenciais predefinidas, registo público de administradores ou dados demonstrativos na aplicação. Dados vazios e falhas de ligação são apresentados explicitamente.

## O que está implementado

- Dashboard com totais atuais, atividade diária, comparação de períodos, categorias e registos recentes. O período admite entre 1 e 366 dias, com agregação em UTC. As listas recentes e a distribuição por categoria são globais; o gráfico, os novos registos e as transações respeitam o período selecionado.
- Anúncios com pesquisa, filtros, paginação e edição de título, descrição, categoria, preço, unidade, publicação e destaque. A opção **Destacar anúncio** controla a secção **Produtos em destaque** da app e pode ser ativada ou retirada a qualquer momento. Anúncios anteriores começam sem destaque. Despublicar mantém a disponibilidade (`active`/`sold`); o vendedor também pode gerir a publicação na app. Anúncios removidos não são restaurados.
- Utilizadores com pesquisa, filtros, detalhes, suspensão e reativação. Suspender revoga as sessões da app e os dispositivos push; as regras existentes ocultam os anúncios do proprietário. Contas eliminadas, em eliminação ou desativadas pelo próprio utilizador não são reativadas pelo backoffice.
- Categorias correspondentes ao catálogo que já existe no backend e na app. Selecionar uma categoria abre os respetivos anúncios. Para mudar um anúncio de categoria, usa a edição do anúncio. A criação/remoção de categorias não faz parte desta versão porque o catálogo atual é validado pela app e pelo backend.
- Transações com pesquisa, filtros, paginação e detalhes. Os estados mantêm o fluxo de confirmação pelos participantes. O backoffice não altera acordos ou marca pagamentos como realizados.
- Relatórios por período, tabela diária e exportação CSV. O valor transacionado é a soma dos valores acordados de transações `completed` e `reviewed`, pela data `completedAt`; não é receita da Figo nem confirmação de pagamento.
- Layout adaptável a desktop, tablet e telemóvel. Modais com foco contido e navegação por teclado.

## Autenticação e collections

- `admins`: nome, email único, hash Argon2 da palavra-passe, estado (`active`/`disabled`) e datas.
- `admin_sessions`: sessões administrativas com token aleatório guardado como SHA-256, expiração de 12 horas e índice TTL. A expiração é também validada em cada pedido, independentemente da limpeza TTL.
- Os administradores nunca são consultados na collection `users`. Os tokens JWT e as sessões da aplicação móvel não dão acesso às rotas administrativas; cookies administrativos não dão acesso às rotas autenticadas da app.
- Cookie `HttpOnly`, `SameSite=Strict`, restrito a `/api/v1/admin`, e `Secure` em produção. Sem armazenamento de credenciais em localStorage.
- O backend verifica o administrador ativo em cada pedido. Desativar o documento em `admins` bloqueia imediatamente as suas sessões. O logout remove a sessão no servidor.
- Origem exata validada por `BACKOFFICE_ORIGIN`, header obrigatório `X-Figo-Backoffice`, respostas `no-store` e limite de 10 tentativas de login falhadas por IP em 15 minutos.

Para automação controlada, o comando de criação aceita `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` como variáveis de ambiente. Não guardes palavras-passe em ficheiros versionados nem em comandos partilhados.

## Produção

O destino configurado é Cloudflare Workers com Static Assets. `wrangler.jsonc` publica `dist/` e o Worker que encaminha `/api/v1/admin/` e as imagens para `https://figo-backend.onrender.com`. As rotas do React têm fallback para `index.html`; rotas desconhecidas da API devolvem JSON com erro.

Todos os builds usam `/api/v1` no mesmo domínio do frontend, mesmo que o `.env` local tenha um URL direto. Altera o destino no `BACKEND_ORIGIN` de `wrangler.jsonc`. O backend deve permitir `https://admin.figo-app.com` em `BACKOFFICE_ORIGIN` e ter `NODE_ENV=production`. Mantém os restantes requisitos de ambiente do backend e as origens existentes da app.

```sh
npm ci
npm run deploy:check # compila e valida; não publica
# Depois de configurar o Render e autenticar o Wrangler:
npm run deploy
```

Para outros servidores, `nginx.example.conf` exemplifica o mesmo modelo de proxy. `npm run preview` serve apenas para validação local.

## Validação

```sh
# Backend: autenticação, isolamento de contas, permissões, relatórios e alterações
cd ../backend
npm test

# Frontend: compilação
cd ../backoffice
npm run build
npm run test:worker
npm run deploy:check

# Navegador: login, dashboard, pesquisa, edição, suspensão, CSV e mobile
npx playwright install chromium
npm run test:e2e
# Build real + Worker local HTTPS + cookies de produção + base temporária
npm run test:e2e:cloudflare
```

Os testes de navegador usam exclusivamente `tests/api-server.mjs`, um MongoDB temporário e dados fictícios. Precisam das dependências do backend instaladas, porta 3101 e porta 5174 (Vite) ou 8788 (Worker HTTPS) disponíveis, e permissão para iniciar processos locais. Não leem nem escrevem na base da aplicação nem chamam o Render. As capturas de validação ficam em `test-results/` e não são versionadas.

# figo-backoffice
