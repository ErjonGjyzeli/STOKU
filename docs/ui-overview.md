# STOKU — Panoramica UI per revisione grafica

Documento di riferimento per chiunque voglia riprogettare o migliorare la grafica di STOKU.
Descrive struttura, navigazione, funzionalità per pagina e indicazioni per il redesign.

---

## 1. Struttura shell

```
┌─────────────────────────────────────────────────┐
│  TOPBAR (48px h, sticky)                        │
├──────────┬──────────────────────────────────────┤
│          │  CONTENT AREA (scroll verticale)     │
│ SIDEBAR  │  ┌──────────────────────────────┐    │
│ (216px)  │  │  PageHeader                  │    │
│          │  ├──────────────────────────────┤    │
│          │  │  Corpo pagina                │    │
│          │  └──────────────────────────────┘    │
└──────────┴──────────────────────────────────────┘
```

- **Sidebar** collassabile a 56px (solo icone) via hamburger in topbar.
- **Mobile** (≤768px): sidebar è un drawer overlay con backdrop.
- Solo modalità light. Dark mode non implementata.

---

## 2. Topbar

Altezza fissa 48px. Elementi da sinistra a destra:

| Elemento | Dettaglio |
|---|---|
| **Hamburger** | Toggle collapse/open sidebar |
| **StoreSwitcher** | Dropdown per cambiare punto vendita attivo (scope dati) |
| **Divisore verticale** | Separatore visivo |
| **Barra ricerca** | 220px fissa, readOnly — al click apre `SearchModal` |

### SearchModal (overlay globale)

Modale full-screen che si apre dalla barra ricerca. Cerca in tempo reale su:
- Prodotti (SKU, nome, marca)
- Pneumatici (misura, marca, modello)
- Ordini (numero ordine)
- Clienti (nome, codice, email)
- Trasferimenti (numero)
- Utenti staff
- Scaffali (codice)
- Punti vendita (codice, nome)

Ogni risultato mostra tipo con badge colorato + link diretto alla pagina.

---

## 3. Sidebar

### Sezione "Lavoro" (tutti i ruoli che hanno accesso)

| Voce | Icona | Ruoli | Badge count |
|---|---|---|---|
| **Dashboard** | dashboard | tutti | — |
| **Scanner** | scanner | tutti | — |
| **Prodotti** | box | tutti | ✓ n. prodotti attivi |
| **Pneumatici** | disc | tutti | — |
| **Ordini** | cart | tutti | ✓ n. ordini aperti |
| **Clienti** | users | tutti | ✓ n. clienti |
| **Trasferimenti** | transfer | admin, warehouse | ✓ n. trasferimenti aperti |
| **Report** | history | tutti | — |

### Sezione "Impostazioni"

| Voce | Icona | Ruoli |
|---|---|---|
| **Punti vendita** | store | admin |
| **Magazzino** | building | admin, warehouse |
| **Scaffali** | shelves | admin, warehouse |
| **Etichette** | tag | admin, warehouse |
| **Utenti** | users | admin |
| **Azienda** | building | admin |

### Footer sidebar

Avatar circolare con iniziali + nome completo + ruolo + pulsante logout.

---

## 4. Pagine — descrizione per scheda

### 4.1 Dashboard (`/`)

KPI in griglia 5 colonne:
- Ordini oggi
- Fatturato MTD (mese corrente)
- Stock basso (clic → lista prodotti sotto soglia)
- Prodotti attivi
- Pneumatici attivi

Sezione principale 2 colonne:
- **Sinistra**: tabella ultimi 8 ordini (numero, cliente, store, status badge, totale, tempo relativo)
- **Destra** (sidebar): lista top stock basso + lista trasferimenti aperti (draft/in_transit)

Feed attività recente in fondo: movimenti stock con icona, chi ha fatto cosa, prodotto, store, timestamp relativo.

Tutti i dati filtrano per punto vendita attivo (StoreSwitcher) se l'utente non ha scope globale.

---

### 4.2 Scanner (`/scanner`)

Pagina dedicata alla scansione barcode/QR continua via fotocamera o lettore USB. Permette scansioni multiple in sequenza senza ricaricare. Uso principale: controllo stock scaffale, identificazione rapida prodotto.

