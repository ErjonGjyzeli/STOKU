import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

// Etichetta scaffale 80×50mm (formato Brother QL / generica termica),
// stampata dentro una pagina A4 ritagliabile. Pattern allineato a
// `products/[id]/label/route.tsx` ma con QR che punta a un URL di
// risoluzione (`/s/<code>`, route handler in PR successiva).

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
  code: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: '#222',
    fontFamily: 'Courier',
  },
  description: {
    fontSize: 9,
    lineHeight: 1.2,
    color: '#333',
    marginTop: 4,
  },
  store: {
    fontSize: 8,
    color: '#666',
    marginTop: 6,
  },
});

type LabelProps = {
  qrDataUrl: string;
  code: string;
  description: string | null;
  storeLabel: string;
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
              <Text style={styles.code}>{data.code}</Text>
              {data.description && (
                <Text style={styles.description}>
                  {data.description.length > 80
                    ? `${data.description.slice(0, 77)}…`
                    : data.description}
                </Text>
              )}
            </View>
            <Text style={styles.store}>{data.storeLabel}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: shelf, error } = await supabase
    .from('shelves')
    .select('id, code, description, store:stores(code, name)')
    .eq('id', id)
    .single();
  if (error || !shelf) {
    return NextResponse.json({ error: 'Scaffale non trovato' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  // QR payload: URL di risoluzione `/s/<code>` (route in PR successiva).
  // Il code è già univoco per PV (vincolo unique store_id+code).
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/s/${shelf.code}`, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 300,
  });

  const storeLabel = shelf.store
    ? `${shelf.store.code} · ${shelf.store.name}`
    : '—';

  const buffer = await renderToBuffer(
    <LabelDocument
      data={{
        qrDataUrl,
        code: shelf.code,
        description: shelf.description,
        storeLabel,
      }}
    />,
  );

  // Aggiorna timestamp ultima stampa (best-effort; un fallimento qui
  // non invalida il PDF già renderizzato).
  await supabase
    .from('shelves')
    .update({ last_label_printed_at: new Date().toISOString() })
    .eq('id', shelf.id);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="scaffale-${shelf.code}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
