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
import { QrCode, Plus, Loader2, Package, Check, Clock, Download, ChevronDown, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { generateQRPoolBatchAction, getQRPoolStatsAction, getQRBatchesAction } from '~/actions/qrPoolActions';
import type { QRPoolStats, QRBatch } from '~/actions/qrPoolActions';

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

  const getPDFFiles = (count: number, batchId: string): PDFFileMeta[] => {
    const totalFiles = Math.ceil(count / PDF_BATCH_SIZE);
    const files: PDFFileMeta[] = [];

    for (let i = 0; i < totalFiles; i++) {
      const startIndex = i * PDF_BATCH_SIZE;
      const endIndex = Math.min(startIndex + PDF_BATCH_SIZE, count);
      const fileQrCount = endIndex - startIndex;
      const shortBatchId = batchId.length > 12 ? batchId.slice(-12) : batchId;

      files.push({
        fileNumber: i + 1,
        qrCount: fileQrCount,
        filename: totalFiles === 1
          ? `qr-pool-${shortBatchId}.pdf`
          : `qr-pool-${shortBatchId}-part-${String(i + 1).padStart(String(totalFiles).length, '0')}.pdf`,
      });
    }

    return files;
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Có sẵn</CardTitle>
            <Check className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{stats.available.toLocaleString()}</div>
            <p className="text-xs text-emerald-600/80">QR codes sẵn sàng sử dụng</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Đã sử dụng</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.used.toLocaleString()}</div>
            <p className="text-xs text-blue-600/80">Đã gán cho sản phẩm</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Tổng cộng</CardTitle>
            <QrCode className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-purple-600/80">Tổng QR codes đã tạo</p>
          </CardContent>
        </Card>
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
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có mã QR nào được tạo</p>
              <p className="text-sm">Nhấn &quot;Tạo mã QR mới&quot; để bắt đầu</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50">Batch ID</TableHead>
                  <TableHead className="bg-muted/50">Thời gian tạo</TableHead>
                  <TableHead className="bg-muted/50 text-right">Tổng số</TableHead>
                  <TableHead className="bg-muted/50 text-right">Còn lại</TableHead>
                  <TableHead className="bg-muted/50">Trạng thái</TableHead>
                  <TableHead className="bg-muted/50">Tải PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const pdfFiles = getPDFFiles(batch.count, batch.batchId);
                  const isDownloading = downloadingBatch === batch.batchId;
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
                        {isSingleFile ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadPDF(batch.batchId, 1)}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Đang tải...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-1" />
                                Tải PDF
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
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Đang tải...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-1" />
                                    {pdfFiles.length} files
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
