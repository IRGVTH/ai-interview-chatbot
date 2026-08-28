import { AdminPage } from "@/components/admin/admin-page";
import { AppShell } from "@/components/layout/app-shell";


export default function ChatRoute() {
  return (
    <AppShell>
      <AdminPage />
    </AppShell>
  );
}