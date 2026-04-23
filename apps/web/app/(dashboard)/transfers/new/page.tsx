import { redirect } from 'next/navigation';

export default function NewTransferRedirectPage() {
  redirect('/transfers?new=1');
}
