# STOKU

Gestionale multi-punto vendita per inventario ricambi auto usati, clienti, ordini e magazzini.

## Stack

- **Next.js 16** (App Router, React 19, RSC, Turbopack) + TypeScript strict
- **Supabase** (Postgres, Auth, Storage, RLS) — cloud project `ztchukszlebrkvnlscia`
- **Tailwind CSS v4** + **shadcn/ui** (preset `base-nova`, base color `neutral`)
- **pnpm** workspace, monorepo in `apps/*`

## Prerequisiti

| Tool         | Versione minima                            |
| ------------ | ------------------------------------------ |
| Node.js      | 20+                                        |
| pnpm         | 10+ (via `corepack enable`)                |
| Supabase CLI | 2.x (`brew install supabase/tap/supabase`) |
| gh CLI       | 2.x                                        |
| Vercel CLI   | 52+ (`npm i -g vercel`)                    |

## Setup locale

```bash
# 1. Clone
git clone git@github.com:ErjonGjyzeli/STOKU.git
cd STOKU

# 2. Installa dipendenze
pnpm install

# 3. Variabili d'ambiente
cp .env.example apps/web/.env.local
# Compila NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY da Supabase dashboard → Settings → API

# 4. Dev server
pnpm dev
# → http://localhost:3000
```

## Script (dalla root)

| Comando             | Descrizione                      |
| ------------------- | -------------------------------- |
| `pnpm dev`          | Dev server Next.js con Turbopack |
| `pnpm build`        | Build produzione                 |
| `pnpm start`        | Avvia build produzione           |
| `pnpm lint`         | ESLint su `apps/web`             |
| `pnpm typecheck`    | `tsc --noEmit` su `apps/web`     |
| `pnpm format`       | Prettier write                   |
| `pnpm format:check` | Prettier verify                  |

## Struttura

```
stoku/
├── apps/
│   └── web/              # Next.js App Router
├── supabase/             # migrations, seed, config (Fase 2)
├── .env.example
├── package.json          # workspace root
└── pnpm-workspace.yaml
```

## Convenzioni

- **Commit**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branch**: `main` protetta. Feature branch + PR.
- **Lingua UI**: `it` default, `sq` (albanese), `en`. Stringhe in `messages/{locale}.json`.
- **Lingua dati**: Albanese (nomi prodotti dall'Excel esistente).
- **Fuso/valuta**: `Europe/Tirane` / `EUR`. IVA default 20%.

## Roadmap

| Fase | Scope                                                                      | Stato          |
| ---- | -------------------------------------------------------------------------- | -------------- |
| F1   | Scaffold repo + Next.js 16 + pnpm workspace + Tailwind v4 + shadcn         | ✅ fatto       |
| F1   | Migrazioni DB (7) + RLS + helper `is_admin` / `has_store_access` + seed    | ✅ fatto       |
| F1   | Auth Supabase: client browser/server, proxy middleware, session helper     | ✅ fatto       |
| F1   | Login split-screen + signout route                                         | ✅ fatto       |
| F1   | Shell dashboard: sidebar dark, topbar, store switcher, placeholder pages   | ✅ fatto       |
| F1   | Admin CRUD `/settings/stores` + `/settings/users` con server actions       | ✅ fatto       |
| F1   | Design system STOKU (Inter + JetBrains Mono, token industriali, primitive) | ✅ fatto       |
| F1   | File messaggi i18n (it/sq/en) + `.vscode/settings.json`                    | ✅ fatto       |
| F1   | Workflow CI (`.github/workflows/ci.yml`)                                   | 🟡 PR separata |
| F1   | Provider `next-intl` wired + stringhe UI esternalizzate                    | ⬜ opzionale   |
| F1   | Store switcher cookie-based (server-side scoping)                          | ⬜ opzionale   |
| F1   | Primo utente admin creato su Supabase cloud                                | ⬜ dipende     |
| F1   | Deploy Vercel preview + smoke test login                                   | ⬜ dipende     |
| F2   | CRUD prodotti + categorie + foto + ricerca full-text + import Excel        | ⬜             |
| F3   | Veicoli + compatibilità prodotto↔veicolo + lookup                          | ⬜             |
| F4   | CRUD clienti + storico acquisti                                            | ⬜             |
| F5   | Order builder + trigger stock + PDF fattura + dati fiscali                 | ⬜             |
| F6   | Magazzino avanzato + trasferimenti + etichette QR                          | ⬜             |
| F7   | Dashboard + report + export                                                | ⬜             |
| F8   | Migrazione dati Excel (5.920 pezzi)                                        | ⬜             |
| F9   | i18n UAT, mobile, deploy produzione                                        | ⬜             |

Dettagli completi in [`CLAUDE.md`](./CLAUDE.md). PR F1: [#1](https://github.com/ErjonGjyzeli/STOKU/pull/1).
