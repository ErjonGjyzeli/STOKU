# Stoku — Documento Funzionale v1.2 (30/04/2026)

> Spec di riferimento per analisi gap. Originale fornito dal titolare il 30/04/2026.

## Cambiamenti chiave v1.2 vs v1.1
- Sezione "Scansione QR" molto ampliata: scanner continuo, USB-HID, fotocamera nativa
- Workflow `/p/<sku>` e `/s/<codice-scaffale>` come URL target dei QR

## Cambiamenti v1.1 vs v1.0
- Nuova sezione **§7.bis Scaffali e collocazione fisica**
- Doppio QR (prodotto + scaffale)
- Movimento `internal_move` (spostamento tra scaffali stesso PV)

---

## Mappa funzionale (sezioni app)

### 3.1 Dashboard
- Valore magazzino, ordini in bozza, sottoscorta, fatturato mese vs precedente, top-5 clienti 90gg
- Selettore "tutti PV / solo PV attivo"

### 3.2 Prodotti
- Lista con scroll virtuale (50k+ righe), filtri (categoria, condizione, disponibilità)
- Form dinamico per categoria (kind: ricambio | gomma | cerchio | batteria | utensile | generico)
- Foto multiple, prezzo costo + vendita, condizione, posizione fisica per PV
- Scheda dettaglio: galleria, attributi tecnici, distribuzione stock per PV, log movimenti, "Stampa etichetta QR"
- Importazione massiva Excel/CSV

### 3.3 Pneumatici (vista filtrata)
- Filtri specifici: misura (LARG/SPALLA R DIAM), stagione, marca, indice velocità, battistrada min, DOT max, "solo set di 4"

### 3.4 Clienti
- CRUD privati + aziende, P.IVA/CF, indirizzo
- Cronologia acquisti con totali, filtro periodo
- Ricerca rapida nome/telefono/P.IVA

### 3.5 Ordini
- Lista con filtri (stato, PV, periodo, cliente)
- **Costruttore ordine** (cassa-style): ricerca prodotto (anche scanner barcode), carrello, sconti, totali live
- Selezione/creazione cliente al volo
- Conferma → scala stock + genera PDF fattura

### 3.6 Trasferimenti (tra PV)
- Stati: bozza → in transito → completato
- Bolla PDF accompagnamento
- Differenza spedito/ricevuto = perdita tracciabile

### 3.7 Magazzino (sotto-area, 4 viste)
- **Scaffali**: CRUD scaffali per PV con codifica gerarchica `PV-AREA-SCAFFALE-RIPIANO-BOX` (livelli opzionali); stato attivo/disattivo, tipo (aperto/armadio/cassettiera/pavimento), capacità approssimativa
- **Movimenti**: log immutabile (vendita, reso, rettifica, transfer PV, internal_move, danno); filtri per prodotto, PV, scaffale, data, causale
- **Etichette**: generatore PDF con griglie A4 (24 etichette 70×33,8 mm) o singole termiche (Brother QL); tipi: prodotto + scaffale; filtri di stampa (solo nuovi, solo non stampati)
- **Inventario fisico**: conteggio per scaffale, confronto logico vs reale, rettifica tracciata

### 3.8 Inventario fisico
Dipende da 3.7. Conta scaffale per scaffale.

### 3.9 Report
- Valore magazzino per PV/categoria
- Rotazione (top venduti, mai venduti, ultimi 30/90/365 gg)
- Margini (costo vs vendita)
- Fatturato (per giorno/settimana/mese, venditore, cliente, PV)
- Export CSV/Excel

### 3.10 Impostazioni (admin only)
- Utenti (ruoli + accesso PV)
- Punti vendita
- Categorie prodotto
- Dati azienda (rag.soc., P.IVA, indirizzo, logo, IBAN)
- Tasse (IVA 20%, EUR, formato numero fattura)
- Numerazioni (prefissi ordini/trasferimenti/codici cliente)

### 3.11 Profilo personale
Cambio password, lingua, PV default

---

## Modello dati (entità chiave)

| Entità | Note |
|---|---|
| Prodotto | Codice univoco SKU, kind = categoria.kind |
| Categoria | Piatta, no gerarchie, slug + kind |
| Foto prodotto | Multiple |
| Punto vendita | Sede fisica con stock |
| **Scaffale** | Collocazione fisica in PV, codice gerarchico, descrizione, tipo, capacità, attivo |
| Stock | (Prodotto × PV) + scaffale assegnato + qtà totale + qtà riservata |
| Cliente | Persona/azienda |
| Ordine | con righe |
| Riga ordine | snapshot prodotto al momento vendita |
| **Trasferimento (tra PV)** | bozza/in transito/completato |
| **Spostamento interno** | cambio scaffale stesso PV |
| Movimento magazzino | log immutabile, causali: vendita/reso/rettifica/intake/transfer/internal_move/danno |
| Utente / staff_profile | ruolo + accesso PV |

