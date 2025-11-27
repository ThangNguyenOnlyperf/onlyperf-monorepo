/* eslint-disable @typescript-eslint/no-misused-promises */
'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '~/components/ui/button';
import { Camera, CameraOff, X, Flashlight, FlashlightOff } from 'lucide-react';

// ========================
// Types and Interfaces
// ========================

interface QRScannerProps {
  onScan: (result: string) => Promise<void> | void;
  onError?: (error: string) => void;
  onClose?: () => void;
  className?: string;
  externalFeedback?: ScanFeedback;
  disableInternalDelay?: boolean;
  isOpen?: boolean;
}

interface ScanFeedback {
  type: 'success' | 'error' | null;
  message: string;
}

// ========================
// Constants
// ========================

const INTERNAL_SCAN_DELAY = 2000;
const CAMERA_INIT_TIMEOUT = 10000; // 10 seconds

// ========================
// Helper Functions
// ========================

/**
 * Maps camera error types to user-friendly Vietnamese messages
 */
function getCameraErrorMessage(error: Error): string {
  const errorMap: Record<string, string> = {
    NotAllowedError: 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.',
    NotFoundError: 'Không tìm thấy camera. Vui lòng kiểm tra thiết bị.',
    NotReadableError: 'Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng đó và thử lại.',
    OverconstrainedError: 'Không tìm thấy camera phù hợp với yêu cầu.',
    SecurityError: 'Không thể truy cập camera do vấn đề bảo mật (yêu cầu HTTPS).',
  };

  return errorMap[error.name] ?? 'Không thể truy cập camera';
}

/**
 * Calculates the scan region for QR code detection
 */
function calculateScanRegion(video: HTMLVideoElement) {
  const smallestDimension = Math.min(video.videoWidth, video.videoHeight);
  const scanRegionSize = Math.round(0.75 * smallestDimension);

  return {
    x: Math.round((video.videoWidth - scanRegionSize) / 2),
    y: Math.round((video.videoHeight - scanRegionSize) / 2),
    width: scanRegionSize,
    height: scanRegionSize,
    downScaleFactor: 2,
  };
}

/**
 * Stops scanner and clears all associated resources
 */
function cleanupScanner(
  scannerRef: React.MutableRefObject<QrScanner | null>,
  initTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  isProcessingScan: React.MutableRefObject<boolean>,
  lastScanTime: React.MutableRefObject<number>,
  setIsScanning: (value: boolean) => void
) {
  console.log('Cleaning up scanner');

  isProcessingScan.current = false;
  lastScanTime.current = 0;

  // Clear initialization timeout
  if (initTimeoutRef.current) {
    clearTimeout(initTimeoutRef.current);
    initTimeoutRef.current = null;
  }

  // CRITICAL: Stop the scanner to release camera resources
  if (scannerRef.current) {
    console.log('Stopping scanner');
    void scannerRef.current.stop();
    scannerRef.current = null;
  }

  // Reset scanning state
  setIsScanning(false);
}

// ========================
// Main Component
// ========================

