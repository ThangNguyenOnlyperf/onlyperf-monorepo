'use client';

import { Package } from 'lucide-react';
import type { AssemblyBundleItem } from '~/actions/assemblyActions';

interface PhaseIndicatorProps {
  currentPhaseIndex: number;
  totalPhases: number;
  currentItem: AssemblyBundleItem | null;
}

const phaseColors = [
  {
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    text: 'text-white',
    label: 'PHA XANH DƯƠNG',
    labelVi: 'BLUE PHASE',
  },
  {
    bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    text: 'text-white',
    label: 'PHA XANH LÁ',
    labelVi: 'GREEN PHASE',
  },
  {
    bg: 'bg-gradient-to-r from-purple-500 to-purple-600',
    text: 'text-white',
    label: 'PHA TÍM',
    labelVi: 'PURPLE PHASE',
  },
  {
    bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    text: 'text-white',
    label: 'PHA VÀNG',
    labelVi: 'YELLOW PHASE',
  },
  {
    bg: 'bg-gradient-to-r from-red-500 to-red-600',
    text: 'text-white',
    label: 'PHA ĐỎ',
    labelVi: 'RED PHASE',
  },
];

export default function PhaseIndicator({
  currentPhaseIndex,
  totalPhases,
  currentItem,
}: PhaseIndicatorProps) {
  const phaseStyle = phaseColors[currentPhaseIndex % phaseColors.length];

  if (!phaseStyle) {
    return null;
  }

  return (
    <div className={`${phaseStyle.bg} ${phaseStyle.text} py-4`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-wider">
                {phaseStyle.label}
              </div>
              <div className="text-sm opacity-90">
                Quét {currentItem?.product?.name ?? 'sản phẩm'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold">
              {currentItem?.scannedCount ?? 0}/{currentItem?.expectedCount ?? 0}
            </div>
            <div className="text-sm opacity-90">
              Pha {currentPhaseIndex + 1} / {totalPhases}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
