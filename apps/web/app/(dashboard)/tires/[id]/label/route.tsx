import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

import { requireSession } from '@/lib/auth/session';
import { formatCurrency } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
  },
  label: {
    width: 226,
    height: 142,
    border: '1pt solid #ccc',
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  qrBox: {
    width: 110,
    height: 110,
    border: '0.5pt solid #eee',
  },
  info: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  size: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'Courier',
    color: '#111',
  },
  brand: {
    fontSize: 9,
    color: '#333',
    marginTop: 3,
  },
  season: {
    fontSize: 8,
    color: '#555',
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666',
    marginTop: 6,
  },
  sku: {
    fontSize: 7,
    color: '#999',
    marginTop: 3,
  },
});

type LabelProps = {
  qrDataUrl: string;
  sku: string;
  size: string | null;
  brand: string | null;
  season: string | null;
  tread: string | null;
  dot: string | null;
  price: string | null;
};

function TireLabelDocument({ data }: { data: LabelProps }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.label}>
          <View style={styles.qrBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            <Image src={data.qrDataUrl} style={{ width: '100%', height: '100%' }} />
          </View>
          <View style={styles.info}>
            <View>
              <Text style={styles.size}>{data.size ?? data.sku}</Text>
              {data.brand && <Text style={styles.brand}>{data.brand}</Text>}
              {data.season && <Text style={styles.season}>{data.season}</Text>}
              <Text style={styles.sku}>{data.sku}</Text>
            </View>
            <View style={styles.bottomRow}>
              <Text>{[data.tread ? `${data.tread}mm` : null, data.dot ? `DOT ${data.dot}` : null].filter(Boolean).join(' · ')}</Text>
              {data.price && <Text>{data.price}</Text>}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

const SEASON_LABELS: Record<string, string> = {
  'tires-summer': 'Estiva',
  'tires-winter': 'Invernale',
  'tires-allseason': '4 Stagioni',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select(
      'id, sku, vehicle_make, vehicle_model, tire_width, tire_aspect, tire_diameter, tire_tread_mm, tire_dot, price_sell, currency, category:product_categories!inner(slug)',
    )
    .eq('id', id)
    .single();
  if (error || !product) {
    return NextResponse.json({ error: 'Pneumatico non trovato' }, { status: 404 });
  }

  const size =
    product.tire_width && product.tire_aspect && product.tire_diameter
      ? `${product.tire_width}/${product.tire_aspect} R${product.tire_diameter}`
      : null;

  const brand = [product.vehicle_make, product.vehicle_model].filter(Boolean).join(' ') || null;

  const cat = Array.isArray(product.category) ? product.category[0] : product.category;
  const season = cat?.slug ? (SEASON_LABELS[cat.slug] ?? null) : null;

  const qrDataUrl = await QRCode.toDataURL(product.sku, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 300,
  });

  const buffer = await renderToBuffer(
    <TireLabelDocument
      data={{
        qrDataUrl,
        sku: product.sku,
        size,
        brand,
        season,
        tread: product.tire_tread_mm != null ? String(product.tire_tread_mm) : null,
        dot: product.tire_dot ?? null,
        price:
          product.price_sell != null
            ? formatCurrency(product.price_sell, product.currency)
            : null,
      }}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="etichetta-${product.sku}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