export default function QRScanner({
  onScan,
  onError,
  onClose,
  className = '',
  externalFeedback,
  disableInternalDelay = false,
  isOpen = true
}: QRScannerProps) {
  // ========================
  // Refs
  // ========================
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const onScanRef = useRef(onScan);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTime = useRef<number>(0);
  const isProcessingScan = useRef<boolean>(false);

  // ========================
  // State
  // ========================
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback] = useState<ScanFeedback>({ type: null, message: '' });
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // ========================
  // Update onScan ref when it changes
  // ========================
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // ========================
  // Check camera availability on mount
  // ========================
  useEffect(() => {
    void QrScanner.hasCamera().then(setHasCamera);
  }, []);

  // ========================
  // Stop scanner when modal closes
  // ========================
  useEffect(() => {
    if (!isOpen && scannerRef.current) {
      console.log('Modal closing - stopping scanner');
      void scannerRef.current.stop();
      scannerRef.current = null;
      setIsScanning(false);
      setTorchEnabled(false);
      setTorchSupported(false);

      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  // ========================
  // Scan result handler
  // ========================
  const handleScanResult = async (result: QrScanner.ScanResult, isMounted: boolean) => {
    if (!isMounted) return;

    // If internal delay is disabled, process immediately
    if (disableInternalDelay) {
      try {
        await onScanRef.current(result.data);
      } catch (error) {
        console.error('Scan processing error:', error);
      }
      return;
    }

    // Apply debouncing logic
    const now = Date.now();
    if (isProcessingScan.current || (now - lastScanTime.current) < INTERNAL_SCAN_DELAY) {
      return;
    }

    isProcessingScan.current = true;
    lastScanTime.current = now;

    try {
      await onScanRef.current(result.data);
    } catch (error) {
      console.error('Scan processing error:', error);
    } finally {
      setTimeout(() => {
        isProcessingScan.current = false;
      }, INTERNAL_SCAN_DELAY);
    }
  };

  // ========================
  // Main scanner initialization effect
  // ========================
  useEffect(() => {
    if (!videoRef.current || !hasCamera || !isOpen) return;

    let isMounted = true;

    // Create scanner instance
    const scanner = new QrScanner(
      videoRef.current,
      (result) => handleScanResult(result, isMounted),
      {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 2,
        calculateScanRegion,
      }
    );

    scannerRef.current = scanner;

    // Set timeout for camera initialization
    initTimeoutRef.current = setTimeout(() => {
      if (!isScanning && isMounted) {
        console.error('Camera initialization timeout');
        setHasCamera(false);
        setCameraError('Không thể khởi động camera sau 10 giây. Vui lòng thử lại.');
        onError?.('Không thể khởi động camera sau 10 giây');

        if (scannerRef.current) {
          void scannerRef.current.stop();
        }
      }
    }, CAMERA_INIT_TIMEOUT);

    // Start scanner
    scanner
      .start()
      .then(async () => {
        if (!isMounted) return;

        // Clear initialization timeout on successful start
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }

        console.log('Scanner started successfully');
        setIsScanning(true);
        setCameraError(null);

        const hasTorch = await scanner.hasFlash();
        setTorchSupported(hasTorch);
      })
      .catch((err: Error) => {
        if (!isMounted) return;

        console.error('Scanner start error:', err);

        // Clear initialization timeout on error
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }

        const errorMessage = getCameraErrorMessage(err);
        setHasCamera(false);
        setCameraError(errorMessage);
        onError?.(errorMessage);

        return err;
      });

    // Cleanup function
    return () => {
      isMounted = false;
      cleanupScanner(scannerRef, initTimeoutRef, isProcessingScan, lastScanTime, setIsScanning);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCamera, isOpen, disableInternalDelay]);

  // ========================
  // Torch toggle handler
  // ========================
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported || !isScanning) {
      console.warn('Cannot toggle torch: scanner not ready');
      return;
    }

    try {
      await scannerRef.current.toggleFlash();
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error('Failed to toggle torch:', err);
      // Reset torch state if toggle fails
      setTorchEnabled(false);
      setTorchSupported(false);
    }
  };

  // ========================
  // Retry handler
  // ========================
  const handleRetry = () => {
    setHasCamera(true);
    setCameraError(null);
    setIsScanning(false);
  };

  // ========================
  // Render: Camera Error State
  // ========================
  if (!hasCamera) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <CameraOff className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-center text-muted-foreground font-medium mb-2">
          {cameraError ?? 'Không tìm thấy camera hoặc không có quyền truy cập'}
        </p>
        <p className="text-center text-sm text-muted-foreground/70 mb-4">
          Vui lòng kiểm tra quyền truy cập camera trong cài đặt trình duyệt
        </p>
        <div className="flex gap-2">
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Đóng
            </Button>
          )}
          <Button onClick={handleRetry}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // ========================
  // Render: Scanner Active State
  // ========================
  return (
    <div className={`relative ${className}`}>
      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {torchSupported && (
          <Button
            onClick={toggleTorch}
            size="icon"
            variant="ghost"
            className="bg-background/80 backdrop-blur-sm"
            aria-label={torchEnabled ? 'Tắt đèn pin' : 'Bật đèn pin'}
          >
            {torchEnabled ? (
              <FlashlightOff className="h-4 w-4" />
            ) : (
              <Flashlight className="h-4 w-4" />
            )}
          </Button>
        )}
        {onClose && (
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="bg-background/80 backdrop-blur-sm"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        aria-label="Camera feed"
      />

      {/* Loading state */}
      {!isScanning && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center">
            <Camera className="h-8 w-8 animate-pulse mb-2" />
            <p className="text-sm text-muted-foreground">Đang khởi động camera...</p>
          </div>
        </div>
      )}

      {/* Scan feedback overlay */}
      {(feedback.type ?? externalFeedback?.type) && (
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
            (feedback.type ?? externalFeedback?.type) === 'success'
              ? 'bg-green-500/20'
              : 'bg-red-500/20'
          }`}
        />
      )}

      {/* Feedback message */}
      {(feedback.message || externalFeedback?.message) && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
          <div
            className={`px-4 py-2 rounded-full ${
              (feedback.type ?? externalFeedback?.type) === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <p className="text-sm font-medium">
              {feedback.message || (externalFeedback?.message ?? '')}
            </p>
          </div>
        </div>
      )}

      {/* Scan region indicators */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 max-w-[300px] max-h-[300px]">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
        </div>
      </div>
    </div>
  );
}