### Concetti chiave
1. **Stock con riserva** = totale - riservata = disponibilità
2. **Snapshot in fattura** = nome/codice/attributi congelati su riga ordine alla conferma
3. **Log movimenti immutabile** = no update/delete, correzioni via movimento opposto
4. **Un prodotto, un solo scaffale per PV** (semplicità). Stesso prodotto in PV diversi → collocazioni diverse

---

## Ruoli & permessi

| Azione | Admin | Magazziniere | Venditore | Viewer |
|---|---|---|---|---|
| Login | ✓ | ✓ | ✓ | ✓ |
| Vedere prodotti catalogo | ✓ | ✓ | ✓ | ✓ |
| Creare/modificare prodotti | ✓ | ✓ | ✓ | – |
| Vedere stock PV | ✓ | solo PV abilitati | solo PV abilitati | solo PV abilitati |
| Modificare stock | ✓ | solo PV abilitati | – | – |
| **CRUD scaffali** | ✓ | solo PV abilitati | – | – |
| **Spostare prodotti tra scaffali** | ✓ | solo PV abilitati | – | – |
| **Stampare etichette scaffale** | ✓ | solo PV abilitati | – | – |
| Creare/conferma ordini | ✓ | – | solo PV abilitati | – |
| Vedere fatture | ✓ | solo PV abilitati | solo PV abilitati | solo PV abilitati |
| Creare/modificare clienti | ✓ | ✓ | ✓ | – |
| Trasferimenti tra PV | ✓ | solo PV abilitati | – | – |
| Stampare etichette QR | ✓ | solo PV abilitati | – | – |
| Vedere report | ✓ | limitati | limitati | limitati |
| Gestione utenti / PV / azienda | ✓ | – | – | – |
| Export CSV/Excel | ✓ | ✓ | ✓ | ✓ |

I permessi sono **anche a livello DB via RLS**.

---

## Multi-PV: regole

Globale: catalogo, clienti, categorie, utenti, dati fiscali.
Per PV: stock, **scaffali**, soglia scorta minima, prefisso fatture (opzionale).

Selettore PV attivo in topbar (cookie persistente, mostra solo PV abilitati). Determina default per liste, nuovi ordini, operazioni magazzino.

Vista globale stock: la scheda prodotto mostra **dove** in tutta l'azienda + scaffale per ogni PV + pulsante "Avvia trasferimento".

---

## §7.bis SCAFFALI (cuore della v1.1+)

### Codifica gerarchica
```
TIR-A-12-3
 |  | |  |
 |  | |  +— Box/cassetto (opzionale)
 |  | +———— Ripiano (opzionale)
 |  +—————— Scaffale
 +————————— Area/corridoio (lettera, opzionale)
+———————————— Codice PV
```
Esempi: `TIR-A-01-1`, `TIR-B-05`, `DUR-MAIN`, `DUR-01`. Magazziniere decide profondità.

### Modello scaffale
- Codice univoco (es. `TIR-A-12-3`)
- PV di appartenenza
- Descrizione testuale
- Tipo: scaffale aperto / armadio chiuso / cassettiera / area pavimento
- Capacità approssimativa (opzionale)
- Stato attivo/disattivo

### Regole
- Un prodotto in un PV → un solo scaffale (split solo eccezionale via campo note)
- Stesso prodotto in PV diversi → scaffali diversi (righe stock separate)

### Tre viste
1. **Mappa PV**: tabella scaffali con #prodotti unici, #pezzi, %riempimento
2. **Contenuto scaffale**: lista prodotti con foto, qtà, sposta/stampa/inventario
3. **Dove si trova prodotto**: dalla scheda prodotto, riga per ogni PV con scaffale, qtà, riservata, disponibile

### Doppio QR
- **QR prodotto**: URL `https://stoku.app/p/<sku>`
- **QR scaffale**: URL `https://stoku.app/s/<codice-scaffale>`

### Modalità scansione
- **Fotocamera nativa** (iOS 11+/Android 9+) — apre URL → app
- **Scanner USB HID** (al banco) — agisce come tastiera
- **Pagina Scanner integrata** in app — fotocamera web continua, scheda compatta per ogni scansione
- Tutte le pagine `/p/...` e `/s/...` richiedono auth + permessi PV

