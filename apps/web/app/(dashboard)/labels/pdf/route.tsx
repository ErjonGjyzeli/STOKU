import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { parseLabelParams, sinceIso } from '../filters';

// Stampa massiva etichette — spec §3.7 + §7.bis "Stampa massiva".
//
// Layout A4 24-up (Avery J8159, 70×33,8 mm):
//   A4 = 210×297 mm, label = 70×33,8 mm
//   3 colonne × 8 righe = 210 × 270,4 mm
//   Margini orizzontali = 0 (etichette edge-to-edge: 3 × 70 = 210)
//   Margini verticali = (297 − 270,4) / 2 = 13,3 mm top/bottom
//   Nessun gutter (è il formato Avery standard).
// Conversione 1 mm = 2,8346 pt (72 pt = 25,4 mm).
//
// La nota nel task brief ("margini ~10mm, gutters ~2mm") era indicativa:
// con celle da 70mm e A4 da 210mm i margini orizzontali devono essere 0.
//
// Formato thermal: una pagina dedicata per etichetta (80×50 mm), come
// le route singole — utile per stampanti label.

const MM_TO_PT = 2.8346;
const LABEL_W_MM = 70;
const LABEL_H_MM = 33.8;
const GRID_COLS = 3;
const GRID_ROWS = 8;
const PER_PAGE = GRID_COLS * GRID_ROWS;
const TOP_MARGIN_MM = (297 - GRID_ROWS * LABEL_H_MM) / 2; // 13.3

