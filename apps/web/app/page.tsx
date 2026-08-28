import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default function HomePage() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}