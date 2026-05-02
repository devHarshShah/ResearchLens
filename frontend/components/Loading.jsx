const Loading = () => (
  <div className="flex items-center justify-center gap-2 py-2">
    <div
      className="w-5 h-5 rounded-full border-2 animate-spin-slow"
      style={{
        borderColor: 'var(--gold-dim)',
        borderTopColor: 'var(--gold)',
      }}
    />
    <span
      className="text-xs font-mono tracking-widest"
      style={{ color: 'var(--text-muted)' }}
    >
      PROCESSING…
    </span>
  </div>
);

export default Loading;
