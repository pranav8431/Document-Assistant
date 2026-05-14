import { useState, useCallback, useRef } from 'react'
import { workflowQueryStream, api } from '../api/client'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const streamingIdRef = useRef(null)

  const fetchHistory = useCallback(async () => {
    try {
      const h = await api.getHistory()
      setHistory(h)
    } catch {}
  }, [])

  const sendMessage = useCallback(async (query, documentId = null) => {
    setError(null)
    const userMsg = { id: Date.now(), role: 'user', content: query }
    const assistantId = Date.now() + 1
    streamingIdRef.current = assistantId

    const assistantMsg = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
      steps: [],
      sources: [],
      confidence: null,
      intent: null,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    await workflowQueryStream(
      query,
      documentId,
      (token) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, content: m.content + token } : m
          )
        )
      },
      (step) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, steps: [...(m.steps || []), step] }
              : m
          )
        )
      },
      (done) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: done.response || m.content,
                  streaming: false,
                  sources: done.sources || [],
                  confidence: done.confidence ?? null,
                  intent: done.intent || null,
                }
              : m
          )
        )
        setStreaming(false)
        fetchHistory()
      },
      (err) => {
        setError(err.message)
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: 'An error occurred. Please try again.', streaming: false }
              : m
          )
        )
        setStreaming(false)
      }
    )
  }, [fetchHistory])

  const clearMessages = useCallback(() => setMessages([]), [])

  const loadFromHistory = useCallback((item) => {
    setMessages([
      { id: 1, role: 'user', content: item.query },
      {
        id: 2,
        role: 'assistant',
        content: item.response,
        streaming: false,
        sources: item.sources || [],
        confidence: item.confidence,
        intent: item.intent,
      },
    ])
  }, [])

  return {
    messages,
    history,
    streaming,
    error,
    sendMessage,
    clearMessages,
    fetchHistory,
    loadFromHistory,
  }
}
