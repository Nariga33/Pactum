# Pactum

SaaS de comunicação interna nichado para escritórios de advocacia — cada
escritório (tenant) tem um workspace com login dedicado em seu próprio
subdomínio, no estilo do Slack, com espaço para arquivos e integração com
serviços como Google Drive/SharePoint.

## Status atual

- Cadastro de escritório (`Organization`) com subdomínio próprio
- Usuários (`User`) e vínculo com escritório via `Membership` (papéis
  OWNER/ADMIN/MEMBER)
- Login isolado por tenant (Auth.js/NextAuth, credenciais + bcrypt)
- Proxy (`src/proxy.ts`) que resolve o tenant a partir do subdomínio da
  requisição
- Chat estilo Slack: canais do escritório (criados automaticamente no
  cadastro: `# geral`, `# societário`, `# contencioso`) e mensagens
  diretas 1:1 entre membros do mesmo escritório, com mensagens em tempo
  real via Pusher Channels (opcional — sem chaves configuradas, as
  mensagens continuam persistindo e aparecem ao recarregar a página)
- Convite de novos membros (página **Equipe** no dashboard, visível a
  OWNER/ADMIN): gera um link de convite por e-mail — como ainda não há
  envio de e-mail automático, o link é mostrado na tela para ser
  compartilhado manualmente. Quem recebe o link define nome/senha em
  `/join/[token]` e entra automaticamente já nos canais públicos do
  escritório.

Ainda não implementado: integração de arquivos com Google
Drive/SharePoint, e envio automático do e-mail de convite (SMTP/Resend
etc. — hoje o link precisa ser copiado e enviado manualmente).

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
- `src/lib/actions/invitations.ts` + `src/app/t/[tenant]/dashboard/team`
  — gera/revoga convites (OWNER/ADMIN)
- `src/app/t/[tenant]/join/[token]` — página pública onde quem foi
  convidado define nome/senha e entra no workspace