const styles = StyleSheet.create({
  pageA4: {
    paddingTop: TOP_MARGIN_MM * MM_TO_PT,
    paddingBottom: TOP_MARGIN_MM * MM_TO_PT,
    paddingLeft: 0,
    paddingRight: 0,
    fontFamily: 'Helvetica',
  },
  row: {
    flexDirection: 'row',
    width: GRID_COLS * LABEL_W_MM * MM_TO_PT,
    height: LABEL_H_MM * MM_TO_PT,
  },
  cell: {
    width: LABEL_W_MM * MM_TO_PT,
    height: LABEL_H_MM * MM_TO_PT,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  qrBox: {
    width: (LABEL_H_MM - 4) * MM_TO_PT,
    height: (LABEL_H_MM - 4) * MM_TO_PT,
  },
  info: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  code: {
    fontSize: 9,
    fontWeight: 700,
    fontFamily: 'Courier',
    color: '#111',
  },
  name: {
    fontSize: 7,
    color: '#333',
    marginTop: 2,
    lineHeight: 1.15,
  },
  meta: {
    fontSize: 6,
    color: '#666',
    marginTop: 2,
  },
  // Thermal singolo (riuso pattern delle route singole)
  pageThermal: {
    padding: 24,
    fontFamily: 'Helvetica',
  },
  thermalLabel: {
    width: 226,
    height: 142,
    border: '1pt solid #ccc',
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  thermalQrBox: {
    width: 110,
    height: 110,
  },
  thermalInfo: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
});

type LabelItem = {
  code: string;
  name: string;
  meta: string | null;
  qrDataUrl: string;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function A4Document({ items }: { items: LabelItem[] }) {
  const pages = chunk(items, PER_PAGE);
  return (
    <Document>
      {pages.map((pageItems, pageIdx) => (
        <Page size="A4" style={styles.pageA4} key={pageIdx}>
          {chunk(pageItems, GRID_COLS).map((row, rowIdx) => (
            <View style={styles.row} key={rowIdx}>
              {row.map((it, colIdx) => (
                <View style={styles.cell} key={colIdx}>
                  <View style={styles.qrBox}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf */}
                    <Image src={it.qrDataUrl} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.code}>{truncate(it.code, 18)}</Text>
                    <Text style={styles.name}>{truncate(it.name, 70)}</Text>
                    {it.meta && <Text style={styles.meta}>{truncate(it.meta, 40)}</Text>}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}

function ThermalDocument({ items }: { items: LabelItem[] }) {
  return (
    <Document>
      {items.map((it, i) => (
        <Page size="A4" style={styles.pageThermal} key={i}>
          <View style={styles.thermalLabel}>
            <View style={styles.thermalQrBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf */}
              <Image src={it.qrDataUrl} style={{ width: '100%', height: '100%' }} />
            </View>
            <View style={styles.thermalInfo}>
              <View>
                <Text style={styles.code}>{it.code}</Text>
                <Text style={styles.name}>{truncate(it.name, 120)}</Text>
              </View>
              {it.meta && <Text style={styles.meta}>{it.meta}</Text>}
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
}

async function buildItems(
  rows: Array<{
    id: string;
    code: string;
    name: string;
    meta: string | null;
    qrPayload: string;
  }>,
): Promise<LabelItem[]> {
  return Promise.all(
    rows.map(async (r) => ({
      code: r.code,
      name: r.name,
      meta: r.meta,
      qrDataUrl: await QRCode.toDataURL(r.qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 0,
        width: 220,
      }),
    })),
  );
}

export async function GET(req: Request) {
  await requireSession();
  const url = new URL(req.url);
  const parsed = parseLabelParams(url.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { kind, format, ids, store_id, only_unprinted, since_days } = parsed.value;

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  let rows: Array<{
    id: string;
    code: string;
    name: string;
    meta: string | null;
    qrPayload: string;
  }>;

  if (kind === 'products') {
    let q =
      store_id !== null
        ? supabase
            .from('products')
            .select('id, sku, name, legacy_nr, stock!inner(store_id)')
            .eq('stock.store_id', store_id)
            .eq('is_active', true)
            .order('sku')
        : supabase
            .from('products')
            .select('id, sku, name, legacy_nr')
            .eq('is_active', true)
            .order('sku');
    if (ids && ids.length > 0) q = q.in('id', ids);
    if (only_unprinted) q = q.is('last_label_printed_at', null);
    if (since_days !== null) q = q.gte('created_at', sinceIso(since_days));
    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows = (data ?? []).map((p) => ({
      id: p.id,
      code: p.sku,
      name: p.name,
      meta: p.legacy_nr ? `#${p.legacy_nr}` : null,
      // QR per prodotto: SKU raw (stesso schema di /products/[id]/label).
      qrPayload: p.sku,
    }));
  } else if (kind === 'tires') {
    let q =
      store_id !== null
        ? supabase
            .from('products')
            .select(
              'id, sku, name, vehicle_make, vehicle_model, tire_width, tire_aspect, tire_diameter, tire_tread_mm, tire_dot, category:product_categories!inner(slug), stock!inner(store_id)',
            )
            .eq('product_categories.kind', 'gomma')
            .eq('stock.store_id', store_id)
            .eq('is_active', true)
            .order('sku')
        : supabase
            .from('products')
            .select(
              'id, sku, name, vehicle_make, vehicle_model, tire_width, tire_aspect, tire_diameter, tire_tread_mm, tire_dot, category:product_categories!inner(slug)',
            )
            .eq('product_categories.kind', 'gomma')
            .eq('is_active', true)
            .order('sku');
    if (ids && ids.length > 0) q = q.in('id', ids);
    if (only_unprinted) q = q.is('last_label_printed_at', null);
    if (since_days !== null) q = q.gte('created_at', sinceIso(since_days));
    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows = (data ?? []).map((t) => {
      const size =
        t.tire_width && t.tire_aspect && t.tire_diameter
          ? `${t.tire_width}/${t.tire_aspect} R${t.tire_diameter}`
          : null;
      const brand = [t.vehicle_make, t.vehicle_model].filter(Boolean).join(' ');
      const cat = Array.isArray(t.category) ? t.category[0] : t.category;
      const slug = cat?.slug ?? '';
      const seasonLabel = slug.includes('winter')
        ? 'Invernale'
        : slug.includes('allseason')
          ? '4 Stagioni'
          : slug.includes('summer')
            ? 'Estiva'
            : null;
      const metaParts = [
        seasonLabel,
        t.tire_tread_mm != null ? `${t.tire_tread_mm}mm` : null,
        t.tire_dot ? `DOT ${t.tire_dot}` : null,
      ].filter(Boolean);
      return {
        id: t.id,
        code: size ?? t.sku,
        name: brand || t.name,
        meta: metaParts.length > 0 ? metaParts.join(' · ') : null,
        qrPayload: t.sku,
      };
    });
  } else {
    let q = supabase
      .from('shelves')
      .select('id, code, description, store_id, store:stores(code, name)')
      .eq('is_active', true)
      .order('code');
    if (ids && ids.length > 0) q = q.in('id', ids);
    if (store_id !== null) q = q.eq('store_id', store_id);
    if (only_unprinted) q = q.is('last_label_printed_at', null);
    if (since_days !== null) q = q.gte('created_at', sinceIso(since_days));
    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    rows = (data ?? []).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.description ?? s.code,
      meta: s.store ? `${s.store.code} · ${s.store.name}` : null,
      qrPayload: `${appUrl}/s/${s.code}`,
    }));
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nessuna etichetta da stampare' }, { status: 404 });
  }

  const items = await buildItems(rows);
  const buffer = await renderToBuffer(
    format === 'thermal' ? <ThermalDocument items={items} /> : <A4Document items={items} />,
  );

  // Aggiorno il timestamp dopo il render PDF: bulk update sugli id
  // effettivamente inclusi. Best-effort: se fallisce l'utente ha già
  // il PDF e un retry è innocuo.
  const printedIds = rows.map((r) => r.id);
  const now = new Date().toISOString();
  if (kind === 'products' || kind === 'tires') {
    await supabase
      .from('products')
      .update({ last_label_printed_at: now })
      .in('id', printedIds);
  } else {
    await supabase
      .from('shelves')
      .update({ last_label_printed_at: now })
      .in('id', printedIds);
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="etichette-${kind}-${format}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
