import { redirect } from 'next/navigation';
import { auth } from '~/lib/auth';
import { headers } from 'next/headers';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/signin');
  }

  return <>{children}</>;
}