---

### 4.3 Prodotti (`/products`)

Lista prodotti con filtri:
- Ricerca full-text (q)
- Filtro categoria
- Filtro stato (attivo/disattivato)
- Paginazione 25 per pagina

Tabella colonne: foto thumbnail 36×36 · SKU · Nome/marca · Categoria · Prezzo vendita · Stock disponibile · Link etichetta

Azioni per riga: modifica (dialog), foto (upload).

**Dettaglio prodotto** (`/products/[id]`):
- Dati completi, foto, stock per PdV/scaffale, cronologia movimenti.

**Import Excel** (`/products/import`):
- Upload CSV/Excel per caricare in blocco prodotti dall'archivio.

---

### 4.4 Pneumatici (`/tires`)

Vista specializzata sui prodotti di categoria "gomma". Filtri dedicati:
- Ricerca testuale
- Misura (larghezza / spalla / diametro)
- Stagione (estive / invernali / 4 stagioni)
- Battistrada minimo (mm)
- DOT (anno massimo)
- Set4 (≥4 pezzi disponibili)

Tabella colonne: foto · SKU · Misura+indici · Marca/Modello · DOT · Battistrada · Prezzo · Disponibilità + badge RFT/XL

Link etichetta per riga (formato termica).

---

### 4.5 Ordini (`/orders`)

Lista ordini con filtri: ricerca, status, range date, punto vendita.

Status ordine:
- `draft` → `confirmed` → `paid` → `shipped` → `completed`
- `cancelled` (terminale)

**Nuovo ordine** (`/orders/new`): form con selezione cliente (opzionale), PdV, prodotti con quantità e prezzo, note.

**Dettaglio ordine** (`/orders/[id]`):
- Header con numero, data, status con badge, totale
- Tabella righe (prodotto, quantità, prezzo unitario, subtotale)
- Pulsanti: modifica status, stampa fattura PDF

**Fattura PDF** (`/orders/[id]/invoice-pdf.tsx`): layout A4 con dati azienda, cliente, righe, totale IVA.

---

### 4.6 Clienti (`/customers`)

Lista clienti con ricerca e filtro tipo (privato / azienda).

Tabella: codice · nome/email · tipo badge · telefono · città · NIPT/P.IVA · azioni

**Dettaglio cliente** (`/customers/[id]`):
- Dati anagrafici completi
- Storico ordini del cliente

---

### 4.7 Trasferimenti (`/transfers`)

Spostamento stock tra punti vendita.

Status:
- `draft` → `in_transit` → `completed`
- `cancelled` (terminale)

Filtri: status, origine (PdV), destinazione (PdV).

Tabella: data · numero · status badge · Origine → Destinazione (codici PdV) · data spedizione · data ricezione · note

**Dettaglio trasferimento** (`/transfers/[id]`):
- Header con numero, status, PdV coinvolti
- Tabella righe prodotto con quantità
- Azioni: cambia status, aggiungi righe (se draft)

---

### 4.8 Report (`/reports`)

3 tab navigabili:

| Tab | Contenuto | Filtro data |
|---|---|---|
| **Vendite** | Tabella ordini con totali aggregati per periodo | DA / A (date picker) |
| **Inventario** | Snapshot stock corrente per prodotto/scaffale | nessuno (sempre attuale) |
| **Movimenti** | Log movimenti stock (sale, intake, adjustment, transfer, etc.) | DA / A (date picker) |

Filtro PdV su tutte le tab. Export CSV disponibile.

---

### 4.9 Magazzino (`/stock`) — Impostazioni

Vista consolidata stock per prodotto e scaffale. Filtri:
- Ricerca prodotto
- Filtro PdV
- Flag `low=1` → mostra solo prodotti sotto soglia minima

Tabella: prodotto · SKU · scaffale · PdV · quantità · riservata · disponibile · soglia · indicatore low-stock

---

### 4.10 Scaffali (`/shelves`) — Impostazioni

Gestione scaffali fisici nei magazzini.

Tipi scaffale: `open` · `cabinet` · `drawer` · `floor`

Lista scaffali con filtro PdV. Tabella: codice · tipo badge · PdV · capacità · riempimento % · prodotti unici.

