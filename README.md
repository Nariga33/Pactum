# Pactum

SaaS de comunicação interna nichado para escritórios de advocacia — cada
escritório (tenant) tem um workspace com login dedicado em seu próprio
subdomínio, no estilo do Slack, com espaço para arquivos e integração com
serviços como Google Drive/SharePoint.

## Status atual

Esta é a **fundação** do produto:

- Cadastro de escritório (`Organization`) com subdomínio próprio
- Usuários (`User`) e vínculo com escritório via `Membership` (papéis
  OWNER/ADMIN/MEMBER)
- Login isolado por tenant (Auth.js/NextAuth, credenciais + bcrypt)
- Middleware que resolve o tenant a partir do subdomínio da requisição
- Dashboard autenticado (placeholder) com espaço reservado para canais,
  mensagens e arquivos

Chat em tempo real e integração com Drive/SharePoint ainda não foram
implementados — ficam para as próximas etapas.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Auth.js (NextAuth v5)](https://authjs.dev), provedor de credenciais

## Como rodar localmente

### 1. Banco de dados

Suba um Postgres local (ou use um serviço gerenciado) e configure a
variável `DATABASE_URL` em um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
# edite DATABASE_URL, AUTH_SECRET, etc.
```

Gere um `AUTH_SECRET` com `npx auth secret` ou `openssl rand -base64 32`.

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
- `src/middleware.ts` — resolve o subdomínio da requisição e roteia
  para `src/app/t/[tenant]/...`
- `src/lib/tenant.ts` — helpers de subdomínio (extração, validação,
  geração de URLs de tenant)
- `src/auth.ts` — configuração do Auth.js (login por credenciais,
  escopado por tenant)
- `src/app/signup` — cadastro de escritório + primeiro usuário (owner)
- `src/app/t/[tenant]` — páginas do workspace (login, dashboard)
