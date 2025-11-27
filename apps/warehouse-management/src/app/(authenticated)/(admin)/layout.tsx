import { redirect } from 'next/navigation';
import { requireAdmin } from '~/lib/authorization';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    // User is not an admin, redirect to dashboard
    redirect('/dashboard?error=unauthorized');
  }

  return <>{children}</>;
}
