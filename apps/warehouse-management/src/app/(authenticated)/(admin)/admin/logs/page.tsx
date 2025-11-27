import { auth } from '~/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getLogFiles } from '~/actions/logActions';
import LogViewerClientUI from '~/components/logs/LogViewerClientUI';

async function getData() {
  const hdrs = new Headers();
  const cs = await cookies();
  const cookieStr = cs
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join('; ');
  if (cookieStr) hdrs.set('cookie', cookieStr);
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) redirect('/signin');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const logFilesResult = await getLogFiles();
  return {
    logFiles: logFilesResult.data ?? [],
  };
}

export default async function AdminLogsPage() {
  const { logFiles } = await getData();

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Theo dõi Log hệ thống</h1>
      <LogViewerClientUI initialLogFiles={logFiles} />
    </div>
  );
}
