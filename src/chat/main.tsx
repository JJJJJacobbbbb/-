import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import FloatingChat from '../components/ai/FloatingChat'
import { useSettingsStore } from '../stores/settingsStore'
import { useNoteStore } from '../stores/noteStore'
import { useSubjectStore } from '../stores/subjectStore'
import { useAiStore } from '../stores/aiStore'
import '../index.css'

function ChatApp() {
  const loadSettings = useSettingsStore((s) => s.loadFromStorage)
  const loadNotes = useNoteStore((s) => s.loadFromStorage)
  const loadSubjects = useSubjectStore((s) => s.loadFromStorage)
  const loadSessions = useAiStore((s) => s.loadFromStorage)

  useEffect(() => {
    loadSettings()
    loadNotes()
    loadSubjects()
    loadSessions()
  }, [])

  return <FloatingChat />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChatApp />
  </React.StrictMode>
)
