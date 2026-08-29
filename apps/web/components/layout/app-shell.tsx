"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/interviews", label: "Interviews" },
  { href: "/chat", label: "Chat" },
  { href: "/report", label: "Report" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopSidebar />
      <MobileBottomNav />

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pl-72 md:pr-6 md:py-8 lg:pr-8">
        {children}
      </main>
    </div>
  );
}

function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("accessToken");
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-white/95 backdrop-blur md:flex md:flex-col">
      <div className="flex h-full flex-col p-4">
        <Link href="/" className="mb-8 text-lg font-bold tracking-tight">
          AI Interview Chatbot
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
               ? "bg-black text-white"
               : "text-black hover:bg-gray-100 hover:text-black md:text-gray-700"
              }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border px-4 py-3 text-sm font-medium hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("accessToken");
    router.push("/login");
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-6 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
  active
    ? "bg-black text-white"
    : "text-black hover:bg-gray-100 hover:text-black md:text-gray-700"
}`}
            >
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}