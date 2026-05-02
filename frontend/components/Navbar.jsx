import { useEffect, useState } from 'react';

const Navbar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  return (
    <nav
      className="flex w-full items-center justify-between px-6 py-3 border-b"
      style={{
        background: 'rgba(7,8,13,0.85)',
        borderColor: 'var(--border-subtle)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div className="font-serif text-xl" style={{ color: 'var(--text-primary)' }}>
        Research<span style={{ color: 'var(--gold)' }}>Lens</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-5">
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-mono"
              style={{
                background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
                color: '#07080d',
              }}
            >
              {(user.username || user.email || 'U')[0].toUpperCase()}
            </div>
            <span
              className="text-xs font-mono max-w-[140px] truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {user.username || user.email}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="text-xs font-mono tracking-wider px-3 py-1.5 rounded-lg border transition-all duration-200"
          style={{
            borderColor: 'var(--border-mid)',
            color: 'var(--text-muted)',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
            e.currentTarget.style.color = '#fca5a5';
            e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-mid)';
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          LOGOUT
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