**Dettaglio scaffale** (`/shelves/[id]`):
- Stat cards: prodotti unici · pezzi totali · riservati · capacità · riempimento %
- Tabella prodotti con foto · SKU · nome · quantità · riservata · disponibile
- Azioni header: lista | sposta (futuro) | etichetta termica | etichetta A4 | inventario fisico

**Inventario fisico scaffale** (`/shelves/[id]/inventory`):
- Conta manuale pezzi presenti
- Confronto logico vs fisico
- Applica rettifica al database (solo admin/warehouse)

---

### 4.11 Etichette (`/labels`) — Impostazioni

Generazione batch di etichette PDF:
- Formato A4 (24 etichette per foglio, layout 3×8)
- Formato termica (singola 80×50mm, Brother QL / Zebra ZD)
- Tipi supportati: prodotti, pneumatici, scaffali

Selezione multipla con checkbox. Anteprima count prima di generare.

---

### 4.12 Impostazioni — Punti vendita (`/settings/stores`)

CRUD punti vendita: nome, codice, indirizzo, attivo/disattivato.

---

### 4.13 Impostazioni — Utenti (`/settings/users`)

Gestione staff: email, nome, ruolo (`admin` / `sales` / `warehouse` / `viewer`), PdV associati.

---

### 4.14 Impostazioni — Azienda (`/settings/company`)

Dati fiscali usati nelle fatture PDF: ragione sociale, NIPT/P.IVA, indirizzo, IBAN, logo, footer personalizzato.

---

## 5. Design tokens attuali

### Colori

| Token | Valore | Uso |
|---|---|---|
| `--stoku-accent` | `oklch(0.58 0.14 45)` | Arancione-ambra — primary brand, active item, outline focus |
| `--stoku-accent-bg` | `oklch(0.96 0.03 60)` | Background tenue accent |
| `--bg` | `#fafaf9` | Background pagina |
| `--panel` | `#ffffff` | Card / Panel |
| `--panel-2` | `#f5f5f4` | Surface rialzata (thead, input bg) |
| `--panel-sunken` | `#f0efed` | Surface incassata |
| `--stoku-border` | `oklch(0.92 0.004 80)` | Bordo default |
| `--border-strong` | `oklch(0.84 0.005 80)` | Bordo enfatizzato |
| `--ink` | `oklch(0.2 0.01 80)` | Testo principale |
| `--ink-2` | `oklch(0.35 0.008 80)` | Testo secondario |
| `--ink-3` | `oklch(0.52 0.006 80)` | Meta / label |
| `--ink-4` | `oklch(0.68 0.004 80)` | Placeholder / faint |
| `--sbar` | `oklch(0.22 0.008 80)` | Sidebar background (quasi-nero) |
| `--sbar-2` | `oklch(0.27 0.009 80)` | Sidebar item active bg |
| `--ok` | `oklch(0.62 0.11 150)` | Verde — completato / disponibile |
| `--warn` | `oklch(0.72 0.14 75)` | Giallo — attenzione / low stock |
| `--danger` | `oklch(0.58 0.18 28)` | Rosso — errore / annullato |
| `--info` | `oklch(0.6 0.1 240)` | Blu — info / in transito |

### Tipografia

| Token | Valore | Uso |
|---|---|---|
| `--fs-xs` | 11px | Badge, label colonna, meta info |
| `--fs-sm` | 12px | Tabelle, testo secondario |
| `--fs-base` | 13px | Testo body generale |
| `--fs-md` | 14px | Intestazioni panel |
| `--fs-lg` | 16px | — |
| `--fs-xl` | 20px | Stat card numero |
| `--fs-2xl` | 26px | — |
| Font sans | Inter | Body, UI |
| Font mono | JetBrains Mono | Codici, numeri, SKU |

### Layout

| Token | Valore |
|---|---|
| `--sb-w` | 216px (sidebar espansa) |
| `--top-h` | 48px (topbar) |
| `--r-sm` | 4px |
| `--r-md` | 6px |
| `--r-lg` | 8px |

---

## 6. Componenti UI principali

