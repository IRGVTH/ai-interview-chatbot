import { GoogleCallbackClient } from "./google-callback-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function GoogleCallbackPage({ searchParams }: PageProps) {
  return <GoogleCallbackClient token={searchParams?.token ?? null} />;
}