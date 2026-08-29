const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};function normalizeErrorMessage(
  message: unknown,
  fallback = "Request failed",
): string {
  if (typeof message === "string" && message.trim()) return message;

  if (Array.isArray(message)) {
    const joined = message.map(String).filter(Boolean).join(", ");
    return joined || fallback;
  }

  if (message && typeof message === "object") {
    const maybe = (message as { message?: unknown }).message;
    return normalizeErrorMessage(maybe, fallback);
  }

  return fallback;
}
export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

   const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      normalizeErrorMessage((data as { message?: unknown })?.message, "Request failed"),
    );
  }

  return data as T;
}