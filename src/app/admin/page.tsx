import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getMenu } from "@/lib/menuService";
import { getAllAdminUsers } from "@/lib/userService";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    redirect("/admin/login");
  }

  const menu = await getMenu(true);
  const staffList = currentUser.role === "superadmin" ? await getAllAdminUsers() : [];

  return (
    <div className="site-shell min-h-screen bg-[#f7f4ee]">
      <AdminDashboard
        initialMenu={menu}
        currentUser={currentUser}
        initialStaffList={staffList}
      />
    </div>
  );
}
