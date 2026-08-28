"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSpokenAssistantIdRef = useRef<string | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [sessionId, setSessionId] = useState<string>(
    searchParams.get("sessionId") || "",
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voiceError, setVoiceError] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }, []);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
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

        const initialSessionId =
          searchParams.get("sessionId") || data[0]?.id || "";

        if (!initialSessionId) {
          setActiveSession(null);
          setSessionId("");
          setLoading(false);
          return;
        }

        setSessionId(initialSessionId);

        if (!searchParams.get("sessionId")) {
          router.replace(`/chat?sessionId=${initialSessionId}`);
        }

        const selected = await apiFetch<ChatSession>(
          `/chat/sessions/${initialSessionId}`,
          { token },
        );

        setActiveSession(selected);
      } catch (err: any) {
        setError(err.message || "Failed to load chat");
        if (String(err.message).toLowerCase().includes("unauthorized")) {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [router, searchParams, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speakText(text: string) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setVoiceError("Speech synthesis is not supported in this browser.");
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

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceError("Speech recognition is not supported in this browser.");
      return;
    }

    setVoiceError("");

    const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "th-TH";

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (event: any) => {
      setVoiceError(event?.error || "Voice input failed.");
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
    } catch (err: any) {
      setError(err.message || "Failed to load chat session");
    }
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !sessionId || !message.trim() || isStreaming) return;

    const content = message.trim();
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
            content,
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

    let assistantText = "";

    try {
      const res = await fetch(
        `${API_URL}/chat/sessions/${sessionId}/messages/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        },
      );

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to send message");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

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

      if (autoSpeak && lastAssistant && lastAssistant.id !== lastSpokenAssistantIdRef.current) {
        lastSpokenAssistantIdRef.current = lastAssistant.id;
        speakText(lastAssistant.content);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message");

      try {
        const refreshed = await apiFetch<ChatSession>(
          `/chat/sessions/${sessionId}`,
          { token },
        );
        setActiveSession(refreshed);
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

  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    setVoiceError("This browser does not support voice input.");
    return;
  }

  setVoiceError("");

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let finalTranscript = "";

  recognition.onresult = (event: any) => {
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

  recognition.onerror = (event: any) => {
    setVoiceError(event?.error || "Voice input failed.");
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
    } catch (err: any) {
      setError(err.message || "Failed to clear chat");
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
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Chat practice</p>
          <h1 className="mt-1 text-3xl font-bold">Interview Chat</h1>
          <p className="mt-2 text-gray-600">
            Practice with Gemini, speak your answer, and let the AI reply with
            memory from the conversation.
          </p>
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        {voiceError ? (
          <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            {voiceError}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Sessions</h2>
              <p className="text-sm text-gray-500">
                Choose a practice conversation
              </p>
            </div>

            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-gray-500">
                  No chat sessions yet. Create one from the Interview page.
                </div>
              ) : (
                sessions.map((session) => {
                  const selected = session.id === sessionId;

                  return (
                    <button
                      key={session.id}
                      onClick={() => switchSession(session.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-medium">
                        {session.title || "Practice Chat"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {session.interview.position} •{" "}
                        {session.interview.experienceLevel} •{" "}
                        {session.interview.difficulty}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex h-[70vh] flex-col rounded-3xl bg-white shadow-sm">
            {activeSession ? (
              <>
                <div className="border-b p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {activeSession.title || "Practice Chat"}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {activeSession.interview.position} •{" "}
                        {activeSession.interview.experienceLevel} •{" "}
                        {activeSession.interview.difficulty}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
  <button
    onClick={() => setAutoSpeak((prev) => !prev)}
    className={`rounded-xl border px-4 py-2 text-sm ${
      autoSpeak ? "bg-black text-white" : "bg-white"
    }`}
  >
    {autoSpeak ? "Auto speak: ON" : "Auto speak: OFF"}
  </button>

  <button
    onClick={handleSpeakLastResponse}
    disabled={isStreaming}
    className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
  >
    Speak last response
  </button>

  <button
    onClick={handleClearChat}
    disabled={isStreaming}
    className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
  >
    Clear chat
  </button>
</div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                    <span className="font-medium">Memory:</span>{" "}
                    {activeSession.memory || "No saved memory yet."}
                  </div>

                  {isStreaming ? (
                    <p className="mt-2 text-sm text-gray-500">
                      Gemini is typing...
                    </p>
                  ) : null}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {activeSession.messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-gray-500">
                      Start the conversation by sending your first answer.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSession.messages.map((msg) => (
                        <ChatBubble key={msg.id} message={msg} />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <form onSubmit={handleSend} className="border-t p-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (isListening) {
                          stopListening();
                        } else {
                          startListening();
                        }
                      }}
                      className={`self-end rounded-2xl border px-4 py-3 text-sm ${
                        isListening ? "border-red-300 bg-red-50" : "bg-white"
                      }`}
                    >
                      {isListening ? "Stop Mic" : "🎤 Mic"}
                    </button>

                    <textarea
                      className="min-h-14 flex-1 resize-none rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
                      placeholder="Type your answer..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isStreaming}
                    />

                    <button
                      type="submit"
                      disabled={isStreaming || !message.trim()}
                      className="self-end rounded-2xl bg-black px-5 py-3 text-white disabled:opacity-50"
                    >
                      {isStreaming ? "Thinking..." : "Send"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-gray-500">
                No active session. Create a session from the Interview page.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser ? "bg-black text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}