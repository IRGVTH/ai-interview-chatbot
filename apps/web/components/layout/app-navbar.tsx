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

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("accessToken");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          AI Interview Chatbot
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-black text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <button
            onClick={handleLogout}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="border-t bg-white md:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}