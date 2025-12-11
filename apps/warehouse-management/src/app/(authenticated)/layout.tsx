import { redirect } from 'next/navigation';
import { getOrgContext, PERMISSIONS } from '~/lib/authorization';
import { PermissionsProvider } from '~/lib/permissions-context';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getOrgContext();

  if (!context) {
    redirect('/signin');
  }

  const permissions = PERMISSIONS[context.userRole] || [];

  return (
    <PermissionsProvider userRole={context.userRole} permissions={permissions}>
      {children}
    </PermissionsProvider>
  );
}
