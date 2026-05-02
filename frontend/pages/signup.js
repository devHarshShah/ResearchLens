import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

const SignupPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "Signup failed");
        setLoading(false);
        return;
      }
      router.push("/login");
    } catch (err) {
      setError("Unable to sign up. Please try again.");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    background: 'var(--bg-raised)',
    borderColor: 'var(--border-mid)',
    color: 'var(--text-primary)',
  };

  return (
    <>
      <Head>
        <title>Create Account | Research Lens</title>
      </Head>

      <main
        className="min-h-screen dot-grid flex items-center justify-center px-4"
        style={{ background: 'var(--bg-void)' }}
      >
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

          <div
            className="rounded-2xl p-8 border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.04)',
            }}
          >
            <h1 className="font-serif text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Create account
            </h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>
              Your AI research workspace, ready in seconds.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { id: 'username', label: 'USERNAME', type: 'text', value: username, set: setUsername, placeholder: 'researcher_42' },
                { id: 'email',    label: 'EMAIL',    type: 'email', value: email, set: setEmail,    placeholder: 'you@institution.edu' },
                { id: 'password', label: 'PASSWORD', type: 'password', value: password, set: setPassword, placeholder: '••••••••' },
              ].map(({ id, label, type, value, set, placeholder }) => (
                <div key={id}>
                  <label
                    htmlFor={id}
                    className="block text-xs font-mono tracking-wider mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {label}
                  </label>
                  <input
                    id={id}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm border transition-all duration-200"
                    style={fieldStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-mid)')}
                  />
                </div>
              ))}

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
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="transition-colors duration-150"
              style={{ color: 'var(--gold)' }}
              onMouseEnter={e => (e.target.style.color = 'var(--gold-bright)')}
              onMouseLeave={e => (e.target.style.color = 'var(--gold)')}
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </>
  );
};

export default SignupPage;
