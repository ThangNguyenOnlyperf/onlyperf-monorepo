"use client";

import { useSession } from "~/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";


export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null | undefined;
  role: string;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Thông tin tài khoán</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Chào mừng trở lại!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Tên:</strong> {session?.user.name}</p>
                <p><strong>Email:</strong> {session?.user.email}</p>
                <p><strong>Email đã xác minh:</strong> {session?.user.emailVerified ? 'Có' : 'Chưa'}</p>
                <p><strong>Vai trò:</strong> {session?.user.role === "admin" ? "Quản trị viên" : "Người dùng"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin phiên</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>ID phiên:</strong> {session?.session.id.slice(0, 8)}...</p>
                <p><strong>Được tạo:</strong> {new Date(session?.session.createdAt ?? '').toLocaleDateString('vi-VN')}</p>
                <p><strong>Hết hạn:</strong> {new Date(session?.session.expiresAt ?? '').toLocaleDateString('vi-VN')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
} 