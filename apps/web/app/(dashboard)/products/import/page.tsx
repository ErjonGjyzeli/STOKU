import { redirect } from 'next/navigation';

// Import da Excel temporaneamente disattivato: la prima bulk-load è già
// avvenuta tramite script interno (F8 manuale). Il flusso riabiliterà
// il form quando servirà per sync incrementale.
export default function ProductsImportPage() {
  redirect('/products');
}
