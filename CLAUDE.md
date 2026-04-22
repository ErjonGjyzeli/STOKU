# STOKU — Contesto progetto per Claude Code

Gestionale multi-punto vendita per ricambi auto usati, clienti, ordini, magazzini.
Sostituisce un Excel di ~5.920 pezzi (centraline ABS + utensili officina) in albanese.

---

## Stack bloccato

| Area            | Scelta                                               |
| --------------- | ---------------------------------------------------- |
| Framework       | Next.js 16 App Router + TypeScript strict + RSC      |
| DB/Auth/Storage | Supabase cloud (project ref: `ztchukszlebrkvnlscia`) |
| UI              | Tailwind v4 + shadcn/ui (`base-nova`, `neutral`)     |
| Form            | react-hook-form + zod                                |
| Tabelle         | TanStack Table v8                                    |
| Server state    | TanStack Query v5                                    |
| i18n            | next-intl (IT default, SQ albanese, EN)              |
| Test            | Vitest (unit) + Playwright (E2E)                     |
| Linting         | ESLint + Prettier standard Next.js                   |
| Package manager | pnpm workspace                                       |

## Decisioni già prese (non ridiscutere)

- Nome progetto/repo: `STOKU`
- Lingua dati: albanese (nomi pezzi come nell'Excel)
- Fuso default: `Europe/Tirane`, valuta `EUR`, IVA 20%
- Ruoli staff: `admin`, `sales`, `warehouse`, `viewer`
- Commit: Conventional Commits
- Branch: `main` protetta + PR
- CI: GitHub Actions (lint + typecheck + build su PR)
- Deploy: Vercel (preview per PR, prod su `main`)

## Domande aperte (chiedere, non inventare)

1. Quanti punti vendita al lancio? (seed default: `TIR01`, `DUR01`)
2. Punto vendita = magazzino centrale o negozio? (default: `mixed`)
3. Prezzi uguali in tutti i PV? (default: sì)
4. Dati fiscali azienda emittente fatture (ragione sociale, NIPT, indirizzo, logo) — F5+
5. Credenziali primo utente admin (email + password)

---

## Guardrail comportamentali (obbligatori)

1. **No assunzioni silenziose.** Scelte architetturali → una riga in chat su cosa/perché prima di agire. Opzioni equivalenti → chiedi.
2. **Un task alla volta.** Una PR = una cosa. Niente collateral edits.
3. **Leggere prima di scrivere.** View file intero prima di modificarlo. Controlla convenzioni esistenti prima di aggiungere file simili.
4. **Niente cleanup opportunistici** su codice fuori scope.
5. **Niente dipendenze nuove senza motivo.** Se aggiungi npm pkg, giustifica in commit con alternativa considerata.
6. **Commit piccoli e parlanti.** Revertabile senza rompere altro.
7. **TypeScript strict = legge.** No `any`, no `@ts-ignore` senza commento.
8. **Errori visibili.** No eccezioni ingoiate. Log strutturati, messaggi utente chiari.
9. **Server/client boundary.** Service role key MAI in client. Dubbio → chiedi.
10. **Test dopo feature, non al posto.** F1 basta scaffolding test.

## Convenzioni

### File layout

```
apps/web/
├── app/                  # routes App Router
│   ├── (auth)/
│   └── (dashboard)/
├── components/
│   ├── ui/               # shadcn
│   ├── auth/
│   └── layout/
├── lib/
│   ├── supabase/         # client / server / middleware / types
│   └── context/
└── messages/             # i18n JSON per locale
```

### Supabase

- Migration file: `supabase/migrations/<timestamp>_<name>.sql`
- Tipi TS generati: `pnpm gen:types` → `apps/web/lib/supabase/types.ts`
- RLS sempre abilitata su ogni tabella con dati business
- Service role key solo in Server Actions / Route Handlers

### Naming

- Componenti React: `PascalCase`
- Hook: `useCamelCase`
- Server Actions: `verbNoun` (es. `createUser`, `updateStore`)
- Tabelle SQL: `snake_case` plurale (`products`, `order_items`)
- Colonne SQL: `snake_case` singolare (`product_id`, `created_at`)

---

## Roadmap

| Fase   | Scope                                                         | Stima  |
| ------ | ------------------------------------------------------------- | ------ |
| **F1** | Fondamenta: scaffold, auth, layout, staff, stores, migrazioni | 3-4 gg |
| F2     | CRUD prodotti + categorie + foto + full-text + import Excel   | 4-5 gg |
| F3     | Veicoli + compatibilità + lookup per veicolo                  | 2-3 gg |
| F4     | CRUD clienti + cronologia acquisti                            | 2 gg   |
| F5     | Order builder + trigger stock + PDF fattura + dati fiscali    | 4-5 gg |
| F6     | Trasferimenti + etichette QR                                  | 2-3 gg |
| F7     | Dashboard + report + export                                   | 2 gg   |
| F8     | Migrazione dati Excel                                         | 2-3 gg |
| F9     | i18n, mobile, UAT, deploy prod                                | 3-4 gg |

---

## Schema database (F1)

Migrazioni in ordine fisso:

- `00000000000000_extensions.sql` — pg_trgm, unaccent, pgcrypto
- `00000000000001_core_tables.sql` — staff_profiles, customers, vehicles, products, images, compatibility
- `00000000000002_stores_and_stock.sql` — stores, stock, staff_store_access
- `00000000000003_orders_and_transfers.sql` — orders, order_items, transfers, inventory_movements
- `00000000000004_triggers.sql` — reserve_stock, status transitions, totali ordine
- `00000000000005_views.sql` — v_product_stock_total
- `00000000000006_rls.sql` — policies + helper `is_admin()`, `has_store_access()`

Dettagli completi nel prompt di progetto.

---

## Come lavorare

- Un commit per passo logico
- Fine passo → riassunto 3 righe + chiedi conferma
- Scelte non documentate non banali → 2 opzioni con pro/contro, aspetta
- Domanda aperta blocca passo → fermati, chiedi
- Fine fase → PR `feat: <scope> (F<n>)` per review
