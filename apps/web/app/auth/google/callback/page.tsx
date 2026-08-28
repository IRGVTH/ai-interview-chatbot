"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Missing token from Google login.");
      return;
    }

    localStorage.setItem("accessToken", token);
    router.replace("/");
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Signing you in...</h1>
        <p className="mt-2 text-gray-600">
          Please wait while we finish Google authentication.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}