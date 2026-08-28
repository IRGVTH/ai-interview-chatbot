import { AppShell } from "@/components/layout/app-shell";
import { ProfilePage } from "@/components/profile/profile-page";

export default function ProfileRoute() {
  return (
    <AppShell>
      <ProfilePage />
    </AppShell>
  );
}