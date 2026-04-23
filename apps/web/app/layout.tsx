import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'STOKU — Gestionale ricambi',
  description: 'Gestionale multi-punto vendita per ricambi auto',
};

// Evita l'auto-zoom di iOS Safari sui campi di input durante il focus
// mobile. La strategia tipica "font-size ≥ 16px" non si adatta a una UI
// dense come la nostra; qui blocchiamo il comportamento via viewport.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
