import { AppShell } from "@/components/layout/app-shell";
import { ChatPage } from "@/components/chat/chat-page";

export const dynamic = "force-dynamic";

type ChatRouteProps = {
  searchParams: Promise<{
    sessionId?: string;
  }>;
};

export default async function ChatRoute({ searchParams }: ChatRouteProps) {
  const { sessionId = "" } = await searchParams;

  return (
    <AppShell>
      <ChatPage initialSessionId={sessionId} />
    </AppShell>
  );
}