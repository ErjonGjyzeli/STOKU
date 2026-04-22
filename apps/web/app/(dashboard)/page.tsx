import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';

const TILES: Array<{ href: string; title: string; desc: string }> = [
  { href: '/products', title: 'Prodotti', desc: 'Catalogo ricambi e utensili' },
  { href: '/stock', title: 'Magazzino', desc: 'Giacenze per punto vendita' },
  { href: '/orders', title: 'Ordini', desc: 'Vendite e prenotazioni' },
  { href: '/customers', title: 'Clienti', desc: 'Anagrafica e storico' },
  { href: '/vehicles', title: 'Veicoli', desc: 'Marche, modelli, compatibilità' },
  { href: '/transfers', title: 'Trasferimenti', desc: 'Movimenti tra punti vendita' },
];

export default async function HomePage() {
  const session = await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Ciao{session.profile.full_name ? `, ${session.profile.full_name}` : ''}
        </h1>
        <p className="text-muted-foreground">Benvenuto nel gestionale STOKU.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="hover:ring-foreground/20 transition-all hover:ring-2">
              <CardHeader>
                <CardTitle>{tile.title}</CardTitle>
                <CardDescription>{tile.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">
                Disponibile nelle prossime fasi
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
