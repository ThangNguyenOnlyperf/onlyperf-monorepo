'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  ArrowLeft,
  QrCode,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAssemblyRealtime } from '~/hooks/useAssemblyRealtime';
import {
  scanAssemblyQRAction,
  confirmPhaseTransitionAction,
  completeAssemblyAction,
  getAssemblySessionAction,
  type AssemblySession,
} from '~/actions/assemblyActions';
import PhaseTransitionModal from './PhaseTransitionModal';
import CountVerificationModal from './CountVerificationModal';
import { playSuccessTone, playErrorTone } from '~/lib/audio-feedback';

// Updated components for clean design
import ProductHeroCard from './ProductHeroCard';
import CircularProgressBadge from './CircularProgressBadge';

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

  // Real-time sync for multi-device scenarios
  const { isConnected } = useAssemblyRealtime({
    bundleId: bundle.id,
    onSessionUpdate: setSession,
  });

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [session.bundle.currentPhaseIndex]);

  const handleScan = async (qrCode: string) => {
    if (!qrCode.trim()) return;

    startTransition(async () => {
      const result = await scanAssemblyQRAction(bundle.id, qrCode.trim());

      if (result.success && result.data) {
        playSuccessTone();
        toast.success(result.message);

        const refreshResult = await getAssemblySessionAction(bundle.id);
        if (refreshResult.success && refreshResult.data) {
          setSession(refreshResult.data);
        }

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

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header - Minimal, clean */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(`/bundles/${bundle.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>

          <div className="flex items-center gap-3">
            {/* Connection indicator */}
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 text-xs">
                <Wifi className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đã kết nối</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 text-xs">
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ngoại tuyến</span>
              </span>
            )}
            {/* Product Badge */}
            <Badge variant="secondary" className="text-sm">
              Sản phẩm {bundle.currentPhaseIndex + 1}/{items.length}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content - Centered, product-focused */}
      <main className="flex-1 overflow-auto px-4 py-8">
        <div className="w-full max-w-xl mx-auto space-y-6">
          {/* Circular Progress Badge - Top */}
          <CircularProgressBadge
            current={currentItem?.scannedCount ?? 0}
            total={currentItem?.expectedCount ?? 0}
          />

          {/* Product Hero Card - CENTER STAGE */}
          <ProductHeroCard item={currentItem} />
        </div>
      </main>

      {/* Sticky Scanner Input - Bottom, respects sidebar */}
      <div className="sticky bottom-0 z-40 p-4 bg-background border-t border-border card-shadow">
        <div className="max-w-xl mx-auto">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Quét hoặc nhập mã QR..."
              className="text-lg font-mono h-12 border-2 focus:border-primary"
              disabled={isPending}
              autoFocus
            />
            <Button
              onClick={() => handleScan(scanInput)}
              disabled={isPending || !scanInput.trim()}
              className="h-12 px-6 btn-primary"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PhaseTransitionModal
        open={showTransitionModal}
        onOpenChange={setShowTransitionModal}
        currentItem={currentItem}
        nextItem={items[bundle.currentPhaseIndex + 1] ?? null}
        onConfirm={handlePhaseTransition}
        isPending={isPending}
      />

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
