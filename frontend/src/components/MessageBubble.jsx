import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, ChevronDown, ChevronUp, Zap, Target, Tag } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

const INTENT_COLOR = {
  question: '#3b82f6',
  summary_request: '#8b5cf6',
  comparison: '#f59e0b',
  definition: '#10b981',
  other: '#6b7280',
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <Target size={15} style={{ color }} />
      <div style={{ flex: 1, height: 6, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <span style={{ color, fontSize: 14, fontWeight: 700, minWidth: 42 }}>{pct}%</span>
    </div>
  )
}

function Sources({ sources }) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  if (!sources || sources.length === 0) return null
  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: 0,
        }}
      >
        <BookOpen size={15} />
        {sources.length} source{sources.length > 1 ? 's' : ''}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sources.map((s, i) => (
            <div key={i} style={{
              background: theme.bgSurface3, borderRadius: 8, padding: '12px 14px',
              border: `1px solid ${theme.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: theme.primaryLight, fontSize: 14, fontWeight: 600 }}>
                  [{i + 1}] {s.document_title}
                </span>
                <span style={{ color: theme.textFaint, fontSize: 13 }}>
                  chunk {s.chunk_index} · {Math.round(s.relevance_score * 100)}% match
                </span>
              </div>
              <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkflowSteps({ steps }) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  if (!steps || steps.length === 0) return null
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', color: theme.textFaintest, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0,
        }}
      >
        <Zap size={13} /> Workflow steps {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div style={{ marginTop: 8, paddingLeft: 14, borderLeft: `2px solid ${theme.border}` }}>
          {steps.map((s, i) => (
            <div key={i} style={{ color: theme.textFaint, fontSize: 13, marginBottom: 5 }}>
              <span style={{ color: theme.primaryLight, fontWeight: 600 }}>Step {s.step}:</span> {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MessageBubble({ message }) {
  const { theme } = useTheme()
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{
          maxWidth: '72%', background: theme.userBubble, color: '#fff',
          borderRadius: '20px 20px 5px 20px', padding: '14px 20px',
          fontSize: 17, lineHeight: 1.65,
        }}>
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', background: theme.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 16, fontWeight: 700, color: '#fff',
      }}>
        A
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {(message.intent || message.confidence !== null) && !message.streaming && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            {message.intent && (
              <span style={{
                fontSize: 13, padding: '3px 12px', borderRadius: 12,
                background: `${INTENT_COLOR[message.intent] || '#888'}22`,
                color: INTENT_COLOR[message.intent] || '#888',
                border: `1px solid ${INTENT_COLOR[message.intent] || '#888'}44`,
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Tag size={12} /> {message.intent.replace('_', ' ')}
              </span>
            )}
            {message.confidence !== null && (
              <div style={{ flex: 1, minWidth: 140, maxWidth: 240 }}>
                <ConfidenceBar value={message.confidence} />
              </div>
            )}
          </div>
        )}

        <div style={{ color: theme.textSecondary, fontSize: 17, lineHeight: 1.75 }}>
          {message.streaming && message.content === '' ? (
            <span style={{ color: theme.textFaintest, animation: 'pulse 1s infinite' }}>Thinking...</span>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ inline, children }) => inline
                  ? <code style={{ background: theme.border, borderRadius: 5, padding: '2px 8px', fontSize: 15, color: theme.primaryLight }}>{children}</code>
                  : <pre style={{ background: theme.bgDeep, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 18, overflow: 'auto', margin: '14px 0' }}><code style={{ color: theme.textSecondary, fontSize: 14 }}>{children}</code></pre>,
                p: ({ children }) => <p style={{ margin: '0 0 14px' }}>{children}</p>,
                ul: ({ children }) => <ul style={{ paddingLeft: 22, margin: '0 0 14px' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: 22, margin: '0 0 14px' }}>{children}</ol>,
                li: ({ children }) => <li style={{ marginBottom: 6 }}>{children}</li>,
                h1: ({ children }) => <h1 style={{ color: theme.text, fontSize: 22, fontWeight: 700, margin: '18px 0 10px' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ color: theme.text, fontSize: 19, fontWeight: 600, margin: '16px 0 8px' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ color: theme.textSecondary, fontSize: 17, fontWeight: 600, margin: '14px 0 6px' }}>{children}</h3>,
                strong: ({ children }) => <strong style={{ color: theme.text, fontWeight: 700 }}>{children}</strong>,
                blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${theme.primary}`, paddingLeft: 14, color: theme.textMuted, margin: '14px 0' }}>{children}</blockquote>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
          {message.streaming && message.content !== '' && (
            <span style={{
              display: 'inline-block', width: 10, height: 18, background: theme.primary,
              marginLeft: 3, verticalAlign: 'text-bottom', animation: 'blink 0.8s infinite',
            }} />
          )}
        </div>

        {!message.streaming && (
          <>
            <WorkflowSteps steps={message.steps} />
            <Sources sources={message.sources} />
          </>
        )}
      </div>
    </div>
  )
}
