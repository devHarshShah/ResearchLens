const ScoreBar = ({ label, value, color }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-24 shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
    <div className="flex-1 rounded-full h-1.5" style={{ background: 'var(--bg-overlay)' }}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.round(value * 100))}%`, background: color }}
      />
    </div>
    <span className="w-8 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
      {Math.round(value * 100)}
    </span>
  </div>
);

const CandidateCard = ({ candidate, rank }) => {
  const name = candidate.source_pdf?.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ') || 'Unknown';

  // ATS score = final pipeline score scaled to 0-100.
  // score_final is already a weighted combination of all signals — this IS our system's judgment.
  const atsPct = Math.round((candidate.score_final ?? 0) * 100);

  const rankColor = rank === 1 ? 'var(--gold)' : rank === 2 ? '#94a3b8' : '#b45309';

  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
            style={{ background: 'rgba(201,168,76,0.1)', color: rankColor, border: `1px solid ${rankColor}` }}
          >
            {rank}
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              p.{candidate.page_number + 1} · {candidate.source_pdf}
            </div>
          </div>
        </div>
        {/* ATS badge — derived from our pipeline's final score */}
        <div
          className="shrink-0 px-2 py-1 rounded-lg text-xs font-mono font-bold"
          style={{
            background: atsPct >= 70 ? 'rgba(34,197,94,0.12)' : atsPct >= 45 ? 'rgba(201,168,76,0.12)' : 'rgba(239,68,68,0.10)',
            color: atsPct >= 70 ? '#4ade80' : atsPct >= 45 ? 'var(--gold)' : '#f87171',
            border: `1px solid ${atsPct >= 70 ? 'rgba(34,197,94,0.25)' : atsPct >= 45 ? 'rgba(201,168,76,0.25)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          ATS {atsPct}
        </div>
      </div>

      {/* Score breakdown — all bars normalized to [0,1] within this candidate set */}
      <div className="flex flex-col gap-1.5">
        <ScoreBar label="Semantic"    value={candidate.score_semantic ?? 0}  color="#818cf8" />
        <ScoreBar label="TF-IDF"      value={candidate.score_tfidf ?? 0}     color="#34d399" />
        <ScoreBar label="Skill boost" value={candidate.score_skill ?? 0}     color="var(--gold)" />
        <ScoreBar label="Cross-enc."  value={candidate.score_cross_encoder ?? 0} color="#f472b6" />
        <ScoreBar label="Final"       value={candidate.score_final ?? 0}     color="#60a5fa" />
      </div>
    </div>
  );
};

const ResumeResults = ({ candidates }) => {
  if (!candidates?.length) return null;

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="text-xs font-mono tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
        CANDIDATE RANKING · {candidates.length} RESULTS
      </div>
      <div className="flex flex-col gap-2">
        {candidates.map((c, i) => (
          <CandidateCard
            key={`${c.source_pdf}-${c.page_number}-${i}`}
            candidate={c}
            rank={i + 1}
          />
        ))}
      </div>
      <div className="text-xs font-mono px-1 pt-1" style={{ color: 'var(--text-muted)' }}>
        Pipeline: bi-encoder (all-mpnet-base-v2, 768d) → hybrid score (TF-IDF + skill boost) → cross-encoder rerank (ms-marco-MiniLM-L-6-v2)
      </div>
    </div>
  );
};

export default ResumeResults;
