import { renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { InvoiceDocument, type InvoiceData } from '../invoice-pdf';

const INVOICE_STATUSES = new Set(['confirmed', 'paid', 'shipped', 'completed']);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order, error }, { data: company }] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, order_number, status, created_at, confirmed_at, currency, subtotal, tax_rate, tax_amount, discount_amount, total, payment_method, notes, customer:customers(code, name, type, vat_number, tax_code, address_line1, city, postal_code, country, email, phone), store:stores(code, name)',
      )
      .eq('id', id)
      .single(),
    supabase.from('company_settings').select('*').eq('id', 1).single(),
  ]);

  if (error || !order) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }
  if (!INVOICE_STATUSES.has(order.status)) {
    return NextResponse.json(
      { error: `Fattura disponibile solo da status confermato in avanti (ora: ${order.status})` },
      { status: 400 },
    );
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('product_sku_snapshot, product_name_snapshot, quantity, unit_price, line_total')
    .eq('order_id', id)
    .order('id');

  const data: InvoiceData = {
    order_number: order.order_number,
    created_at: order.created_at ?? new Date().toISOString(),
    confirmed_at: order.confirmed_at,
    status: order.status,
    currency: order.currency ?? 'EUR',
    subtotal: Number(order.subtotal),
    tax_rate: Number(order.tax_rate ?? 0),
    tax_amount: Number(order.tax_amount),
    discount_amount: Number(order.discount_amount ?? 0),
    total: Number(order.total),
    payment_method: order.payment_method,
    notes: order.notes,
    company: {
      legal_name: company?.legal_name ?? '',
      vat_number: company?.vat_number ?? null,
      tax_code: company?.tax_code ?? null,
      address_line1: company?.address_line1 ?? null,
      city: company?.city ?? null,
      postal_code: company?.postal_code ?? null,
      country: company?.country ?? null,
      phone: company?.phone ?? null,
      email: company?.email ?? null,
      iban: company?.iban ?? null,
      bank_name: company?.bank_name ?? null,
      logo_url: company?.logo_url ?? null,
      invoice_footer: company?.invoice_footer ?? null,
    },
    customer: order.customer
      ? {
          code: order.customer.code,
          name: order.customer.name,
          type: order.customer.type,
          vat_number: order.customer.vat_number,
          tax_code: order.customer.tax_code,
          address_line1: order.customer.address_line1,
          city: order.customer.city,
          postal_code: order.customer.postal_code,
          country: order.customer.country,
          email: order.customer.email,
          phone: order.customer.phone,
        }
      : null,
    items: (items ?? []).map((it) => ({
      sku: it.product_sku_snapshot,
      name: it.product_name_snapshot,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      line_total: Number(it.line_total ?? 0),
    })),
    store_code: order.store?.code ?? null,
    store_name: order.store?.name ?? null,
  };

  const buffer = await renderToBuffer(<InvoiceDocument data={data} />);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="fattura-${order.order_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