| Componente | Descrizione |
|---|---|
| `PageHeader` | Header pagina sticky con titolo, subtitle, breadcrumb opzionale, slot right per azioni |
| `Panel` | Card container con bordo e sfondo; `padded` per spaziatura interna; `title` per intestazione |
| `StokuBadge` | Pill colorata per status/tipo; varianti: `default`, `ok`, `warn`, `danger`, `info`, `draft`, `accent` |
| `StokuButton` | Button primario/ghost/danger con icona opzionale |
| `Empty` | Stato vuoto con icona, titolo, subtitle, azione opzionale |
| `Icon` | Set icone custom (SVG inline); dimensione variabile |
| `.tbl` | Classe tabella con thead sticky, righe hover, border-collapse separate |
| `.stoku-input` | Input/select styled con bordo e focus ring accent |
| `.btn` | Button base; varianti `.primary`, `.ghost`, `.danger`; size `.sm` |

---

## 7. Indicazioni per redesign grafico

### Obiettivo
STOKU è un gestionale B2B ad alta densità informativa usato in magazzini/negozi di ricambi auto usati. Priorità: **leggibilità rapida, densità, affidabilità visiva**. Non un e-commerce, non un consumer app.

### Punti da migliorare (priorità alta)

1. **Sidebar**: attualmente usa quasi-nero (`oklch(0.22)`) con accent arancione. Valutare se un grigio scuro più caldo o un navy lavori meglio. L'item attivo ha solo bg leggermente più chiaro + indicatore sinistro 2px — potrebbe essere più definito.

2. **PageHeader**: titolo + subtitle sono su sfondo bianco panel con bordo bottom. Il contrasto visivo con il contenuto sottostante è basso. Considerare background leggermente distinto o box shadow.

3. **Stat card (dashboard)**: numeri KPI a 22px mono. Valutare gerarchia più forte tra label (11px uppercase) e valore, con più stacco verticale.

4. **Badge status**: forme arrotondate pill su fondo tenue. Funzionali ma piatte. Un border sottile matching al colore testo darebbe più presenza senza aggiungere rumore.

5. **Tabelle**: thead a 11px uppercase su `--panel-2` funziona bene. Considerare row divider più sottile (attuale `1px oklch(0.92)`) e hover state leggermente più saturo.

6. **Focus/outline**: ring accent arancione su input. Coerente ma spesso sorprende su sfondo bianco — valutare `box-shadow` con spread invece di `outline` per morbidezza.

7. **Topbar**: completamente piatta, nessuna elevazione. Un `box-shadow: 0 1px 0 var(--stoku-border)` (già presente il bordo) è sufficiente. Valutare se lo store switcher merita più prominenza visiva.

8. **Mobile (≤768px)**: drawer sidebar funziona. Padding pagina si riduce a 12px. Tabelle scrollano orizzontalmente. I pulsanti azione nelle intestazioni pagina si impilano male su schermi stretti — serve un layout verticale esplicito per `.page-header-right` mobile.

9. **Empty states**: placeholder con icona centrata funzionano. Aggiungere un'illustrazione leggera (SVG monocromatica) per gli stati vuoti principali (nessun ordine, nessun prodotto) renderebbe l'onboarding più accogliente.

10. **Tipografia**: Inter funziona bene. Valutare se per i titoli pagina (`--fs-2xl` / `--fs-xl`) serva un peso 700 più definito.

### Vincoli da rispettare

- **Dark mode non esiste** — ogni proposta deve funzionare solo su light.
- **Sidebar sempre scura** — è un design intenzionale (contrasto con contenuto chiaro).
- **Accent arancione `oklch(0.58 0.14 45)`** — colore brand, non cambiare hue drasticamente.
- **Font mono JetBrains** per tutti i valori numerici, codici SKU, numeri ordine — rimane.
- **Densità alta** — nessun aumento di padding/gap che spinga contenuto fuori viewport.
- **CSS custom properties** — qualsiasi token colore/spazio deve passare per le variabili già definite in `globals.css`, non valori hardcoded.

### Cosa NON cambiare

- Struttura shell (sidebar + topbar + content) — layout funziona bene.
- Logica badge status — i colori semantici (verde=ok, rosso=danger, giallo=warn, blu=info) sono coerenti in tutta l'app.
- Dimensioni font tabella (11–12px) — già ottimizzate per densità.
