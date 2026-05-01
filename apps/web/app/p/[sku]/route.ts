import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// QR prodotto: https://stoku.app/p/<sku> → redirect alla scheda prodotto.
// Spec §7.bis. Auth-required: utente non loggato finisce su /login con
// next= preservato così dopo login torna qui.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sku: string }> },
) {
  const { sku } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    const next = encodeURIComponent(`/p/${sku}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url), { status: 302 });
  }

  // Niente detail-page prodotto al momento: deep-link a /products?q=<sku>
  // che usa FTS e mostra la riga corrispondente in evidenza.
  return NextResponse.redirect(new URL(`/products?q=${encodeURIComponent(sku)}`, request.url), {
    status: 302,
  });
}
