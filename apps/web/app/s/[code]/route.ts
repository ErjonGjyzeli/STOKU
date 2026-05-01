import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// QR scaffale: https://stoku.app/s/<code> → redirect a /shelves/<id>.
// Spec §7.bis. Lookup code → uuid via DB (RLS scoped per PV).
// Auth-required: utente non loggato finisce su /login con next= preservato.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase.auth.getSession();
  if (!session.session) {
    const next = encodeURIComponent(`/s/${code}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url), { status: 302 });
  }

  // Code è univoco per (store_id, code) — la RLS garantisce che il
  // chiamante veda solo gli scaffali dei PV per cui è abilitato.
  // Se la query torna 0 righe (codice esistente in altro PV o inesistente)
  // mandiamo alla mappa con messaggio.
  const { data: shelf } = await supabase
    .from('shelves')
    .select('id')
    .ilike('code', code)
    .maybeSingle();

  if (!shelf) {
    return NextResponse.redirect(
      new URL(`/shelves?q=${encodeURIComponent(code)}`, request.url),
      { status: 302 },
    );
  }

  return NextResponse.redirect(new URL(`/shelves/${shelf.id}`, request.url), { status: 302 });
}
