import { redirect } from 'next/navigation';

// /orders/new è stata sostituita da una modal aperta dalla lista /orders.
// Redirect permanente verso /orders?new=1 così gli eventuali link esterni
// (topbar, bookmark) continuano a funzionare.
export default function NewOrderRedirectPage() {
  redirect('/orders?new=1');
}
