"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ChatSession = {
  id: string;
  title: string | null;
  model: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  memory?: string | null;
  interview: {
    id: string;
    title: string;
    position: string;
    experienceLevel: string;
    difficulty: string;
    status: string;
  };
  messages: ChatMessage[];
};

type SessionListItem = {
  id: string;
  title: string | null;
  model: string;
  lastMessageAt: string | null;
  updatedAt: string;
  memory?: string | null;
  interview: {
    id: string;
    title: string;
    position: string;
    experienceLevel: string;
    difficulty: string;
    status: string;
  };
  messages: ChatMessage[];
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

type BrowserWindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

type ChatPageProps = {
  initialSessionId: string;
};

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();
    if (!text.trim()) return fallback;

    const data = JSON.parse(text) as unknown;
    if (typeof data === "object" && data !== null) {
      const maybeMessage = (data as { message?: unknown }).message;

      if (typeof maybeMessage === "string" && maybeMessage.trim()) {
        return maybeMessage;
      }

      if (Array.isArray(maybeMessage)) {
        const joined = maybeMessage
          .map((item) => String(item))
          .filter(Boolean)
          .join(", ");
        return joined || fallback;
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function ChatPage({ initialSessionId }: ChatPageProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSpokenAssistantIdRef = useRef<string | null>(null);

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [sessionId, setSessionId] = useState<string>(initialSessionId);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState("");
  const [voiceError, setVoiceError] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }, []);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    return () => {
      stopListening();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    async function loadSessions() {
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const data = await apiFetch<SessionListItem[]>("/chat/sessions", {
          token,
        });

        setSessions(data);

        const nextSessionId = initialSessionId || data[0]?.id || "";

        if (!nextSessionId) {
          setActiveSession(null);
          setSessionId("");
          return;
        }

        setSessionId(nextSessionId);

        if (!initialSessionId) {
          router.replace(`/chat?sessionId=${nextSessionId}`);
        }

        const selected = await apiFetch<ChatSession>(
          `/chat/sessions/${nextSessionId}`,
          { token },
        );

        setActiveSession(selected);
      } catch (err: unknown) {
        const messageText = getErrorMessage(err, "Failed to load chat");
        setError(messageText);

        if (messageText.toLowerCase().includes("unauthorized")) {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadSessions();
  }, [initialSessionId, router, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  function speakText(text: string) {
    if (typeof window === "undefined") return;

    if (!("speechSynthesis" in window)) {
      setVoiceError("This browser does not support voice output.");
      return;
    }

    const cleaned = text.trim();
    if (!cleaned) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "th-TH";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }

  function stopListening() {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }

    recognitionRef.current = null;
    setIsListening(false);
  }

  function startListening() {
    if (typeof window === "undefined") return;

    const speechWindow = window as BrowserWindowWithSpeechRecognition;
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceError("This browser does not support voice input.");
      return;
    }

    setVoiceError("");

    const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "th-TH";

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setMessage((finalTranscript + interimTranscript).trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorLike) => {
      setVoiceError(event.error || "Voice input failed.");
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  async function switchSession(nextSessionId: string) {
    if (!token) return;

    setSessionId(nextSessionId);
    router.replace(`/chat?sessionId=${nextSessionId}`);

    try {
      const selected = await apiFetch<ChatSession>(
        `/chat/sessions/${nextSessionId}`,
        { token },
      );
      setActiveSession(selected);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load chat session"));
    }
  }

  async function handleSendMessage(content: string) {
    if (!token || !sessionId || !content.trim() || isStreaming) return;
    if (!apiBaseUrl) {
      setError("API URL is not configured");
      return;
    }

    const cleanedContent = content.trim();

    setMessage("");
    setIsStreaming(true);
    setError("");
    setVoiceError("");

    const tempUserId = crypto.randomUUID();
    const tempAssistantId = crypto.randomUUID();
    const now = new Date().toISOString();

    setActiveSession((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: tempUserId,
            role: "user",
            content: cleanedContent,
            createdAt: now,
          },
          {
            id: tempAssistantId,
            role: "assistant",
            content: "",
            createdAt: now,
          },
        ],
      };
    });

    try {
      const res = await fetch(
        `${apiBaseUrl}/chat/sessions/${sessionId}/messages/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: cleanedContent }),
        },
      );

      if (!res.ok || !res.body) {
        const messageText = await readErrorMessage(
          res,
          "Failed to send message",
        );
        throw new Error(messageText);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value, { stream: true });

        setActiveSession((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === tempAssistantId
                ? { ...msg, content: assistantText }
                : msg,
            ),
          };
        });
      }

      assistantText += decoder.decode();

      const refreshed = await apiFetch<ChatSession>(
        `/chat/sessions/${sessionId}`,
        { token },
      );

      setActiveSession(refreshed);
      setSessions((prev) =>
        prev.map((item) =>
          item.id === refreshed.id
            ? {
                ...item,
                lastMessageAt: refreshed.lastMessageAt,
                messages: refreshed.messages,
              }
            : item,
        ),
      );

      const lastAssistant = refreshed.messages
        .slice()
        .reverse()
        .find((m) => m.role === "assistant");

      if (
        autoSpeak &&
        lastAssistant &&
        lastAssistant.id !== lastSpokenAssistantIdRef.current
      ) {
        lastSpokenAssistantIdRef.current = lastAssistant.id;
        speakText(lastAssistant.content);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send message"));

      try {
        const refreshed = await apiFetch<ChatSession>(
          `/chat/sessions/${sessionId}`,
          { token },
        );
        setActiveSession(refreshed);
        setSessions((prev) =>
          prev.map((item) =>
            item.id === refreshed.id
              ? {
                  ...item,
                  lastMessageAt: refreshed.lastMessageAt,
                  messages: refreshed.messages,
                }
              : item,
          ),
        );
      } catch {
        // ignore
      }
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleClearChat() {
    if (!token || !sessionId) return;

    const confirmed = window.confirm("Clear all messages in this chat?");
    if (!confirmed) return;

    try {
      await apiFetch(`/chat/sessions/${sessionId}/messages`, {
        method: "DELETE",
        token,
      });

      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              messages: [],
              lastMessageAt: null,
            }
          : prev,
      );

      setSessions((prev) =>
        prev.map((item) =>
          item.id === sessionId ? { ...item, lastMessageAt: null } : item,
        ),
      );

      window.speechSynthesis?.cancel();
      lastSpokenAssistantIdRef.current = null;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to clear chat"));
    }
  }

  function handleSpeakLastResponse() {
    if (!activeSession) return;

    const lastAssistant = activeSession.messages
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");

    if (!lastAssistant?.content) return;

    lastSpokenAssistantIdRef.current = lastAssistant.id;
    speakText(lastAssistant.content);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-6xl">
          <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="h-[70vh] animate-pulse rounded-3xl bg-gray-200" />
            <div className="h-[70vh] animate-pulse rounded-3xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-black md:text-gray-500">Interview Chat</p>
              <h1 className="text-3xl font-bold text-black">Practice with Gemini</h1>
              <p className="mt-1 text-black md:text-gray-600">
                Continuous chat, memory prompt, voice input, and voice reply.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.speechSynthesis?.cancel()}
                className="rounded-xl border px-4 py-2 text-sm text-black"
              >
                Stop voice
              </button>
              <button
                type="button"
                onClick={handleSpeakLastResponse}
                className="rounded-xl border px-4 py-2 text-sm text-black"
                disabled={!activeSession?.messages?.length}
              >
                Read last reply
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded-xl border px-4 py-2 text-sm text-black"
              >
                Clear chat
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-black md:text-gray-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
              />
              Auto read replies
            </label>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase text-black">
              {isStreaming ? "Streaming..." : "Ready"}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase text-black">
              {isListening ? "Listening..." : "Mic off"}
            </span>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        {voiceError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            {voiceError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-black">Sessions</h2>
                <p className="text-sm text-black md:text-gray-500">
                  Auto-select latest session
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-black md:text-gray-500">
                  No chat sessions yet. Create one from Interviews.
                </div>
              ) : (
                sessions.map((item) => {
                  const active = item.id === sessionId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void switchSession(item.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-black">
                            {item.title || item.interview.title || "Practice Chat"}
                          </p>
                          <p className="mt-1 text-xs text-black md:text-gray-500">
                            {item.interview.position}
                          </p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase text-black">
                          {item.model}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-h-[60vh] flex-col rounded-3xl bg-white shadow-sm lg:h-[70vh]">
            <div className="border-b p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-black">
                    {activeSession?.title || activeSession?.interview.title || "Chat"}
                  </h2>
                  <p className="text-sm text-black md:text-gray-500">
                    {activeSession?.interview.position} •{" "}
                    {activeSession?.interview.experienceLevel} •{" "}
                    {activeSession?.interview.difficulty}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      startListening();
                    }}
                    className="rounded-xl border px-4 py-2 text-sm text-black"
                  >
                    {isListening ? "Listening..." : "Use mic"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeSession?.messages?.length ? (
                <div className="space-y-4">
                  {activeSession.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed p-8 text-center text-black md:text-gray-500">
                  Start the conversation by sending your first message.
                </div>
              )}
            </div>

            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                void handleSendMessage(message);
              }}
              className="border-t p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                  className="min-h-14 flex-1 resize-none rounded-2xl border px-4 py-3 text-black outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="Type your answer..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isStreaming) {
                        void handleSendMessage(message);
                      }
                    }
                  }}
                />

                <div className="flex gap-2 sm:flex-col">
                  <button
                    type="submit"
                    disabled={isStreaming || !message.trim()}
                    className="rounded-2xl bg-black px-5 py-3 text-white disabled:opacity-50"
                  >
                    {isStreaming ? "Sending..." : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    className="rounded-2xl border px-5 py-3 text-black"
                  >
                    {isListening ? "Stop mic" : "Mic"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "bg-black text-white"
            : "border bg-white text-black shadow-sm"
        }`}
      >
        {content || (isUser ? "..." : "Typing...")}
      </div>
    </div>
  );
}