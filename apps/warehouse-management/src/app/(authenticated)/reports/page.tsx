import { redirect } from 'next/navigation';

export default function ReportsPage() {
  // Redirect to the product tracking report by default
  redirect('/reports/products');
}