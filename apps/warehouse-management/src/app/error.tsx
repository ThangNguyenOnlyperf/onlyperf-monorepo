'use client';

import { useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Đã xảy ra lỗi</CardTitle>
          <CardDescription className="text-base">
            Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest && (
            <div className="rounded-md bg-muted p-3 text-center">
              <p className="text-xs text-muted-foreground">
                Mã lỗi: <code className="font-mono">{error.digest}</code>
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={reset}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>

            <Link href="/dashboard" className="w-full">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Về trang chủ
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Nếu lỗi tiếp tục xảy ra, vui lòng liên hệ quản trị viên
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
