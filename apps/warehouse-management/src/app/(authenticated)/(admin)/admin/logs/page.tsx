import { redirect } from 'next/navigation';
import { getLogFiles } from '~/actions/logActions';
import LogViewerClientUI from '~/components/logs/LogViewerClientUI';
import { requireOrgContext } from '~/lib/authorization';

async function getData() {
  try {
    const { userRole } = await requireOrgContext();
    if (userRole !== 'admin') redirect('/dashboard');
  } catch {
    redirect('/signin');
  }

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
