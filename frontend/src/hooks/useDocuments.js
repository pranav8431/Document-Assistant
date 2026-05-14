import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const docs = await api.listDocuments()
      setDocuments(docs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const uploadDocument = useCallback(async (title, content, file) => {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('title', title)
      if (file) form.append('file', file)
      else form.append('content', content)
      const doc = await api.uploadDocument(form)
      setDocuments(prev => [doc, ...prev])
      return doc
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setUploading(false)
    }
  }, [])

  const deleteDocument = useCallback(async (id) => {
    try {
      await api.deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }, [])

  return { documents, loading, uploading, error, fetchDocuments, uploadDocument, deleteDocument }
}
