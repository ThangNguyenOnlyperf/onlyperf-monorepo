'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import {
  Package,
  ArrowLeft,
  QrCode,
  CheckCircle2,
  Loader2,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  scanAssemblyQRAction,
  confirmPhaseTransitionAction,
  completeAssemblyAction,
  getAssemblySessionAction,
  type AssemblySession,
} from '~/actions/assemblyActions';
import PhaseIndicator from './PhaseIndicator';
import PhaseTransitionModal from './PhaseTransitionModal';
import CountVerificationModal from './CountVerificationModal';
import { playSuccessTone, playErrorTone } from '~/lib/audio-feedback';

interface AssemblyClientUIProps {
  initialSession: AssemblySession;
}

export default function AssemblyClientUI({ initialSession }: AssemblyClientUIProps) {
  const router = useRouter();
  const [session, setSession] = useState<AssemblySession>(initialSession);
  const [isPending, startTransition] = useTransition();
  const [scanInput, setScanInput] = useState('');
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { bundle, items, currentItem } = session;

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [session.bundle.currentPhaseIndex]);

  const handleScan = async (qrCode: string) => {
    if (!qrCode.trim()) return;

    startTransition(async () => {
      const result = await scanAssemblyQRAction(bundle.id, qrCode.trim());

      if (result.success && result.data) {
        // Play success tone based on phase
        playSuccessTone();

        toast.success(result.message);

        // Refresh session state
        const refreshResult = await getAssemblySessionAction(bundle.id);
        if (refreshResult.success && refreshResult.data) {
          setSession(refreshResult.data);
        }

        // Check if phase complete
        if (result.data.isPhaseComplete) {
          if (result.data.isAllComplete) {
            setShowCompletionModal(true);
          } else {
            setShowTransitionModal(true);
          }
        }
      } else {
        playErrorTone();
        toast.error(result.message);
      }

      setScanInput('');
      inputRef.current?.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(scanInput);
    }
  };

  const handlePhaseTransition = async () => {
    startTransition(async () => {
      const result = await confirmPhaseTransitionAction(bundle.id);

      if (result.success && result.data) {
        toast.success(result.message);
        setShowTransitionModal(false);

        // Refresh session
        const refreshResult = await getAssemblySessionAction(bundle.id);
        if (refreshResult.success && refreshResult.data) {
          setSession(refreshResult.data);
        }

        if (result.data.isComplete) {
          setShowCompletionModal(true);
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleComplete = async () => {
    startTransition(async () => {
      const result = await completeAssemblyAction(bundle.id);

      if (result.success) {
        toast.success(result.message);
        router.push(`/bundles/${bundle.id}`);
      } else {
        toast.error(result.message);
      }
    });
  };

  // Calculate totals
  const totalExpected = items.reduce((sum, item) => sum + item.expectedCount, 0);
  const totalScanned = items.reduce((sum, item) => sum + item.scannedCount, 0);
  const overallProgress = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 0;

  // Current phase progress
  const currentProgress = currentItem
    ? Math.round((currentItem.scannedCount / currentItem.expectedCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Phase Indicator Banner */}
      <PhaseIndicator
        currentPhaseIndex={bundle.currentPhaseIndex}
        totalPhases={items.length}
        currentItem={currentItem}
      />

      <div className="container mx-auto py-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push(`/bundles/${bundle.id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        {/* Bundle Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{bundle.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span className="font-mono">{bundle.qrCode}</span>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-lg px-4 py-2">
            Pha {bundle.currentPhaseIndex + 1}/{items.length}
          </Badge>
        </div>

        {/* Scanner Input */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Quét mã QR sản phẩm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Quét hoặc nhập mã QR..."
                className="text-lg font-mono"
                disabled={isPending}
                autoFocus
              />
              <Button
                onClick={() => handleScan(scanInput)}
                disabled={isPending || !scanInput.trim()}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
              </Button>
            </div>
            {currentItem && (
              <p className="text-sm text-muted-foreground mt-2">
                Đang quét: <span className="font-medium">{currentItem.product?.name ?? '-'}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Phase Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Tiến độ pha hiện tại</CardTitle>
            </CardHeader>
            <CardContent>
              {currentItem ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{currentItem.product?.name ?? '-'}</span>
                    <span className="text-2xl font-bold">
                      {currentItem.scannedCount}/{currentItem.expectedCount}
                    </span>
                  </div>
                  <Progress value={currentProgress} className="h-4" />
                  <div className="text-center text-sm text-muted-foreground">
                    {currentProgress}% hoàn thành
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  Không có sản phẩm trong pha hiện tại
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Tiến độ tổng thể</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Tổng số sản phẩm</span>
                  <span className="text-2xl font-bold">
                    {totalScanned}/{totalExpected}
                  </span>
                </div>
                <Progress value={overallProgress} className="h-4" />
                <div className="text-center text-sm text-muted-foreground">
                  {overallProgress}% hoàn thành
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Phases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Tất cả các pha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item, index) => {
                const itemProgress = item.expectedCount > 0
                  ? Math.round((item.scannedCount / item.expectedCount) * 100)
                  : 0;
                const isCurrentPhase = index === bundle.currentPhaseIndex;
                const isComplete = item.scannedCount >= item.expectedCount;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border ${
                      isCurrentPhase
                        ? 'border-primary bg-primary/5'
                        : isComplete
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          isComplete
                            ? 'bg-emerald-500 text-white'
                            : isCurrentPhase
                            ? 'bg-primary text-white animate-pulse'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </span>
                        <div>
                          <div className="font-medium">{item.product?.name ?? '-'}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.product?.brand} - {item.product?.model}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {item.scannedCount}/{item.expectedCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {itemProgress}%
                        </div>
                      </div>
                    </div>
                    <Progress
                      value={itemProgress}
                      className={`h-2 ${isComplete ? '[&>div]:bg-emerald-500' : ''}`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Transition Modal */}
      <PhaseTransitionModal
        open={showTransitionModal}
        onOpenChange={setShowTransitionModal}
        currentItem={currentItem}
        nextItem={items[bundle.currentPhaseIndex + 1] ?? null}
        onConfirm={handlePhaseTransition}
        isPending={isPending}
      />

      {/* Completion Modal */}
      <CountVerificationModal
        open={showCompletionModal}
        onOpenChange={setShowCompletionModal}
        items={items}
        onConfirm={handleComplete}
        isPending={isPending}
      />
    </div>
  );
}
