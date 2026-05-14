import { useState } from 'react'
import { X, FileText, Hash, AlignLeft, Loader, Tag, BarChart2 } from 'lucide-react'
import { api } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function DocumentDetail({ doc, onClose }) {
  const { theme } = useTheme()
  const [summary, setSummary] = useState(doc.summary || null)
  const [keywords, setKeywords] = useState(doc.keywords || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getDocumentSummary(doc.id)
      setSummary(res.summary)
      setKeywords(res.keywords || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: theme.bgSurface, border: `1px solid ${theme.border2}`, borderRadius: 16,
        padding: 40, width: 620, maxWidth: '95vw', maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12, background: theme.primaryDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={26} style={{ color: theme.primary }} />
            </div>
            <div>
              <h2 style={{ color: theme.text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{doc.title}</h2>
              <span style={{
                fontSize: 13, padding: '3px 10px', background: theme.border2, color: theme.textMuted, borderRadius: 6,
              }}>.{doc.file_type}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { icon: <Hash size={18} />, label: 'Words', value: doc.word_count?.toLocaleString() },
            { icon: <AlignLeft size={18} />, label: 'Characters', value: doc.char_count?.toLocaleString() },
            { icon: <BarChart2 size={18} />, label: 'Type', value: doc.file_type?.toUpperCase() },
          ].map((s, i) => (
            <div key={i} style={{
              background: theme.bgDeep, border: `1px solid ${theme.border}`, borderRadius: 10,
              padding: '16px', textAlign: 'center',
            }}>
              <div style={{ color: theme.primary, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ color: theme.text, fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{s.value}</div>
              <div style={{ color: theme.textFaint, fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Summary section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 600 }}>Summary</h3>
            {!summary && (
              <button
                onClick={fetchSummary}
                disabled={loading}
                style={{
                  padding: '8px 18px', background: theme.primary, border: 'none', borderRadius: 8,
                  color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500,
                  opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : 'Generate Summary'}
              </button>
            )}
          </div>

          {summary ? (
            <p style={{
              color: theme.textSecondary, fontSize: 16, lineHeight: 1.7,
              background: theme.bgDeep, borderRadius: 10, padding: '16px 18px',
              border: `1px solid ${theme.border}`,
            }}>{summary}</p>
          ) : (
            <div style={{
              color: theme.textFaintest, fontSize: 15, background: theme.bgDeep, borderRadius: 10,
              padding: '20px', border: `1px solid ${theme.border}`, textAlign: 'center',
            }}>
              {loading ? 'Generating summary with Gemini...' : 'Click "Generate Summary" to analyse this document'}
            </div>
          )}
          {error && <div style={{ color: theme.error, fontSize: 14, marginTop: 8 }}>{error}</div>}
        </div>

        {/* Keywords */}
        {keywords.length > 0 && (
          <div>
            <h3 style={{ color: theme.text, fontSize: 18, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={18} style={{ color: theme.primary }} /> Keywords
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {keywords.map((kw, i) => (
                <span key={i} style={{
                  padding: '6px 14px', background: theme.primaryDim, color: theme.primaryLight,
                  borderRadius: 20, fontSize: 14, border: `1px solid ${theme.primaryBorder}`,
                }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
