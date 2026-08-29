import { GoogleCallbackClient } from "./google-callback-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function GoogleCallbackPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  return <GoogleCallbackClient token={token ?? null} />;
}