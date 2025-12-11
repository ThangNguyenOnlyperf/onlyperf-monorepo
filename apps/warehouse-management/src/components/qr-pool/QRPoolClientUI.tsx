'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { QrCode, Plus, Loader2, Package, Check, Clock, Download, ChevronDown, FileDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { StatCard } from '~/components/ui/StatCard';
import { EmptyState } from '~/components/ui/EmptyState';
import { generateQRPoolBatchAction, getQRPoolStatsAction, getQRBatchesAction } from '~/actions/qrPoolActions';
import type { QRPoolStats, QRBatch } from '~/actions/qrPoolActions';
import { formatDate } from '~/lib/utils/formatDate';

interface QRPoolClientUIProps {
  initialStats: QRPoolStats;
  initialBatches: QRBatch[];
}

const PDF_BATCH_SIZE = 100;

interface PDFFileMeta {
  fileNumber: number;
  qrCount: number;
  filename: string;
}

export default function QRPoolClientUI({ initialStats, initialBatches }: QRPoolClientUIProps) {
  const [stats, setStats] = useState<QRPoolStats>(initialStats);
  const [batches, setBatches] = useState<QRBatch[]>(initialBatches);
  const [isPending, startTransition] = useTransition();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [quantity, setQuantity] = useState('100');
  const [downloadingBatch, setDownloadingBatch] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<number | null>(null);
  const [downloadingCSV, setDownloadingCSV] = useState<string | null>(null);

  const downloadPDF = async (batchId: string, fileNumber: number) => {
    try {
      setDownloadingBatch(batchId);
      setDownloadingFile(fileNumber);

      const response = await fetch(`/api/qr-pool/${batchId}/pdf?file=${fileNumber}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể tải PDF');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `qr-pool-${batchId}-${fileNumber}.pdf`;

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Đã tải ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải PDF');
    } finally {
      setDownloadingBatch(null);
      setDownloadingFile(null);
    }
  };

  const formatDateForFilename = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPDFFiles = (count: number, batchId: string, generatedAt: Date | string): PDFFileMeta[] => {
    const totalFiles = Math.ceil(count / PDF_BATCH_SIZE);
    const files: PDFFileMeta[] = [];
    const shortBatchId = batchId.length > 12 ? batchId.slice(-12) : batchId;
    const dateStr = formatDateForFilename(generatedAt);

    for (let i = 0; i < totalFiles; i++) {
      const startIndex = i * PDF_BATCH_SIZE;
      const endIndex = Math.min(startIndex + PDF_BATCH_SIZE, count);
      const fileQrCount = endIndex - startIndex;

      files.push({
        fileNumber: i + 1,
        qrCount: fileQrCount,
        filename: totalFiles === 1
          ? `${dateStr}-${shortBatchId}.pdf`
          : `${dateStr}-${shortBatchId}-part-${String(i + 1).padStart(String(totalFiles).length, '0')}.pdf`,
      });
    }

    return files;
  };

  const downloadCSV = async (batchId: string) => {
    try {
      setDownloadingCSV(batchId);

      const response = await fetch(`/api/qr-pool/${batchId}/csv`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể tải CSV');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `qr-pool-${batchId}.csv`;

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Đã tải ${filename}`);
    } catch (error) {
      console.error('Download CSV error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải CSV');
    } finally {
      setDownloadingCSV(null);
    }
  };

  const handleGenerate = async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 10000) {
      toast.error('Số lượng phải từ 1 đến 10,000');
      return;
    }

    startTransition(async () => {
      const result = await generateQRPoolBatchAction(qty);
      if (result.success) {
        toast.success(result.message);
        setIsGenerateOpen(false);
        setQuantity('100');

        // Refresh stats and batches
        const [statsResult, batchesResult] = await Promise.all([
          getQRPoolStatsAction(),
          getQRBatchesAction(),
        ]);
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
        if (batchesResult.success && batchesResult.data) {
          setBatches(batchesResult.data);
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Có sẵn"
          value={stats.available}
          subtitle="QR codes sẵn sàng sử dụng"
          icon={Check}
          colorScheme="emerald"
        />
        <StatCard
          title="Đã sử dụng"
          value={stats.used}
          subtitle="Đã gán cho sản phẩm"
          icon={Package}
          colorScheme="blue"
        />
        <StatCard
          title="Tổng cộng"
          value={stats.total}
          subtitle="Tổng QR codes đã tạo"
          icon={QrCode}
          colorScheme="purple"
        />
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Tạo mã QR mới
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo mã QR mới</DialogTitle>
              <DialogDescription>
                Tạo một lô mã QR mới để sử dụng cho việc lắp ráp sản phẩm.
                Mỗi mã QR sẽ có định dạng ABCD1234.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-medium">Số lượng</label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tối đa 10,000 mã mỗi lần tạo
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleGenerate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Tạo {parseInt(quantity) || 0} mã
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lịch sử tạo mã
          </CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState
              icon={QrCode}
              title="Chưa có mã QR nào được tạo"
              description='Nhấn "Tạo mã QR mới" để bắt đầu'
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50">Batch ID</TableHead>
                  <TableHead className="bg-muted/50">Thời gian tạo</TableHead>
                  <TableHead className="bg-muted/50 text-right">Tổng số</TableHead>
                  <TableHead className="bg-muted/50 text-right">Còn lại</TableHead>
                  <TableHead className="bg-muted/50">Trạng thái</TableHead>
                  <TableHead className="bg-muted/50">Tải xuống</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const pdfFiles = getPDFFiles(batch.count, batch.batchId, batch.generatedAt);
                  const isDownloading = downloadingBatch === batch.batchId;
                  const isDownloadingCSVBatch = downloadingCSV === batch.batchId;
                  const isSingleFile = pdfFiles.length === 1;

                  return (
                    <TableRow key={batch.batchId} className="hover:bg-primary/5">
                      <TableCell className="font-mono text-sm">
                        {batch.batchId.slice(0, 20)}...
                      </TableCell>
                      <TableCell>{formatDate(batch.generatedAt)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {batch.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {batch.availableCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {batch.availableCount === batch.count ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                            Chưa sử dụng
                          </Badge>
                        ) : batch.availableCount === 0 ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            Đã dùng hết
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                            Đang sử dụng
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {isSingleFile ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPDF(batch.batchId, 1)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </>
                              )}
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isDownloading}
                                >
                                  {isDownloading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4 mr-1" />
                                      PDF ({pdfFiles.length})
                                      <ChevronDown className="h-4 w-4 ml-1" />
                                    </>
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                                {pdfFiles.map((file) => (
                                  <DropdownMenuItem
                                    key={file.fileNumber}
                                    onClick={() => downloadPDF(batch.batchId, file.fileNumber)}
                                    disabled={isDownloading && downloadingFile === file.fileNumber}
                                  >
                                    <FileDown className="h-4 w-4 mr-2" />
                                    File {file.fileNumber} ({file.qrCount} mã)
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadCSV(batch.batchId)}
                            disabled={isDownloadingCSVBatch}
                          >
                            {isDownloadingCSVBatch ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <FileSpreadsheet className="h-4 w-4 mr-1" />
                                CSV
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
