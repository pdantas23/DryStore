import { ReactNode } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { LogOut } from "lucide-react";

type DashboardLayoutProps = {
  children: ReactNode;
  navItems?: { label: string; href: string }[];
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="relative mx-auto flex w-full max-w-screen-xl items-center justify-end px-4 py-3 sm:px-6 sm:py-4">

          {/* Logo centralizada */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain sm:h-9 sm:w-9" />
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Encerrar sessão</span>
            <span className="sm:hidden">Sair</span>
          </button>

        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
