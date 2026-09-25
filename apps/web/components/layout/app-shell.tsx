"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

const navItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/interviews", label: "Interviews", icon: "briefcase" },
  { href: "/chat", label: "Practice room", icon: "chat" },
  { href: "/report", label: "Reports", icon: "chart" },
  { href: "/profile", label: "My profile", icon: "user" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = navItems.find((item) => item.href === pathname);
  function logout() {
    localStorage.removeItem("accessToken");
    router.push("/login");
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="desktop-sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="spark" />
          </span>
          <span>
            Interview<span className="brand-ai">AI</span>
            <small>YOUR PRACTICE PARTNER</small>
          </span>
        </Link>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation" className="desktop-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={
                pathname === item.href ? "nav-item active" : "nav-item"
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {pathname === item.href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon">
            <Icon name="spark" />
          </span>
          <h3>
            A little practice.
            <br />A lot more confidence.
          </h3>
          <p>Your next opportunity starts with a conversation.</p>
          <Link href="/interviews">
            Let’s practice <Icon name="arrow" />
          </Link>
        </div>
        <button onClick={logout} className="logout-button">
          <Icon name="logout" /> Sign out
        </button>
      </aside>
      <div className="app-body">
        <header className="workspace-header">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{current?.label || "Administration"}</strong>
          </div>
          <div className="header-actions">
            <span className="practice-badge">
              <span /> Built for your next step
            </span>
            <Link
              href="/profile"
              aria-label="Open your profile"
              className="avatar"
            >
              <Icon name="user" />
            </Link>
            <button
              className="mobile-logout"
              onClick={logout}
              aria-label="Sign out"
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="workspace-main">
          {children}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={pathname === item.href ? "active" : ""}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
