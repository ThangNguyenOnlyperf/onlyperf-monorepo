import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import CreateUserForm from "~/components/admin/CreateUserForm";
import UserRoleToggle from "~/components/admin/UserRoleToggle";
import ChangePasswordModal from "~/components/admin/ChangePasswordModal";
import DeleteUserButton from "~/components/admin/DeleteUserButton";
import { desc } from "drizzle-orm";

async function getData() {
  const hdrs = new Headers();
  const cs = await cookies();
  const cookieStr = cs.getAll().map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join("; ");
  if (cookieStr) hdrs.set("cookie", cookieStr);
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "admin") redirect("/dashboard");
  const users = await db.select().from(user).orderBy(desc(user.createdAt));
  return { users };
}

export default async function AdminUsersPage() {
  const { users } = await getData();

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Quản lý người dùng</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tạo tài khoản nhân viên</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Tên</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Vai trò</th>
                  <th className="py-2 pr-4">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{u.name}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4 capitalize">{u.role}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2 items-center">
                        <UserRoleToggle userId={u.id} currentRole={u.role} />
                        <ChangePasswordModal userId={u.id} userEmail={u.email} />
                        <DeleteUserButton userId={u.id} userEmail={u.email} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
