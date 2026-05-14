import { redirect } from 'next/navigation';

export default function LegacySuccessRedirect() {
  redirect('/group-formation/success');
}
