import Link from "next/link";

export function AppSidebar() {
  return (
    <aside className="w-64 border-r p-4">
      <div className="mb-6 text-xl font-semibold">AI Interview</div>

      <nav className="space-y-2">
        <Link href="/" className="block rounded-lg px-3 py-2 hover:bg-gray-100">
          Dashboard
        </Link>
        <Link href="/interviews" className="block rounded-lg px-3 py-2 hover:bg-gray-100">
          Interviews
        </Link>
        <Link href="/chat" className="block rounded-lg px-3 py-2 hover:bg-gray-100">
          Chat
        </Link>
        <Link href="/report" className="block rounded-lg px-3 py-2 hover:bg-gray-100">
          Report
        </Link>
        <Link href="/profile" className="block rounded-lg px-3 py-2 hover:bg-gray-100">
          Profile
        </Link>
      </nav>
    </aside>
  );
}