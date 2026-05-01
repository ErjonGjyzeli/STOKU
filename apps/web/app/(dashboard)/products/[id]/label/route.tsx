import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

import { requireSession } from '@/lib/auth/session';
import { formatCurrency } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

// Etichetta 80×50mm (formato comune per stampanti termiche),
// renderizzata dentro una pagina PDF A4 ritagliabile. Una pagina per
// etichetta: così l'operatore può stampare su label-printer o su carta
// normale e tagliare.

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
  },
  label: {
    width: 226, // 80mm a 72dpi ≈ 226pt
    height: 142, // 50mm ≈ 142pt
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
  sku: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: '#222',
  },
  name: {
    fontSize: 9,
    lineHeight: 1.2,
    color: '#333',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666',
    marginTop: 6,
  },
  brand: {
    fontSize: 7,
    color: '#999',
    marginTop: 3,
  },
});

type LabelProps = {
  qrDataUrl: string;
  sku: string;
  name: string;
  legacy_nr: string | null;
  oem_code: string | null;
  price: string | null;
};

function LabelDocument({ data }: { data: LabelProps }) {
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
              <Text style={styles.sku}>{data.sku}</Text>
              <Text style={styles.name}>
                {data.name.length > 120 ? `${data.name.slice(0, 117)}…` : data.name}
              </Text>
              {data.oem_code && <Text style={styles.brand}>OEM {data.oem_code}</Text>}
            </View>
            <View style={styles.bottomRow}>
              <Text>{data.legacy_nr ? `#${data.legacy_nr}` : ''}</Text>
              {data.price && <Text>{data.price}</Text>}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function formatPrice(value: number | null, currency: string | null) {
  if (value == null) return null;
  return formatCurrency(value, currency);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('id, sku, name, legacy_nr, oem_code, price_sell, currency')
    .eq('id', id)
    .single();
  if (error || !product) {
    return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 });
  }

  // QR payload: solo SKU. L'operatore scansionando ottiene l'identificativo
  // e l'app può lookare il prodotto. Alternativa futura: URL completo
  // https://.../products?q=SKU quando avremo mobile-PWA.
  const qrDataUrl = await QRCode.toDataURL(product.sku, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 300,
  });

  const buffer = await renderToBuffer(
    <LabelDocument
      data={{
        qrDataUrl,
        sku: product.sku,
        name: product.name,
        legacy_nr: product.legacy_nr,
        oem_code: product.oem_code,
        price: formatPrice(product.price_sell, product.currency),
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
