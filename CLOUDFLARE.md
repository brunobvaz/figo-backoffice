# Deploy do backoffice Figo no Cloudflare

Este projeto está preparado para **Cloudflare Workers com Static Assets**. O endereço público é `https://admin.figo-app.com`; o backend continua em `https://figo-backend.onrender.com`. Não é necessário migrar Express ou MongoDB para o Cloudflare.

O navegador chama `/api/v1/admin` no domínio do backoffice. O Worker encaminha o pedido para o Render e devolve os cookies sem alterar `HttpOnly`, `Secure`, `SameSite=Strict` ou `Path=/api/v1/admin`. Não existem credenciais de MongoDB ou segredos do backend no Worker ou no frontend.

## 1. Configurar o backend no Render

No serviço `figo-backend`, em **Environment**, configura:

```dotenv
NODE_ENV=production
BACKOFFICE_ORIGIN=https://admin.figo-app.com
```

Se `BACKOFFICE_ORIGIN` já tiver outras origens necessárias, acrescenta a nova origem separada por vírgula, sem substituir as existentes. Usa o domínio completo, sem barra final e sem `/*`. Guarda e aplica a alteração ao serviço. Mantém `CORS_ORIGIN` e os restantes valores atuais da app.

O backend publicado deve conter as rotas administrativas e as alterações de destaque dos anúncios. O administrador deve existir na collection `admins` da base usada pelo Render. Se já existe nessa base, não é necessário voltar a criá-lo. O comando `npm run admin:create` pertence ao backend e nunca deve correr no build do Cloudflare.

## 2. Configurar o Worker

O `wrangler.jsonc` já define:

| Campo              | Valor                               |
| ------------------ | ----------------------------------- |
| Nome               | `figo-backoffice`                   |
| Código do Worker   | `worker/index.js`                   |
| Frontend compilado | `dist/`                             |
| Backend            | `https://figo-backend.onrender.com` |
| Rotas React        | Fallback SPA para `index.html`      |

Altera `vars.BACKEND_ORIGIN` nesse ficheiro para usar outro backend. O valor é só a origem HTTPS, sem `/api/v1`. O ficheiro é a fonte de configuração: uma alteração manual dessa variável no painel pode ser substituída no próximo deploy.

`VITE_API_URL` e `API_PROXY_TARGET` são opções de desenvolvimento. **Todos os builds usam `/api/v1`**, mesmo que exista um `.env` local a apontar diretamente para o Render. `API_PROXY_TARGET` não cria um proxy em produção; esse trabalho pertence ao Worker.

## 3. Deploy pelo repositório Git

No Cloudflare, abre **Workers & Pages**, escolhe o Worker existente ou cria um Worker ligado ao repositório do backoffice. Usa:

| Opção          | Valor                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Root directory | `/` — este backoffice tem o seu próprio repositório                       |
| Build command  | `npm run build`                                                           |
| Deploy command | `npx wrangler deploy`                                                     |
| Node.js        | `22.14.0` ou uma versão 22 mais recente; `.node-version` já está incluído |

Se importares um monorepositório, a raiz deve ser a pasta que contém este `package.json` e o `wrangler.jsonc`. O nome do Worker no painel deve coincidir com `figo-backoffice`.

O build instala as dependências a partir de `package-lock.json`. Não basta publicar `dist/` como ficheiros estáticos: é necessário publicar também `worker/index.js` através do Wrangler para ter API, imagens e login a funcionar.

Em **Settings → Domains & Routes**, associa `admin.figo-app.com` como **Custom Domain** se ainda não estiver associado. Não é necessário alterar o DNS existente quando o domínio já está ligado ao Worker correto. Os URLs de preview estão desativados no ficheiro de configuração; para autenticar noutro domínio, é necessário autorizar também essa origem no backend.

## 4. Alternativa: deploy pelo terminal

Na pasta do backoffice:

```sh
npm ci
npm run test:worker
npm run deploy:check
npx wrangler login
npm run deploy
```

`deploy:check` compila e executa `wrangler deploy --dry-run`, sem publicar. `deploy` compila e publica. A autenticação Cloudflare fica na máquina/CI; não coloques tokens em `VITE_*`, no código ou em ficheiros versionados.

## 5. Confirmar depois de publicar

Abre `https://admin.figo-app.com`, inicia sessão e recarrega a página. Confirma que consegues abrir Anúncios diretamente, destacar/retirar um anúncio e terminar sessão. No separador Network do navegador, os pedidos administrativos devem apontar para `https://admin.figo-app.com/api/v1/admin/...`.

Sem uma sessão iniciada, este pedido deve devolver **401** em JSON. Essa resposta confirma que o proxy chegou ao backend e que a origem foi autorizada:

```sh
curl -i 'https://admin.figo-app.com/api/v1/admin/auth/me' \
  -H 'X-Figo-Backoffice: 1'
```

| Resposta/problema                         | Ação                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `403 ADMIN_ORIGIN_FORBIDDEN`              | Confirmar `BACKOFFICE_ORIGIN=https://admin.figo-app.com` no Render e aplicar a alteração ao serviço. |
| Pedido do navegador diretamente ao Render | Publicar o build atualizado (`npm run build`) e recarregar a página.                                 |
| `502 BACKEND_UNAVAILABLE`                 | Confirmar o estado do Render, o valor de `BACKEND_ORIGIN` e os logs do Worker.                       |
| `503 BACKEND_NOT_CONFIGURED`              | Corrigir `BACKEND_ORIGIN` no `wrangler.jsonc` e publicar novamente.                                  |
| `200` com HTML numa rota da API           | Está publicado só o frontend, ou a configuração do Worker não inclui as rotas `/api/*`.              |
| `401 ADMIN_INVALID_CREDENTIALS` no login  | Confirmar que a conta existe em `admins` na base de dados usada pelo Render.                         |

Os pedidos administrativos e as imagens encaminhadas não são guardados em cache. Só os assets com hash em `/assets/` têm cache longa. `public/_headers` acrescenta as políticas de segurança; `robots.txt` e `X-Robots-Tag` indicam aos motores de pesquisa que não devem indexar o backoffice.

## Testar antes de publicar

```sh
npm run test:worker
npm run test:e2e:cloudflare
```

Os testes E2E precisam das dependências de `../backend`, Chromium do Playwright e portas 3101/8788 livres. Usam uma base MongoDB temporária, o runtime local do Cloudflare, HTTPS local e cookies `Secure` iguais aos de produção. Nunca usam o backend do Render nem a base da app.

Para testar manualmente o Worker com o teu backend local, copia `.dev.vars.example` para `.dev.vars`, permite `https://localhost:8787` em `BACKOFFICE_ORIGIN` desse backend e executa `npm run preview:cloudflare`. Abre `https://localhost:8787` e aceita apenas para este teste o certificado local. `.dev.vars` é ignorado pelo Git e não é publicado.

Referências oficiais: [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [routing e bindings](https://developers.cloudflare.com/workers/static-assets/binding/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) e [headers](https://developers.cloudflare.com/workers/static-assets/headers/).
