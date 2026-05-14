import { useState, useRef } from 'react'
import { X, Upload, AlertCircle, FileText } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function UploadModal({ onClose, onUpload, uploading }) {
  const { theme } = useTheme()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('Title is required.')
    if (!file) return setError('Please select a file.')
    try {
      await onUpload(title.trim(), '', file)
      onClose()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const dropBorder = dragging ? theme.primary : file ? theme.primary : theme.border2
  const dropBg = dragging ? theme.primaryDim : file ? `${theme.primary}08` : 'transparent'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: theme.bgSurface, border: `1px solid ${theme.border2}`, borderRadius: 16,
        padding: 40, width: 560, maxWidth: '95vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ color: theme.text, fontSize: 24, fontWeight: 700 }}>Upload Document</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: theme.textMuted, fontSize: 16, display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Document Title *
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your document a title..."
              style={{
                width: '100%', background: theme.bgDeep, border: `1px solid ${theme.border2}`, borderRadius: 10,
                padding: '14px 16px', color: theme.text, fontSize: 16, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = theme.primary}
              onBlur={e => e.target.style.borderColor = theme.border2}
            />
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dropBorder}`,
              borderRadius: 12, padding: '48px 24px', textAlign: 'center',
              cursor: 'pointer', background: dropBg,
              transition: 'all 0.2s',
            }}
          >
            {file ? (
              <>
                <FileText size={48} style={{ color: theme.primary, marginBottom: 12 }} />
                <div style={{ color: theme.primaryLight, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{file.name}</div>
                <div style={{ color: theme.textFaint, fontSize: 14 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
              </>
            ) : (
              <>
                <Upload size={48} style={{ color: theme.textFaintest, marginBottom: 12 }} />
                <div style={{ color: theme.textMuted, fontSize: 18, fontWeight: 500, marginBottom: 6 }}>
                  Drop file here or click to browse
                </div>
                <div style={{ color: theme.textFaintest, fontSize: 14 }}>Supports: .txt, .pdf, .docx, .md</div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf,.docx,.md,.csv"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0] || null)}
            />
          </div>

          {error && (
            <div style={{ color: theme.error, fontSize: 15, marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '14px', background: 'transparent', border: `1px solid ${theme.border2}`,
              borderRadius: 10, color: theme.textMuted, cursor: 'pointer', fontSize: 16, fontWeight: 500,
            }}>
              Cancel
            </button>
            <button type="submit" disabled={uploading} style={{
              flex: 2, padding: '14px', background: uploading ? theme.primaryHover : theme.primary,
              border: 'none', borderRadius: 10, color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 16, fontWeight: 600,
            }}>
              {uploading ? 'Processing...' : 'Upload & Index'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
