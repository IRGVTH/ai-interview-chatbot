import { AppShell } from "@/components/layout/app-shell";
import { ChatPage } from "@/components/chat/chat-page";

export const dynamic = "force-dynamic";

type ChatRouteProps = {
  searchParams?: {
    sessionId?: string;
  };
};

export default function ChatRoute({ searchParams }: ChatRouteProps) {
  return (
    <AppShell>
      <ChatPage initialSessionId={searchParams?.sessionId ?? ""} />
    </AppShell>
  );
}