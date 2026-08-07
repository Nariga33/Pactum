# Pactum

Plataforma operacional e administrativa para escritórios de advocacia —
cada escritório (tenant) tem um workspace com login dedicado em seu
próprio subdomínio. Além da comunicação interna estilo Slack, inclui
diretório de pessoas, arquivos e um módulo financeiro (DRE, fluxo de
caixa, inadimplência) restrito a quem tem acesso ao financeiro.

## Status atual

- Cadastro de escritório (`Organization`) com subdomínio próprio
- Usuários (`User`) e vínculo com escritório via `Membership` (papéis
  OWNER/ADMIN/MEMBER)
- Login isolado por tenant (Auth.js/NextAuth, credenciais + bcrypt)
- Proxy (`src/proxy.ts`) que resolve o tenant a partir do subdomínio da
  requisição
- Chat estilo Slack: canais do escritório (3 criados automaticamente no
  cadastro — `# geral`, `# societário`, `# contencioso` — e qualquer
  membro pode criar novos, públicos ou privados, pelo botão "+ Criar
  canal") e mensagens diretas 1:1 entre membros do mesmo escritório, com
  mensagens em tempo real via Pusher Channels (opcional — sem chaves
  configuradas, as mensagens continuam persistindo e aparecem ao
  recarregar a página)
- **Diretório** (`/dashboard/directory`): grade com foto, cargo,
  telefone e e-mail de cada pessoa do escritório, com busca. OWNER/ADMIN
  também veem ali o convite por e-mail (gera um link para compartilhar
  manualmente — ainda não há envio automático), gestão de papel
  (OWNER/ADMIN/MEMBER) e remoção de membros, sempre mantendo pelo menos
  um OWNER.
- **Perfil** (`/dashboard/profile`): cada pessoa edita seu nome, cargo,
  telefone e foto (a foto é redimensionada no navegador e guardada como
  data URL no banco — funciona sem storage externo, mas deve ser trocado
  por um bucket de verdade, ex: S3/Supabase Storage, antes de produção).
- **Arquivos** (`/dashboard/files`): upload/download/exclusão de
  documentos do escritório (máx. 7MB por arquivo — mesmo esquema
  "data URL no banco" do avatar, interino até haver storage de objetos
  real).
- **Financeiro** (`/finance`, "modo focado" — layout próprio, fora do
  chat): plano de contas, lançamentos de receita/despesa (com
  vencimento e status de pago), e uma visão geral com **DRE Gerencial**
  (regime de competência), **Fluxo de Caixa** (regime de caixa, só
  lançamentos pagos) e **Inadimplência** (recebimentos vencidos não
  pagos) — tudo calculado ao vivo a partir dos lançamentos reais, sem
  nenhum dado fictício. Acesso restrito: só quem tem `financeAccess`
  concedido pelo OWNER (ou o próprio OWNER) entra em qualquer página
  `/finance/*`; todo mundo mais é redirecionado de volta ao chat.

Ainda não implementado: integração de arquivos com Google
Drive/SharePoint, envio automático do e-mail de convite (SMTP/Resend
etc. — hoje o link precisa ser copiado e enviado manualmente), storage
de objetos real para fotos de perfil/anexos, e as visões financeiras
mais avançadas (orçado vs. realizado, ciclo financeiro, projeção,
comparativo entre períodos) — fazem mais sentido com volume real de
lançamentos ou uma integração contábil do que com dados de teste.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Auth.js (NextAuth v5)](https://authjs.dev), provedor de credenciais
- [Pusher Channels](https://pusher.com/channels/) para mensagens em tempo real

## Como rodar localmente

### 1. Banco de dados

Suba um Postgres local (ou use um serviço gerenciado) e configure a
variável `DATABASE_URL` em um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
# edite DATABASE_URL, AUTH_SECRET, etc.
```

Gere um `AUTH_SECRET` com `npx auth secret` ou `openssl rand -base64 32`.

Para mensagens em tempo real, crie um app gratuito em
[dashboard.pusher.com](https://dashboard.pusher.com/) (produto
"Channels") e preencha as variáveis `PUSHER_*`/`NEXT_PUBLIC_PUSHER_*` do
`.env`. Sem isso, o chat funciona normalmente, só não empurra mensagens
novas para quem já está com a página aberta (precisa recarregar).

### 2. Instalar dependências e aplicar o schema

```bash
npm install
npx prisma migrate dev
```

### 3. Subir o servidor

```bash
npm run dev
```

### 4. Testar o multi-tenant localmente (subdomínios)

Em desenvolvimento, `NEXT_PUBLIC_ROOT_DOMAIN` está configurado para
`lvh.me:3000` — o domínio `lvh.me` (e qualquer subdomínio dele, como
`meu-escritorio.lvh.me`) resolve para `127.0.0.1` sem precisar editar o
`/etc/hosts`.

- Domínio raiz (`http://lvh.me:3000`): landing page e cadastro de novo
  escritório (`/signup`)
- Subdomínio do escritório (ex: `http://meu-escritorio.lvh.me:3000`):
  login (`/login`) e workspace (`/dashboard`) daquele tenant

Ao criar um escritório em `/signup`, você é redirecionado
automaticamente para a tela de login do subdomínio correspondente.

## Deploy em produção (Vercel + Supabase)

### 1. Banco de dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → Database → Connection string**, copie a
   string no modo **Transaction** (porta `6543`, com `?pgbouncer=true`
   já incluído) — é a que suporta as conexões efêmeras das funções
   serverless da Vercel. A conexão direta (porta `5432`) não escala bem
   nesse cenário e não deve ser usada como `DATABASE_URL` em produção.
3. Essa string vira a variável `DATABASE_URL` no passo 3.

### 2. Domínio com subdomínio curinga

O multi-tenant depende de subdomínio por escritório
(`escritorio.seudominio.com`), então:

1. Registre/tenha um domínio (ex: `pactum.app`).
2. Na Vercel, em **Project Settings → Domains**, adicione tanto
   `pactum.app` quanto `*.pactum.app` (wildcard) apontando para o mesmo
   projeto. A Vercel mostra os registros DNS (geralmente um `A`/`ALIAS`
   para o domínio raiz e um `CNAME` para o `*`) — crie-os no seu
   provedor de DNS.
3. `NEXT_PUBLIC_ROOT_DOMAIN` (passo 3) deve ser exatamente esse domínio,
   sem porta: `pactum.app`.

### 3. Conectar o repositório na Vercel

1. Em [vercel.com](https://vercel.com), **Add New → Project**, escolha
   o repositório `Nariga33/Pactum` e a branch de deploy.
2. A Vercel detecta Next.js automaticamente. O build já está configurado
   para rodar as migrations sozinho: `package.json` tem um script
   `vercel-build` (`prisma migrate deploy && next build`) que a Vercel
   usa automaticamente no lugar do `build` padrão quando presente — não
   precisa mexer no "Build Command" nas configurações do projeto.
3. Em **Project Settings → Environment Variables**, configure (Production
   e Preview):

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | connection string do Supabase, modo Transaction (passo 1) |
   | `AUTH_SECRET` | gere uma nova com `npx auth secret` — **não reuse a de dev** |
   | `NEXT_PUBLIC_ROOT_DOMAIN` | `pactum.app` (seu domínio, sem porta) |
   | `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | opcional — de [dashboard.pusher.com](https://dashboard.pusher.com/) |
   | `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` | mesmos valores acima, expostos ao navegador |

   Não configure `AUTH_URL`/`NEXTAUTH_URL` — ver nota em `.env.example`.
4. Deploy. Cada push subsequente na branch conectada builda e migra o
   banco automaticamente.

### Depois do primeiro deploy

- Teste em `https://SEU_DOMINIO/signup` (domínio raiz) e confirme que o
  redirecionamento cai em `https://escritorio-teste.SEU_DOMINIO/login`.
- Fotos de perfil e arquivos anexados hoje são guardados como data URL
  no próprio Postgres (ver notas acima) — funciona em produção, mas vale
  migrar para um bucket de objetos (S3/Supabase Storage) antes de operar
  com volume real de documentos.

## Estrutura relevante

- `prisma/schema.prisma` — modelos de dados (tenant, usuários, canais,
  mensagens, tabelas do Auth.js)
- `src/proxy.ts` — resolve o subdomínio da requisição e roteia para
  `src/app/t/[tenant]/...`
- `src/lib/tenant.ts` — helpers de subdomínio (extração, validação,
  geração de URLs de tenant)
- `src/auth.ts` — configuração do Auth.js (login por credenciais,
  escopado por tenant)
- `src/app/signup` — cadastro de escritório + primeiro usuário (owner)
- `src/app/t/[tenant]/login` — login do workspace
- `src/app/t/[tenant]/dashboard` — layout (sidebar de canais/DMs),
  `/c/[channelId]` (canal) e `/dm/[userId]` (mensagem direta)
- `src/lib/actions/messages.ts` — envio de mensagem (valida
  participação no canal antes de gravar)
- `src/lib/channels.ts` — busca/criação da conversa 1:1 entre dois membros
- `src/lib/pusher-server.ts` / `pusher-client.ts` / `pusher-shared.ts` —
  publica e assina eventos de mensagem nova por canal privado do Pusher,
  autorizado em `src/app/api/pusher/auth`
- `src/lib/actions/invitations.ts` — gera/revoga convites (OWNER/ADMIN)
- `src/lib/actions/members.ts` — altera papel e remove membro
  (com guarda de "sempre um OWNER")
- `src/app/t/[tenant]/dashboard/directory` — grade de pessoas, convite
  e gestão de papel/remoção
- `src/app/t/[tenant]/dashboard/profile` — edição do próprio perfil
  (nome, cargo, telefone, foto)
- `src/app/t/[tenant]/join/[token]` — página pública onde quem foi
  convidado define nome/senha e entra no workspace
- `src/components/avatar.tsx` — avatar com foto ou iniciais, reutilizado
  no chat, na barra lateral e no diretório
- `src/app/t/[tenant]/dashboard/files` + `src/lib/actions/files.ts` —
  upload/lista/exclusão de arquivos do escritório
- `src/lib/finance.ts` — guarda de acesso ao financeiro (`requireFinanceAccess`
  para páginas, `requireFinanceSession` para server actions)
- `src/app/t/[tenant]/finance` — layout e páginas do modo financeiro
  (visão geral/DRE, lançamentos, plano de contas), fora da árvore de
  `/dashboard` de propósito, para ser um "modo focado" com shell
  próprio em vez de mais um item dentro do chat
- `src/lib/actions/finance.ts` — cria conta do plano de contas, lança
  receita/despesa, marca como pago, exclui lançamento
