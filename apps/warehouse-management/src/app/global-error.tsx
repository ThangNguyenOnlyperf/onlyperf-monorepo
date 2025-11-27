'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '2px solid #fee2e2',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
              }}
            >
              ⚠️
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '12px',
                color: '#111827',
              }}
            >
              Lỗi nghiêm trọng
            </h1>

            <p
              style={{
                fontSize: '16px',
                color: '#6b7280',
                marginBottom: '24px',
              }}
            >
              Ứng dụng gặp lỗi nghiêm trọng. Vui lòng thử lại hoặc liên hệ quản trị viên.
            </p>

            {error.digest && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  marginBottom: '24px',
                }}
              >
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Mã lỗi: <code style={{ fontFamily: 'monospace' }}>{error.digest}</code>
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={reset}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
              >
                🔄 Thử lại
              </button>

              <a
                href="/dashboard"
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#3b82f6',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'all 0.2s',
                }}
              >
                🏠 Về trang chủ
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
