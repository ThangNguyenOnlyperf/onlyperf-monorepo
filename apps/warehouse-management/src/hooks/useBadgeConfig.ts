'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type BadgeConfig,
  BadgeConfigSchema,
  DEFAULT_BADGE_CONFIG,
  BADGE_CONFIG_STORAGE_KEY,
} from '~/lib/badge-config-schema';

/**
 * Custom hook for managing badge configuration with localStorage persistence
 *
 * Usage:
 * ```tsx
 * const { config, updateConfig, resetConfig } = useBadgeConfig();
 * ```
 */
export function useBadgeConfig() {
  const [config, setConfig] = useState<BadgeConfig>(DEFAULT_BADGE_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BADGE_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = BadgeConfigSchema.parse(parsed);
        setConfig(validated);
      }
    } catch (error) {
      console.warn('Failed to load badge config from localStorage:', error);
      // Keep default config if parsing fails
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Update config and persist to localStorage
  const updateConfig = useCallback((updates: Partial<BadgeConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      // If switching to badge mode but no template selected, keep in QR-only mode
      if (newConfig.mode === 'badge' && !newConfig.templateId) {
        newConfig.mode = 'qr-only';
      }

      // Validate and persist
      try {
        const validated = BadgeConfigSchema.parse(newConfig);
        localStorage.setItem(BADGE_CONFIG_STORAGE_KEY, JSON.stringify(validated));
        return validated;
      } catch (error) {
        console.error('Invalid badge config:', error);
        return prev; // Revert to previous config if validation fails
      }
    });
  }, []);

  // Reset to default configuration
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_BADGE_CONFIG);
    localStorage.removeItem(BADGE_CONFIG_STORAGE_KEY);
  }, []);

  // Clear localStorage (useful for debugging)
  const clearStorage = useCallback(() => {
    localStorage.removeItem(BADGE_CONFIG_STORAGE_KEY);
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    clearStorage,
    isLoaded,
  };
}
