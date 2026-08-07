# Pactum

Plataforma operacional e administrativa para escritórios de advocacia —
cada escritório (tenant) tem um workspace com login dedicado em seu
próprio endereço (ex: `pactum.app/meu-escritorio`). Além da comunicação
interna estilo Slack, inclui
diretório de pessoas, arquivos e um módulo financeiro (DRE, fluxo de
caixa, inadimplência) restrito a quem tem acesso ao financeiro.

## Status atual

- Cadastro de escritório (`Organization`) com endereço próprio
  (`pactum.app/{slug}`)
- Usuários (`User`) e vínculo com escritório via `Membership` (papéis
  OWNER/ADMIN/MEMBER)
- Login isolado por tenant (Auth.js/NextAuth, credenciais + bcrypt)
- Proxy (`src/proxy.ts`) que resolve o tenant a partir do primeiro
  segmento da URL da requisição (multi-tenant por caminho, não por
  subdomínio — não depende de domínio próprio nem de DNS curinga)
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

### 4. Testar o multi-tenant localmente (por caminho)

O tenant é resolvido pelo primeiro segmento da URL, então tudo roda em
`http://localhost:3000` — nenhuma configuração extra de DNS/hosts é
necessária.

- Raiz (`http://localhost:3000`): landing page e cadastro de novo
  escritório (`/signup`)
- Workspace do escritório (ex: `http://localhost:3000/meu-escritorio`):
  login (`/meu-escritorio/login`) e área logada
  (`/meu-escritorio/dashboard`) daquele tenant

Ao criar um escritório em `/signup`, você é redirecionado
automaticamente para a tela de login do endereço correspondente.

## Deploy em produção (Vercel + Neon)

Qualquer Postgres gerenciado funciona (o Prisma aqui usa o driver `pg`
padrão) — o guia abaixo usa [Neon](https://neon.tech) porque tem
integração nativa com a Vercel.

### 1. Banco de dados (Neon)

Caminho mais simples — direto pelo dashboard da Vercel, sem copiar
connection string manualmente:

1. No projeto na Vercel, aba **Storage → Create Database → Neon**
   (ou **Integrations** se "Storage" não aparecer no seu plano).
2. Ao criar, a Vercel já injeta `DATABASE_URL` (a string **pooled**,
   com `-pooler` no hostname — a recomendada para funções serverless)
   automaticamente nas env vars do projeto (Production e Preview). Não
   precisa fazer mais nada neste passo.

Alternativa manual (se preferir criar o banco direto em
[neon.tech](https://neon.tech) e depois linkar): copie a **connection
string com `-pooler`** no hostname (ex:
`postgresql://user:pass@ep-xxx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require`)
em **Dashboard → Connection Details**, e cole manualmente como
`DATABASE_URL` no passo 3. A conexão sem `-pooler` não escala bem com
funções serverless.

### 2. Conectar o repositório na Vercel

Como o multi-tenant é resolvido pelo caminho da URL (não por
subdomínio), não é preciso domínio próprio nem DNS curinga — o deploy
padrão em `SEU_PROJETO.vercel.app` já funciona, com cada escritório em
`SEU_PROJETO.vercel.app/{slug}`. Se depois você quiser um domínio
próprio (ex: `pactum.app`), basta apontá-lo em **Project Settings →
Domains** — não precisa de wildcard (`*.pactum.app`).

1. Em [vercel.com](https://vercel.com), **Add New → Project**, escolha
   o repositório `Nariga33/Pactum` e a branch de deploy.
2. A Vercel detecta Next.js automaticamente. O script `build` do
   `package.json` já roda `prisma migrate deploy && next build`, então
   toda migration pendente é aplicada antes do build — não precisa
   mexer no "Build Command" nas configurações do projeto. Isso exige que
   `DATABASE_URL` esteja disponível no momento do build (não só em
   runtime), o que a integração Neon do passo 1 já garante.
3. Em **Project Settings → Environment Variables**, confirme/complete
   (Production e Preview):

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | já preenchida pela integração Neon (passo 1) — confirme que existe (é a string **pooled**, com `-pooler`, usada em runtime) |
   | `DATABASE_URL_UNPOOLED` | também preenchida pela integração Neon — confirme que existe. É a conexão **direta** (sem `-pooler`), usada só por `prisma migrate deploy`: o advisory lock da migration não funciona através do pooler (PgBouncer em modo transaction), e sem essa variável o build falha com `P1002` ("Timed out trying to acquire a postgres advisory lock") |
   | `AUTH_SECRET` | gere uma nova com `npx auth secret` — **não reuse a de dev** |
   | `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | opcional — de [dashboard.pusher.com](https://dashboard.pusher.com/) |
   | `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` | mesmos valores acima, expostos ao navegador |

   Não configure `AUTH_URL`/`NEXTAUTH_URL` — ver nota em `.env.example`.
4. Deploy. Cada push subsequente na branch conectada builda e migra o
   banco automaticamente.

### Depois do primeiro deploy

- Teste em `https://SEU_PROJETO.vercel.app/signup` e confirme que o
  redirecionamento cai em
  `https://SEU_PROJETO.vercel.app/escritorio-teste/login`.
- Fotos de perfil e arquivos anexados hoje são guardados como data URL
  no próprio Postgres (ver notas acima) — funciona em produção, mas vale
  migrar para um bucket de objetos (S3/Supabase Storage) antes de operar
  com volume real de documentos.

## Estrutura relevante

- `prisma/schema.prisma` — modelos de dados (tenant, usuários, canais,
  mensagens, tabelas do Auth.js)
- `src/proxy.ts` — resolve o tenant a partir do primeiro segmento da URL
  da requisição e roteia para `src/app/t/[tenant]/...`
- `src/lib/tenant.ts` — helpers de tenant por caminho (extração,
  validação, geração de paths com o slug do tenant)
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
