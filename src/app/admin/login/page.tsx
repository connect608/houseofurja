import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import LoginForm from "./LoginForm";
import BrandMark from "@/components/ui/BrandMark";

export default async function AdminLoginPage() {
  const authed = await isAuthenticated();
  if (authed) {
    redirect("/admin");
  }

  return (
    <div className="site-shell flex min-h-screen items-center justify-center p-4 bg-[#f7f4ee]">
      <div className="w-full max-w-md bg-white/80 p-6 sm:p-8 border border-[#2e1c18]/20 shadow-xs">
        <div className="flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-6 text-2xl font-serif text-[#2e1c18]">
            Admin Portal
          </h1>
          <p className="mt-2 text-sm text-[#2e1c18]/70">
            Enter your credentials to update menu items and specials.
          </p>
        </div>

        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
