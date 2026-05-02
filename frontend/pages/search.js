import Upload from "@/components/Upload";
import Chat from "@/components/Chat";
import Navbar from "@/components/Navbar";
import ResumeResults from "@/components/ResumeResults";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildAuthHeaders } from "@/utils/authHeaders";

const STORAGE_KEY = "researchlens-chat-sessions-v1";
const STORAGE_ACTIVE_KEY = "researchlens-active-session-v1";

const createSession = () => ({
  id: `${Date.now()}`,
  title: "New session",
  createdAt: Date.now(),
  messages: [],
  candidates: [],
});

const SearchPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("en");
  const [data, setData] = useState(null);
  const [isPdfUploaded, setIsPdfUploaded] = useState(false);
  const [uploadedPdfFiles, setUploadedPdfFiles] = useState([]);
  const [sessions, setSessions] = useState([createSession()]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const chatEndRef = useRef(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
  const title = "Workspace | Research Lens";
  const description = "Upload a research PDF and ask targeted questions to get contextual answers and insights.";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    const savedSessions = localStorage.getItem(STORAGE_KEY);
    const savedActiveId = localStorage.getItem(STORAGE_ACTIVE_KEY);
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          if (savedActiveId && parsed.some((s) => s.id === savedActiveId)) {
            setActiveSessionId(savedActiveId);
          } else {
            setActiveSessionId(parsed[0].id);
          }
        }
      } catch { /* ignore */ }
    }

    fetch(`${backendUrl}/status`, {
      method: "GET",
      headers: { ...buildAuthHeaders() },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.replace("/login");
          return null;
        }
        if (!res.ok) throw new Error("Status check failed");
        return res.json();
      })
      .then((status) => {
        if (!status) return;
        setIsPdfUploaded(Boolean(status?.uploadedPdfExists));
        setUploadedPdfFiles(status?.uploadedPdfFiles || []);
      })
      .catch(() => {
        setIsPdfUploaded(false);
        setUploadedPdfFiles([]);
      });
  }, [backendUrl, router]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem(STORAGE_ACTIVE_KEY, activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) setActiveSessionId(sessions[0].id);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSessionId]);

  const activeSession = useMemo(() => {
    if (!sessions.length) return createSession();
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const chatArray = activeSession?.messages || [];
  const candidates = activeSession?.candidates || [];

  const updateActiveSession = (messages, nextTitle, nextCandidates) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) return session;
        return {
          ...session,
          messages,
          title: nextTitle || session.title,
          ...(nextCandidates !== undefined && { candidates: nextCandidates }),
        };
      })
    );
  };

  const getResponse = async (question, optimisticMessages) => {
    setIsQuerying(true);
    try {
      const res = await fetch(`${backendUrl}/api`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildAuthHeaders() },
        body: JSON.stringify({ key: 101, query: question, language: lang }),
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/login");
        return;
      }

      const payload = await res.json();
      setData(payload);

      // data is [answerText, hasImage, candidates] when key=101
      const raw = payload?.data;
      const answerText = Array.isArray(raw) && raw.length > 0
        ? raw[0]
        : payload?.error || "No response generated.";
      const nextCandidates = Array.isArray(raw) && raw.length >= 3 ? raw[2] : [];

      const finalizedMessages = [...optimisticMessages];
      finalizedMessages[finalizedMessages.length - 1] = {
        ...finalizedMessages[finalizedMessages.length - 1],
        a: answerText,
      };
      updateActiveSession(finalizedMessages, undefined, nextCandidates);
    } catch (err) {
      const finalizedMessages = [...optimisticMessages];
      finalizedMessages[finalizedMessages.length - 1] = {
        ...finalizedMessages[finalizedMessages.length - 1],
        a: "Failed to get response from backend. Please retry.",
      };
      updateActiveSession(finalizedMessages);
      console.log(err);
    } finally {
      setIsQuerying(false);
    }
  };

  const submitQuery = () => {
    if (!query.trim() || !isPdfUploaded || isQuerying) return;
    const text = query.trim();
    setQuery("");
    const nextTitle = activeSession.title === "New session" ? text.slice(0, 40) : activeSession.title;
    const optimisticMessages = [...chatArray, { q: text, a: "Thinking…" }];
    updateActiveSession(optimisticMessages, nextTitle);
    getResponse(text, optimisticMessages);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") submitQuery();
  };

  const handleSend = () => submitQuery();

  const createNewChat = () => {
    const next = createSession();
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setData(null);
    setQuery("");
  };

  const handleUploadStatusChange = (uploaded, files = []) => {
    setIsPdfUploaded(uploaded);
    if (files.length) {
      setUploadedPdfFiles((prev) => [...new Set([...prev, ...files])]);
    }
  };

  const LANGS = [
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
    { value: "hi", label: "हिन्दी" },
    { value: "ta", label: "தமிழ்" },
    { value: "te", label: "తెలుగు" },
  ];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${siteUrl}/search`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${siteUrl}/search`} />
        <meta property="og:site_name" content="Research Lens" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <div
        className="h-screen flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-void)' }}
      >
        <Navbar />

        <div className="flex flex-1 min-h-0">

          {/* ── Sidebar ── */}
          <aside
            className="flex flex-col border-r"
            style={{
              width: '240px',
              minWidth: '240px',
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* New session button */}
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={createNewChat}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200"
                style={{
                  background: 'rgba(201,168,76,0.07)',
                  borderColor: 'rgba(201,168,76,0.2)',
                  color: 'var(--gold)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.14)';
                  e.currentTarget.style.borderColor = 'var(--gold-dim)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.07)';
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                New Session
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              <div
                className="px-2 py-1.5 text-xs font-mono tracking-widest"
                style={{ color: 'var(--text-muted)' }}
              >
                HISTORY
              </div>
              {sessions.map((session) => {
                const isActive = activeSession?.id === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs transition-all duration-150 border"
                    style={{
                      background: isActive ? 'var(--bg-overlay)' : 'transparent',
                      borderColor: isActive ? 'var(--border-mid)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--bg-raised)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    <div className="truncate font-medium leading-tight">{session.title}</div>
                    <div
                      className="font-mono mt-0.5"
                      style={{ color: 'var(--text-muted)', fontSize: '10px' }}
                    >
                      {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Indexed PDFs footer */}
            <div
              className="p-3 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="text-xs font-mono tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                INDEXED FILES
              </div>
              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                {uploadedPdfFiles.length ? (
                  uploadedPdfFiles.map((file) => (
                    <div
                      key={file}
                      className="truncate text-xs font-mono flex items-center gap-1.5"
                      style={{ color: 'var(--gold)' }}
                    >
                      <span style={{ opacity: 0.5, fontSize: '9px' }}>◈</span>
                      {file}
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    None yet
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Upload controls — fixed height, never scrolls */}
            <div className="px-6 pt-4 pb-2 shrink-0">
              <Upload
                uploadedPdfFiles={uploadedPdfFiles}
                onUploadStatusChange={handleUploadStatusChange}
              />
            </div>

            {/* Divider */}
            <div className="mx-6 shrink-0" style={{ height: '1px', background: 'var(--border-subtle)' }} />

            {/* Chat — fills remaining space, scrolls internally */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              {isPdfUploaded ? (
                <>
                  <Chat chatArray={chatArray} data={data} />
                  <ResumeResults candidates={candidates} />
                  <div ref={chatEndRef} />
                </>
              ) : (
                <div
                  className="h-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed"
                  style={{ borderColor: 'var(--border-mid)' }}
                >
                  <div className="text-2xl font-mono" style={{ color: 'var(--gold-dim)' }}>◈</div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Upload one or more PDFs to start querying.
                  </p>
                </div>
              )}
            </div>

            {/* ── Query bar ── */}
            <div
              className="px-6 py-4 border-t"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'rgba(7,8,13,0.7)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="flex items-center gap-3">
                {/* Language picker */}
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="rounded-xl px-3 py-2.5 text-xs font-mono border transition-all duration-200 shrink-0"
                  style={{
                    background: 'var(--bg-raised)',
                    borderColor: 'var(--border-mid)',
                    color: 'var(--text-secondary)',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {LANGS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>

                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={
                      !isPdfUploaded
                        ? "Upload a PDF first…"
                        : isQuerying
                        ? "Waiting for response…"
                        : "Ask a question about your papers…"
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyUp={handleKeyPress}
                    disabled={!isPdfUploaded || isQuerying}
                    className="w-full rounded-xl px-4 py-2.5 text-sm border transition-all duration-200"
                    style={{
                      background: 'var(--bg-raised)',
                      borderColor: 'var(--border-mid)',
                      color: 'var(--text-primary)',
                      opacity: !isPdfUploaded ? 0.5 : 1,
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-mid)')}
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={!isPdfUploaded || !query.trim() || isQuerying}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 shrink-0 border"
                  style={{
                    background:
                      !isPdfUploaded || !query.trim() || isQuerying
                        ? 'var(--bg-raised)'
                        : 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
                    borderColor:
                      !isPdfUploaded || !query.trim() || isQuerying
                        ? 'var(--border-mid)'
                        : 'transparent',
                    color:
                      !isPdfUploaded || !query.trim() || isQuerying
                        ? 'var(--text-muted)'
                        : '#07080d',
                    cursor:
                      !isPdfUploaded || !query.trim() || isQuerying
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {isQuerying ? '…' : '→'}
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default SearchPage;
