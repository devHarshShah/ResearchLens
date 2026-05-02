import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) router.replace("/search");
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "Login failed");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", payload.token);
      localStorage.setItem("user", JSON.stringify(payload.user));
      router.push("/search");
    } catch (err) {
      setError("Unable to login. Please try again.");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In | Research Lens</title>
      </Head>

      <main
        className="min-h-screen dot-grid flex items-center justify-center px-4"
        style={{ background: 'var(--bg-void)' }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)',
          }}
        />

        <div className="w-full max-w-sm animate-fade-up relative">
          {/* Brand mark */}
          <div className="text-center mb-8">
            <div className="font-serif text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Research<span style={{ color: 'var(--gold)' }}>Lens</span>
            </div>
            <div
              className="text-xs font-mono tracking-widest mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              AI PAPER WORKSPACE
            </div>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8 border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.04)',
            }}
          >
            <h1
              className="font-serif text-2xl mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome back
            </h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>
              Continue your research where you left off.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-mono tracking-wider mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  EMAIL
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm border transition-all duration-200"
                  style={{
                    background: 'var(--bg-raised)',
                    borderColor: 'var(--border-mid)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-mid)')}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-mono tracking-wider mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  PASSWORD
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm border transition-all duration-200"
                  style={{
                    background: 'var(--bg-raised)',
                    borderColor: 'var(--border-mid)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-mid)')}
                />
              </div>

              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm border"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    borderColor: 'rgba(239,68,68,0.2)',
                    color: '#fca5a5',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 mt-2"
                style={{
                  background: loading
                    ? 'var(--bg-overlay)'
                    : 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
                  color: loading ? 'var(--text-muted)' : '#07080d',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 0 24px rgba(201,168,76,0.15)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link
              href="/signup"
              className="transition-colors duration-150"
              style={{ color: 'var(--gold)' }}
              onMouseEnter={e => (e.target.style.color = 'var(--gold-bright)')}
              onMouseLeave={e => (e.target.style.color = 'var(--gold)')}
            >
              Create one free
            </Link>
          </p>
        </div>
      </main>
    </>
  );
};

export default LoginPage;
