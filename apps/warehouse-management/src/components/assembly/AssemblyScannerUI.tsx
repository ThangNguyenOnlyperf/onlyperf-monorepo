'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from '~/components/scanner/QRScanner';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { ArrowLeft, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  scanAssemblyQRAction,
  confirmPhaseTransitionAction,
  completeAssemblyAction,
  getAssemblySessionAction,
  type AssemblySession,
} from '~/actions/assemblyActions';
import { playSuccessTone, playErrorTone } from '~/lib/audio-feedback';
import { useAssemblyRealtime } from '~/hooks/useAssemblyRealtime';
import PhaseTransitionModal from './PhaseTransitionModal';
import CountVerificationModal from './CountVerificationModal';

interface AssemblyScannerUIProps {
  initialSession: AssemblySession;
}

export default function AssemblyScannerUI({ initialSession }: AssemblyScannerUIProps) {
  const router = useRouter();
  const [session, setSession] = useState<AssemblySession>(initialSession);
  const [isPending, startTransition] = useTransition();
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const { bundle, items, currentItem } = session;

  // Real-time sync for multi-device scenarios
  const { isConnected } = useAssemblyRealtime({
    bundleId: bundle.id,
    onSessionUpdate: setSession,
  });

  const handleScan = useCallback(
    async (qrCode: string) => {
      if (isPending || !qrCode.trim()) return;

      startTransition(async () => {
        const result = await scanAssemblyQRAction(bundle.id, qrCode.trim());

        if (result.success && result.data) {
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
      });
    },
    [bundle.id, isPending]
  );

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

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between z-20 bg-slate-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/bundles/${bundle.id}`)}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Quay lại
        </Button>

        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-300" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-300" />
          )}

          <Badge className="bg-white/20 text-white border-white/30">
            Pha {bundle.currentPhaseIndex + 1}/{items.length}
          </Badge>
        </div>
      </header>

      {/* Progress info */}
      <div className="px-4 py-3 text-white text-center bg-slate-700">
        <p className="text-sm text-white/80 truncate max-w-[280px] mx-auto">
          {currentItem?.product?.name ?? 'Đang tải...'}
        </p>
        <p className="text-3xl font-bold mt-1">
          {currentItem?.scannedCount ?? 0}/{currentItem?.expectedCount ?? 0}
        </p>
        {items.length > 1 && (
          <p className="text-xs text-white/60 mt-1">
            Tổng: {totalScanned}/{totalExpected}
          </p>
        )}
      </div>

      {/* Full-screen scanner */}
      <div className="flex-1 relative">
        <QRScanner
          onScan={handleScan}
          disableInternalDelay={false}
          className="h-full"
        />

        {/* Loading overlay */}
        {isPending && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* All phases mini list - collapsible at bottom */}
      <div className="bg-black/80 backdrop-blur px-4 py-3 max-h-32 overflow-y-auto">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item, index) => {
            const isCurrentPhase = index === bundle.currentPhaseIndex;
            const isComplete = item.scannedCount >= item.expectedCount;

            return (
              <div
                key={item.id}
                className={`
                  flex-shrink-0 px-3 py-2 rounded-lg flex items-center gap-2
                  ${isCurrentPhase ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/5'}
                  ${isComplete && !isCurrentPhase ? 'opacity-60' : ''}
                `}
              >
                <span
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isComplete ? 'bg-green-500 text-white' : isCurrentPhase ? 'bg-white text-black' : 'bg-white/20 text-white'}
                  `}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="text-white text-xs">
                  <div className="truncate max-w-[80px]">
                    {item.product?.name ?? '-'}
                  </div>
                  <div className="text-white/50">
                    {item.scannedCount}/{item.expectedCount}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
