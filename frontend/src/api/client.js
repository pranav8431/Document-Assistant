const BASE = '/api'

async function request(method, path, body, isForm = false) {
  const opts = { method, headers: {} }
  if (body) {
    if (isForm) {
      opts.body = body
    } else {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
  }
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Documents
  uploadDocument: (form) => request('POST', '/documents', form, true),
  listDocuments: () => request('GET', '/documents'),
  getDocument: (id) => request('GET', `/documents/${id}`),
  deleteDocument: (id) => request('DELETE', `/documents/${id}`),
  getDocumentSummary: (id) => request('POST', `/documents/${id}/summary`),

  // Query
  queryDocuments: (body) => request('POST', '/documents/query', body),

  // Workflow
  workflowQuery: (body) => request('POST', '/workflow/query', body),

  // History
  getHistory: () => request('GET', '/history'),
  deleteHistory: (id) => request('DELETE', `/history/${id}`),
}

export async function workflowQueryStream(query, documentId, onToken, onStep, onDone, onError) {
  const res = await fetch(BASE + '/workflow/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, document_id: documentId || null, stream: true }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    onError(new Error(err.detail || 'Stream failed'))
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop()

    let eventType = null
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (eventType === 'token') {
          onToken(data)
        } else if (eventType === 'step') {
          try { onStep(JSON.parse(data)) } catch {}
        } else if (eventType === 'done') {
          try { onDone(JSON.parse(data)) } catch {}
        }
        eventType = null
      }
    }
  }
}