### Workflow scaffali
- **Arrivo pezzo**: crea prodotto → scansiona QR ripiano → conferma qtà → stampa etichetta prodotto
- **Sposta singolo**: scheda prodotto → "Sposta in altro scaffale" → scansiona/scegli destinazione → conferma → log `internal_move`
- **Riorganizzazione massa**: vista scaffale origine → "Sposta in massa" → scansiona QR destinazione → checkbox prodotti → batch `internal_move` + flag "etichetta da ristampare"
- **Inventario**: pagina Scanner → scaffale → confronto logico/reale → rettifica
- **Cliente al banco**: cerca → vede `TIR-A-12-3 · 2 disponibili`

### Stampa massiva etichette
- Tutte etichette PV in un PDF (scaffali + prodotti)
- Formati A4 24x (70×33,8 mm) e termico Brother QL
- Filtri: solo prodotti senza etichetta stampata, solo scaffali nuovi N gg

### Cosa NON fa il sistema (di proposito)
- Non suggerisce dove mettere un nuovo pezzo
- Non ottimizza layout
- Niente percorsi prelievo ottimizzati

---

## Categorie iniziali

| Slug | Nome | Kind |
|---|---|---|
| abs | Centraline ABS | ricambio |
| ecu | Centraline motore | ricambio |
| body | Carrozzeria | ricambio |
| suspension | Sospensioni | ricambio |
| electrical | Impianto elettrico | ricambio |
| spare-other | Altri ricambi | ricambio |
| tires-summer | Pneumatici estivi | gomma |
| tires-winter | Pneumatici invernali | gomma |
| tires-allseason | Pneumatici 4 stagioni | gomma |
| rims-alloy | Cerchi in lega | cerchio |
| rims-steel | Cerchi in ferro | cerchio |
| batteries | Batterie | batteria |
| tools | Utensili officina | utensile |
| generic | Generico | generico |

### Campi per kind
- **ricambio**: marca/modello/anno auto, OEM (nessuno obbligatorio, no tabella veicoli rigida)
- **gomma**: larghezza mm, spalla %, diametro pollici, indice carico, indice velocità (Q/R/S/T/H/V/W/Y), marca, modello, battistrada mm, DOT, runflat, rinforzata. *Obbligatori: misura completa, marca*
- **cerchio**: diametro pollici, larghezza pollici, ET, schema bulloni (5×112), materiale, colore, marca. *Obbligatori: diametro, larghezza*
- **batteria**: Ah, CCA, V (12/24), marca
- **utensile**: marca, voltaggio
- **generico**: nessuno specifico

### Campi comuni
SKU auto-gen, nome, descrizione, condizione (nuovo/usato/ricondizionato/danneggiato), prezzo vendita, prezzo costo (opz., non viewer), valuta, peso kg, note interne, attivo/disattivo

### Aggiungere nuovo kind
Configurazione UI + ~30 min codice. No DDL.

---

## Migrazione dati

5.920 righe da `INVENTAR_FIZIK_2022_1.xlsx` (Numero, Nome, Quantità).

- **Fase A**: import grezzo → categoria `spare-other`/`generic`, qtà in `TIR01`
- **Fase B**: script categorizzazione automatica (pattern: ABS, Vegla pune, modelli auto noti)
- **Fase C**: revisione manuale UI batch (1-2 giorni)
- **Fase D**: arricchimento progressivo (foto, prezzi)

---

## Stack bloccato (al 30/04/2026)
- Next.js 16.2 + React 19 + TS 5.7+ strict
- Tailwind v4.2 + shadcn/ui (new-york, neutral)
- Supabase Pro (Postgres 15+, RLS, pg_trgm, unaccent, pgcrypto)
- @supabase/supabase-js v2.99.x, Node 22 LTS, pnpm 9
- TanStack Query v5, TanStack Table v8
- next-intl, @react-pdf/renderer

---

## Roadmap fasi (ordinata)
- F1 Fondamenta (auth, layout, utenti, PV, categorie)
- F2 Catalogo prodotti (CRUD + form dinamico + foto + ricerca + import)
- F3 Pneumatici dedicati
- F4 Clienti
- F5 Ordini & fatture
- **F6 Magazzino & scaffali** (CRUD scaffali, doppio QR, internal_move, transfer PV, etichette massa, log)
- F7 Dashboard & report
- F8 Migrazione dati
- F9 Rifinitura & go-live

---

## Out of scope v1
- E-commerce pubblico
- Fatturazione elettronica (SDI/e-Invoicing)
- Contabilità
- Spedizioni/corrieri
- CRM marketing
- App mobile native
- Multi-azienda SaaS
- Integrazione bancaria
