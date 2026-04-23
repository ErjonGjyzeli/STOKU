import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export type InvoiceCompany = {
  legal_name: string;
  vat_number: string | null;
  tax_code: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  iban: string | null;
  bank_name: string | null;
  logo_url: string | null;
  invoice_footer: string | null;
};

export type InvoiceCustomer = {
  code: string | null;
  name: string;
  type: string;
  vat_number: string | null;
  tax_code: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
};

export type InvoiceItem = {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type InvoiceData = {
  order_number: string;
  created_at: string; // ISO
  confirmed_at: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  notes: string | null;
  company: InvoiceCompany;
  customer: InvoiceCustomer | null;
  items: InvoiceItem[];
  store_code: string | null;
  store_name: string | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  logoBox: {
    width: 100,
    maxHeight: 50,
  },
  companyBlock: {
    textAlign: 'right',
    fontSize: 9,
    lineHeight: 1.4,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: '#555',
    marginBottom: 16,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  colBox: {
    flex: 1,
    padding: 10,
    border: '1pt solid #e2e2e2',
    borderRadius: 3,
  },
  colLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: '#777',
    marginBottom: 4,
  },
  colText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  table: {
    borderTop: '1pt solid #222',
    marginTop: 4,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #222',
    backgroundColor: '#f4f4f4',
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: 700,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #eee',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  cSku: { width: 70 },
  cName: { flex: 1, paddingRight: 6 },
  cQty: { width: 40, textAlign: 'right' },
  cPrice: { width: 70, textAlign: 'right' },
  cLine: { width: 70, textAlign: 'right' },
  totalsBlock: {
    marginTop: 6,
    alignSelf: 'flex-end',
    width: 250,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#555',
  },
  totalsValue: {
    fontSize: 10,
  },
  totalFinal: {
    borderTop: '1pt solid #222',
    paddingTop: 6,
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
  totalFinalValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#777',
    textAlign: 'center',
    borderTop: '1pt solid #e2e2e2',
    paddingTop: 8,
    whiteSpace: 'pre-wrap',
  },
  bankBlock: {
    marginTop: 14,
    fontSize: 9,
    color: '#555',
  },
});

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function join(...parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const { company, customer, items } = data;
  const companyAddress = join(
    company.address_line1,
    company.postal_code,
    company.city,
    company.country,
  ).trim();
  const customerAddress = customer
    ? join(customer.address_line1, customer.postal_code, customer.city, customer.country).trim()
    : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {company.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, non DOM img
              <Image src={company.logo_url} style={styles.logoBox} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: 700 }}>
                {company.legal_name || 'STOKU'}
              </Text>
            )}
          </View>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>
              {company.legal_name || '— Ragione sociale non impostata —'}
            </Text>
            {companyAddress ? <Text>{companyAddress}</Text> : null}
            {company.vat_number ? <Text>NIPT {company.vat_number}</Text> : null}
            {company.tax_code ? <Text>CF {company.tax_code}</Text> : null}
            {company.phone || company.email ? (
              <Text>{join(company.phone, company.email)}</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.title}>Fattura {data.order_number}</Text>
        <Text style={styles.meta}>
          Data emissione: {formatDate(data.confirmed_at ?? data.created_at)}
          {data.store_code ? ` · Punto vendita ${data.store_code}` : ''}
          {data.payment_method ? ` · Pagamento ${data.payment_method}` : ''}
        </Text>

        <View style={styles.twoCol}>
          <View style={styles.colBox}>
            <Text style={styles.colLabel}>CLIENTE</Text>
            {customer ? (
              <>
                <Text style={{ ...styles.colText, fontWeight: 700 }}>{customer.name}</Text>
                {customer.code ? <Text style={styles.colText}>Codice {customer.code}</Text> : null}
                {customerAddress ? <Text style={styles.colText}>{customerAddress}</Text> : null}
                {customer.vat_number ? (
                  <Text style={styles.colText}>NIPT {customer.vat_number}</Text>
                ) : null}
                {customer.tax_code ? (
                  <Text style={styles.colText}>CF {customer.tax_code}</Text>
                ) : null}
                {customer.email || customer.phone ? (
                  <Text style={styles.colText}>{join(customer.email, customer.phone)}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.colText}>Vendita banco</Text>
            )}
          </View>

          <View style={styles.colBox}>
            <Text style={styles.colLabel}>DETTAGLI</Text>
            <Text style={styles.colText}>Numero: {data.order_number}</Text>
            <Text style={styles.colText}>
              Data: {formatDate(data.confirmed_at ?? data.created_at)}
            </Text>
            <Text style={styles.colText}>Status: {data.status}</Text>
            {data.store_name ? <Text style={styles.colText}>PdV: {data.store_name}</Text> : null}
            {data.payment_method ? (
              <Text style={styles.colText}>Pagamento: {data.payment_method}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cSku}>SKU</Text>
            <Text style={styles.cName}>Descrizione</Text>
            <Text style={styles.cQty}>Qta</Text>
            <Text style={styles.cPrice}>Prezzo</Text>
            <Text style={styles.cLine}>Totale</Text>
          </View>
          {items.map((it, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cSku}>{it.sku}</Text>
              <Text style={styles.cName}>{it.name}</Text>
              <Text style={styles.cQty}>{it.quantity}</Text>
              <Text style={styles.cPrice}>{formatMoney(it.unit_price, data.currency)}</Text>
              <Text style={styles.cLine}>{formatMoney(it.line_total, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotale</Text>
            <Text style={styles.totalsValue}>{formatMoney(data.subtotal, data.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>IVA {data.tax_rate}%</Text>
            <Text style={styles.totalsValue}>{formatMoney(data.tax_amount, data.currency)}</Text>
          </View>
          {data.discount_amount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sconto</Text>
              <Text style={styles.totalsValue}>
                - {formatMoney(data.discount_amount, data.currency)}
              </Text>
            </View>
          )}
          <View style={{ ...styles.totalsRow, ...styles.totalFinal }}>
            <Text style={styles.totalFinalLabel}>Totale</Text>
            <Text style={styles.totalFinalValue}>{formatMoney(data.total, data.currency)}</Text>
          </View>
        </View>

        {(company.iban || company.bank_name) && (
          <View style={styles.bankBlock}>
            <Text>
              Coordinate bancarie: {company.bank_name ?? ''} {company.iban ?? ''}
            </Text>
          </View>
        )}

        {data.notes && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 9, color: '#555' }}>Note: {data.notes}</Text>
          </View>
        )}

        {company.invoice_footer && (
          <Text style={styles.footer} fixed>
            {company.invoice_footer}
          </Text>
        )}
      </Page>
    </Document>
  );
}
