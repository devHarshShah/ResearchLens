import Head from 'next/head';
import Link from 'next/link';

const features = [
  {
    icon: '◈',
    title: 'Semantic Search',
    body: 'Ask questions in plain language. The engine locates answers across all indexed papers simultaneously.',
  },
  {
    icon: '◉',
    title: 'Multi-Paper Context',
    body: 'Upload an entire corpus. Responses draw on cross-document evidence, not just a single file.',
  },
  {
    icon: '◎',
    title: 'Multilingual Output',
    body: 'Receive answers in English, French, Hindi, Tamil, or Telugu — without re-uploading.',
  },
];

export default function Home() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const title = 'Research Lens | Understand Papers Faster';
  const description =
    'Upload research papers and get AI-powered answers, summaries, and contextual insights in multiple languages.';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${siteUrl}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${siteUrl}/`} />
        <meta property="og:site_name" content="Research Lens" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <main
        className="min-h-screen dot-grid flex flex-col"
        style={{ background: 'var(--bg-void)' }}
      >
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-5 animate-fade-in">
          <div className="font-serif text-xl" style={{ color: 'var(--text-primary)' }}>
            Research<span style={{ color: 'var(--gold)' }}>Lens</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.target.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.target.style.color = 'var(--text-secondary)')}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 rounded-lg border transition-all duration-200"
              style={{
                borderColor: 'var(--gold-dim)',
                color: 'var(--gold)',
                background: 'rgba(201,168,76,0.06)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.14)';
                e.currentTarget.style.borderColor = 'var(--gold)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(201,168,76,0.06)';
                e.currentTarget.style.borderColor = 'var(--gold-dim)';
              }}
            >
              Get Started
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-24 text-center">
          {/* Label */}
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono tracking-widest mb-8 border"
            style={{
              borderColor: 'rgba(201,168,76,0.25)',
              background: 'rgba(201,168,76,0.06)',
              color: 'var(--gold)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--gold)', animation: 'pulse-gold 2s ease-in-out infinite' }}
            />
            AI-POWERED PAPER ANALYSIS
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up-1 font-serif text-5xl md:text-7xl leading-tight mb-6 max-w-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Read less.{' '}
            <span className="shimmer-text">Understand</span>
            {' '}more.
          </h1>

          <p
            className="animate-fade-up-2 text-lg md:text-xl max-w-xl leading-relaxed mb-10"
            style={{ color: 'var(--text-secondary)' }}
          >
            Upload your research PDFs and ask questions in plain language.
            ResearchLens surfaces the exact answers buried in your papers.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up-3 flex items-center gap-4 flex-wrap justify-center mb-16">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
                color: '#07080d',
                boxShadow: '0 0 32px rgba(201,168,76,0.2)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 48px rgba(201,168,76,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(201,168,76,0.2)')}
            >
              Start for free
              <span style={{ fontSize: '1rem' }}>→</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm border transition-all duration-200"
              style={{
                borderColor: 'var(--border-mid)',
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-mid)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Sign in
            </Link>
          </div>

          <hr className="gold-rule w-48 mb-16 animate-fade-up-3" />

          {/* Feature cards */}
          <div className="animate-fade-up-4 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 text-left transition-all duration-300 border"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                  e.currentTarget.style.background = 'var(--bg-raised)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'var(--bg-surface)';
                }}
              >
                <div
                  className="text-2xl mb-4 font-mono"
                  style={{ color: 'var(--gold)' }}
                >
                  {f.icon}
                </div>
                <h3
                  className="font-serif text-lg mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          className="text-center py-6 text-xs font-mono tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          RESEARCHLENS — AI PAPER WORKSPACE
        </footer>
      </main>
    </>
  );
}
