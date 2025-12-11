/**
 * Phase Configuration
 * Simple phase labels for display purposes
 * Note: V2 design uses neutral colors - no phase-specific colors
 */

export interface PhaseConfig {
  /** Vietnamese phase label */
  label: string;
  /** English phase label */
  labelEn: string;
}

export const phaseConfigs: PhaseConfig[] = [
  { label: 'PHA 1', labelEn: 'PHASE 1' },
  { label: 'PHA 2', labelEn: 'PHASE 2' },
  { label: 'PHA 3', labelEn: 'PHASE 3' },
  { label: 'PHA 4', labelEn: 'PHASE 4' },
  { label: 'PHA 5', labelEn: 'PHASE 5' },
];

/**
 * Get phase config by index (cycles through phases)
 */
export function getPhaseEnvironment(phaseIndex: number): PhaseConfig {
  return phaseConfigs[phaseIndex % phaseConfigs.length]!;
}
