const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const renderMarkdownToHtml = (text) => {
  if (!text) return '';

  let html = escapeHtml(text)
    .replace(/\r\n/g, '\n')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(?:<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (
        block.startsWith('<h1>') ||
        block.startsWith('<h2>') ||
        block.startsWith('<h3>') ||
        block.startsWith('<ul>')
      ) return block;
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  return html;
};

const Chat = ({ chatArray }) => {
  const messages = chatArray.map((ele, idx) => (
    <div key={`${idx}-${ele.q}`} className="flex flex-col gap-3 mb-6 animate-fade-in">
      {/* User bubble — right */}
      <div className="flex justify-end">
        <div
          className="max-w-[78%] px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
          style={{
            background: '#1e3a5f',
            color: '#e0f0ff',
            fontWeight: 500,
            border: '1px solid rgba(96,165,250,0.25)',
          }}
        >
          {ele.q}
        </div>
      </div>

      {/* AI bubble — left */}
      <div className="flex justify-start">
        <div className="flex gap-3 max-w-[88%]">
          {/* AI avatar dot */}
          <div className="shrink-0 mt-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center font-mono"
              style={{
                background: '#2d1f42',
                border: '1px solid rgba(167,139,250,0.4)',
                color: '#c4b5fd',
                fontSize: '9px',
              }}
            >
              ◈
            </div>
          </div>

          <div
            className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm md-body"
            style={{
              background: '#1a1528',
              border: '1px solid rgba(167,139,250,0.25)',
              color: '#ede9fe',
              lineHeight: '1.75',
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(ele.a) }}
          />
        </div>
      </div>
    </div>
  ));

  return (
    <section className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-1 py-2">
        {chatArray.length ? (
          messages
        ) : (
          <div
            className="h-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed"
            style={{ borderColor: 'var(--border-mid)' }}
          >
            <div
              className="text-3xl font-mono"
              style={{ color: 'var(--gold-dim)' }}
            >
              ◈
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Upload PDFs and ask your first question.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Chat;
