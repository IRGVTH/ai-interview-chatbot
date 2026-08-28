"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string | null;
};

export function GoogleCallbackClient({ token }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace("/login?error=google_missing_token");
      return;
    }

    localStorage.setItem("accessToken", token);
    router.replace("/");
  }, [router, token]);

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Google login failed</h1>
          <p className="mt-2 text-gray-600">
            Missing token from Google login callback.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Signing you in...</h1>
        <p className="mt-2 text-gray-600">
          Please wait while we finish Google authentication.
        </p>
      </div>
    </main>
  );
}