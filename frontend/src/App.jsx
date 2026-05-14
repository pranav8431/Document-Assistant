import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import UploadModal from './components/UploadModal'
import DocumentDetail from './components/DocumentDetail'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'
import { ThemeProvider, useTheme } from './context/ThemeContext'

function AppInner() {
  const [showUpload, setShowUpload] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null)

  const { theme } = useTheme()
  const { documents, uploading, uploadDocument, deleteDocument } = useDocuments()
  const { messages, history, streaming, error, sendMessage, clearMessages, fetchHistory, loadFromHistory } = useChat()

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const handleSend = (query) => sendMessage(query, selectedDocId)

  const handleDeleteDoc = (id) => {
    if (selectedDocId === id) setSelectedDocId(null)
    deleteDocument(id)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg, color: theme.text, overflow: 'hidden' }}>
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.scrollThumb}; border-radius: 3px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <Sidebar
        documents={documents}
        history={history}
        selectedDocId={selectedDocId}
        onSelectDoc={setSelectedDocId}
        onClearChat={clearMessages}
        onUpload={() => setShowUpload(true)}
        onDeleteDoc={handleDeleteDoc}
        onLoadHistory={loadFromHistory}
        onViewDoc={setViewingDoc}
        uploading={uploading}
      />

      <ChatArea
        messages={messages}
        streaming={streaming}
        onSend={handleSend}
        selectedDoc={selectedDocId}
        documents={documents}
      />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={uploadDocument}
          uploading={uploading}
        />
      )}

      {viewingDoc && (
        <DocumentDetail
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {error && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, background: theme.bgSurface,
          border: `1px solid ${theme.error}`, borderRadius: 10, padding: '12px 18px',
          color: theme.error, fontSize: 15, maxWidth: 340, zIndex: 999,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
