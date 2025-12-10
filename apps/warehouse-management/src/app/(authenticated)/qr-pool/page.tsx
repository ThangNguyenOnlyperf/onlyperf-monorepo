import { getQRPoolStatsAction, getQRBatchesAction } from '~/actions/qrPoolActions';
import QRPoolClientUI from '~/components/qr-pool/QRPoolClientUI';

export default async function QRPoolPage() {
  const [statsResult, batchesResult] = await Promise.all([
    getQRPoolStatsAction(),
    getQRBatchesAction(),
  ]);

  const stats = statsResult.success ? statsResult.data : { available: 0, used: 0, total: 0 };
  const batches = batchesResult.success ? batchesResult.data : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QR Pool</h1>
        <p className="text-muted-foreground">
          Quản lý mã QR đã tạo sẵn cho việc lắp ráp sản phẩm
        </p>
      </div>

      <QRPoolClientUI initialStats={stats!} initialBatches={batches!} />
    </div>
  );
}
