import { useState } from 'react'
import { FileText, Trash2, Upload, ChevronDown, ChevronRight, MessageSquare, Clock, Plus, BookOpen, Info, Palette } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function ThemeBar() {
  const { theme, setTheme, themes } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderTop: `1px solid ${theme.border}`, padding: '10px 14px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px',
          color: theme.textMuted, fontSize: 13, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}
      >
        <Palette size={14} />
        <span style={{ flex: 1, textAlign: 'left' }}>Theme</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 10, paddingBottom: 4 }}>
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t)}
              title={t.name}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: t.id === 'light'
                  ? 'linear-gradient(135deg, #f5f5f5 50%, #7c3aed 50%)'
                  : t.swatch,
                border: theme.id === t.id
                  ? `3px solid ${theme.text}`
                  : `2px solid ${theme.border2}`,
                cursor: 'pointer',
                transition: 'transform 0.15s, border 0.15s',
                flexShrink: 0,
                outline: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            />
          ))}
        </div>
      )}

      {open && (
        <div style={{ color: theme.textFaintest, fontSize: 12, paddingLeft: 4, paddingBottom: 2 }}>
          {theme.name}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  documents, history, selectedDocId, onSelectDoc, onClearChat,
  onUpload, onDeleteDoc, onLoadHistory, onViewDoc, uploading,
}) {
  const { theme } = useTheme()
  const [docsOpen, setDocsOpen] = useState(true)
  const [histOpen, setHistOpen] = useState(true)

  return (
    <div style={{
      width: 320, minWidth: 320, background: theme.bgSidebar,
      borderRight: `1px solid ${theme.border}`, display: 'flex',
      flexDirection: 'column', height: '100%', overflow: 'hidden',
    }}>
      {/* Logo removed per request */}
      <div style={{
        padding: '24px 20px 20px', borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }} />

      {/* New Chat */}
      <div style={{ padding: '14px 14px 4px' }}>
        <button
          onClick={onClearChat}
          style={{
            width: '100%', padding: '12px 16px', background: 'transparent',
            border: `1px solid ${theme.border2}`, borderRadius: 10, color: theme.textSecondary,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 16, fontWeight: 500, transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = theme.bgSurface2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Plus size={18} /> New Chat
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', paddingBottom: 16 }}>

        {/* Documents */}
        <div style={{ marginTop: 8 }}>
          <div
            onClick={() => setDocsOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 6px', color: theme.textMuted, fontSize: 13, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <FileText size={14} /> Documents ({documents.length})
            </span>
            {docsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>

          {docsOpen && (
            <div style={{ marginTop: 4 }}>
              {documents.length === 0 && (
                <div style={{ color: theme.textFaintest, fontSize: 14, padding: '10px 8px' }}>No documents yet</div>
              )}
              {documents.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 3,
                    background: selectedDocId === doc.id ? theme.bgSurface2 : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => onSelectDoc(selectedDocId === doc.id ? null : doc.id)}
                  onMouseEnter={e => { if (selectedDocId !== doc.id) e.currentTarget.style.background = theme.bgSurface }}
                  onMouseLeave={e => { if (selectedDocId !== doc.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <FileText size={17} style={{ color: theme.primary, flexShrink: 0 }} />
                  <span style={{
                    flex: 1, color: theme.textSecondary, fontSize: 15, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={doc.title}>{doc.title}</span>
                  <span style={{
                    fontSize: 11, background: theme.border2, color: theme.textMuted,
                    borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{doc.file_type}</span>
                  <button
                    onClick={e => { e.stopPropagation(); onViewDoc(doc) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textFaintest, padding: 3, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = theme.primaryLight}
                    onMouseLeave={e => e.currentTarget.style.color = theme.textFaintest}
                    title="View details & summary"
                  >
                    <Info size={15} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteDoc(doc.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textFaintest, padding: 3, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = theme.error}
                    onMouseLeave={e => e.currentTarget.style.color = theme.textFaintest}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div style={{ marginTop: 16 }}>
          <div
            onClick={() => setHistOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 6px', color: theme.textMuted, fontSize: 13, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={14} /> History
            </span>
            {histOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>

          {histOpen && (
            <div style={{ marginTop: 4 }}>
              {history.length === 0 && (
                <div style={{ color: theme.textFaintest, fontSize: 14, padding: '10px 8px' }}>No queries yet</div>
              )}
              {history.slice(0, 20).map(h => (
                <div
                  key={h.id}
                  onClick={() => onLoadHistory(h)}
                  title={h.query}
                  style={{
                    padding: '10px 10px', borderRadius: 8, cursor: 'pointer', color: theme.textMuted,
                    fontSize: 14, marginBottom: 2, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = theme.bgSurface}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <MessageSquare size={13} style={{ marginRight: 7, display: 'inline', verticalAlign: 'middle' }} />
                  {h.query}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Theme Bar */}
      <ThemeBar />

      {/* Upload button */}
      <div style={{ padding: '12px 14px 20px' }}>
        <button
          onClick={onUpload}
          disabled={uploading}
          style={{
            width: '100%', padding: '14px', background: theme.primary, border: 'none',
            borderRadius: 10, color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, fontSize: 16, fontWeight: 600, opacity: uploading ? 0.7 : 1,
          }}
        >
          <Upload size={18} />
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
    </div>
  )
}
