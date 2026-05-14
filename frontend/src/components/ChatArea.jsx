import { useRef, useEffect, useState } from 'react'
import { Send, FileSearch, Sparkles, Globe } from 'lucide-react'
import MessageBubble from './MessageBubble'
import { useTheme } from '../context/ThemeContext'

const SUGGESTIONS = [
  'Summarize the main points of this document',
  'What are the key findings mentioned?',
  'Compare the different sections',
  'What conclusions does this document draw?',
]

export default function ChatArea({ messages, streaming, onSend, selectedDoc, documents }) {
  const { theme } = useTheme()
  const [input, setInput] = useState('')
  const bottomRef = useRef()
  const textareaRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const q = input.trim()
    if (!q || streaming) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onSend(q)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedDocName = documents.find(d => d.id === selectedDoc)?.title
  const isEmpty = messages.length === 0
  const canSend = input.trim() && !streaming && documents.length > 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.bg, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '18px 32px', borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Sparkles size={22} style={{ color: theme.primary }} />
        <span style={{ color: theme.text, fontWeight: 700, fontSize: 18 }}>
          {selectedDocName ? `Querying: ${selectedDocName}` : 'All Documents'}
        </span>
        {selectedDoc ? (
          <span style={{
            fontSize: 13, padding: '4px 12px', background: theme.primaryDim,
            color: theme.primaryLight, borderRadius: 12, border: `1px solid ${theme.primaryBorder}`,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <FileSearch size={13} /> Focused on document
          </span>
        ) : (
          <span style={{ fontSize: 14, color: theme.textFaintest, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Globe size={14} /> Searching {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 32 }}>
            {/* Removed logo and title per request. Keep suggestions when documents exist. */}

            {documents.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 560, width: '100%' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); textareaRef.current?.focus() }}
                    style={{
                      background: theme.bgSurface2, border: `1px solid ${theme.border2}`, borderRadius: 12,
                      padding: '16px 18px', color: theme.textMuted, cursor: 'pointer',
                      fontSize: 15, textAlign: 'left', lineHeight: 1.5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border2; e.currentTarget.style.color = theme.textMuted }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '16px 40px 28px', maxWidth: 900, width: '100%', margin: '0 auto' }}>
        <div style={{
          background: theme.bgSurface2, border: `1px solid ${theme.border3}`, borderRadius: 16,
          display: 'flex', alignItems: 'flex-end', gap: 10, padding: '14px 18px',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={documents.length === 0 ? 'Upload a document to start chatting...' : 'Ask anything about your documents...'}
            disabled={streaming || documents.length === 0}
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: theme.text, fontSize: 17, resize: 'none', fontFamily: 'inherit',
              lineHeight: 1.6, maxHeight: 180, overflowY: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 44, height: 44, borderRadius: 10, border: 'none', flexShrink: 0,
              background: canSend ? theme.primary : theme.border,
              color: canSend ? '#fff' : theme.textFaintest,
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <Send size={18} />
          </button>
        </div>
        <div style={{ color: theme.textFaintest, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line · Powered by Gemini
        </div>
      </div>
    </div>
  )
}
