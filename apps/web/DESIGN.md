# STOKU — Design tokens & convenzioni UI

Tutto il design system è guidato dalle custom properties in
`apps/web/app/globals.css` (sezione `:root`). Questo file è la mappa di
riferimento da rispettare per mantenere densità e coerenza tra tutte le
schermate.

## Type scale

| Token      | Valore | Uso                                                 |
| ---------- | ------ | --------------------------------------------------- |
| `--fs-xs`  | 11px   | Meta, label uppercase, hint piccoli                 |
| `--fs-sm`  | 12px   | Secondari, badge, riferimenti                       |
| `--fs-base`| 13px   | **Default** testo, input, select, tabelle, bottoni  |
| `--fs-md`  | 14px   | Heading compatti                                    |
| `--fs-lg`  | 16px   | Titoli di sezione, prezzi evidenti                  |
| `--fs-xl`  | 20px   | Heading pagina (`PageHeader title`)                 |
| `--fs-2xl` | 26px   | KPI tile value                                      |

**Regola**: non inventare `fontSize: 15` o simili. Se serve un tier in
più, aggiungi la var qui e usala ovunque.

## Density

| Token           | Valore | Uso                                           |
| --------------- | ------ | --------------------------------------------- |
| `--row-h`       | 32px   | **Default** altezza input, select, bottoni, pick list |
| `--row-h-comfy` | 44px   | Form primari lunghi (contatti, fatturazione)  |
| `--row-h-card`  | 64px   | Card tile con doppia riga (KPI)               |
| `--top-h`       | 48px   | Topbar                                        |
| `--sb-w`        | 216px  | Sidebar espansa                               |

Gap standard (flex/grid): `4` (inline tight), `8` (inline), `12` (stat
tile grid), `16` (panel grid).

Padding pagina (`.stoku-content > [page]`): **24px**. Sotto 520px il
content font-size scende a 13px ma il padding resta.

## Colori

Palette neutra stone/slate, accent ambra.

| Token            | Scopo                               |
| ---------------- | ----------------------------------- |
| `--ink`          | Testo primario                      |
| `--ink-2`        | Secondario                          |
| `--ink-3`        | Terziario / meta                    |
| `--ink-4`        | Faint / disabled                    |
| `--stoku-accent` | Highlight azioni primarie (amber)   |
| `--ok/warn/danger/info` | Status semantic (+ `-bg` weak) |

Dark sidebar: `--sbar`, `--sbar-2`, `--sbar-ink`, `--sbar-ink-dim`.

## Radii

| Token   | Valore | Uso                              |
| ------- | ------ | -------------------------------- |
| `--r-sm`| 4px    | Chips, kbd                       |
| `--r-md`| 6px    | **Default** input, button, badge |
| `--r-lg`| 8px    | Panel, card, dialog              |

## Componenti — regole

### Input / Select / Textarea

- Altezza: **32px** (usa `.stoku-input` o la `Input` shadcn già size-dense).
- Font-size: **13px**.
- Padding orizzontale: 10px.
- Border: `1px solid var(--stoku-border)`, focus `--stoku-accent`.
- Textarea: `minHeight: 72`, font-size 13, padding 8.
- Label: 11px uppercase tracking 0.05em color `--ink-3`, margin-bottom 4.

### Button

- Altezza default 28px (sm) o 32px. Dense bar/topbar: 28. Dialog primario: 32.
- Font 13px. Padding 10px. Gap 8 con icona.
- Variant primary = fondo `--stoku-accent`, ink `--stoku-accent-fg`.

### Panel

- `border-radius: var(--r-lg)`. `padded=true` → 14px. `padded=false` →
  usato per tabelle; il wrapper interno ha `overflow-x: auto` per scroll
  su viewport stretti.
- Header panel: fontSize 12, uppercase tracking 0.05em, color `--ink-3`.

### Tabella (.tbl)

- Font-size 12 header uppercase / 13 body.
- Row height min 32.
- Border-bottom `--stoku-border`.
- Colonna azioni: bottoni 24×24 ghost sm.

### Dialog (shadcn)

- Max width tipicamente `sm:max-w-lg` (form standard) o `sm:max-w-xl` /
  `sm:max-w-2xl` per form con molti campi o foto.
- Gap interno `gap: 14–16`.
- Sezioni complesse suddivise in **Panel** (es. Azienda: Anagrafica / Sede /
  Bancario / Fatturazione).

## Form density — scelta per contesto

**Form dense** (default: stores, users, products, customers, orders,
trasferimenti): tutti i campi 32px, gap 12px tra gruppi, inline Label
sopra Input.

**Form comfy** (settings lunghe come `/settings/company`): Input 32px
(stessa altezza), ma gap interni 10px e panel separati per anagrafica
/ sede / bancario / fatturazione. Non si inventano Input da 40px.

## Responsive breakpoint

| BP         | Cambio principale                                       |
| ---------- | ------------------------------------------------------- |
| ≤ 900px    | `grid-kpi-4` 4→2, `grid-main-aside`/`grid-side` stack    |
| ≤ 860px    | Login: aside nascosto, form full-width                   |
| ≤ 768px    | Sidebar diventa drawer off-canvas                        |
| ≤ 640px    | Topbar nasconde "Nuovo ordine" label + campanella        |
| ≤ 520px    | Stat tiles 1 col, `.stoku-content` font-size 13          |

## Convenzioni quando si aggiunge UI

1. **Mai `fontSize` hardcoded** in numero: usa `var(--fs-*)` o un valore
   dalla tabella sopra con commento giustificativo.
2. Input/select/button hanno **sempre** la stessa altezza base (32px)
   nella stessa pagina. Non alternare 28/32/36 senza motivo.
3. Se serve un layout a griglia, prima prova le utility
   (`grid-kpi-4`/`grid-main-aside`/`grid-side`/`grid-pair`/`grid-triple`)
   che sono già responsive.
4. Non introdurre classi Tailwind arbitrarie per override del tema
   (es. `text-[15px]`): se manca un token, allarga il set qui.
