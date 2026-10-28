import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getMenu } from "@/lib/menuService";
import { getAllAdminUsers } from "@/lib/userService";
import { checkDatabaseConnection } from "@/lib/mongodb";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    redirect("/admin/login");
  }

  const [menu, dbStatus] = await Promise.all([
    getMenu(true),
    checkDatabaseConnection(),
  ]);

  const staffList = currentUser.role === "superadmin" ? await getAllAdminUsers() : [];

  return (
    <div className="site-shell min-h-screen bg-[#f7f4ee]">
      <AdminDashboard
        initialMenu={menu}
        currentUser={currentUser}
        initialStaffList={staffList}
        dbStatus={dbStatus}
      />
    </div>
  );
}
