import { useState } from 'react'
import { Note, NOTE_CATEGORY_LABELS } from '../../stores/noteStore'
import { useNoteStore } from '../../stores/noteStore'
import { useSubjectStore } from '../../stores/subjectStore'
import { exportSingleNote } from '../../lib/noteExport'
import MarkdownRenderer from '../ai/MarkdownRenderer'

interface NoteCardProps {
  note: Note
}

export default function NoteCard({ note }: NoteCardProps) {
  const { removeNote } = useNoteStore()
  const { subjects } = useSubjectStore()
  const subject = subjects.find((s) => s.id === note.subjectId)
  const [exporting, setExporting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这条笔记吗？')) {
      removeNote(note.id)
    }
  }

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setExporting(true)
    try {
      await exportSingleNote(note, subjects)
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const catLabel = NOTE_CATEGORY_LABELS[note.category] || '其他'

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 transition-shadow cursor-pointer ${
        expanded ? 'p-4 shadow-md' : 'p-3 hover:shadow-md'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-medium text-gray-800 ${expanded ? '' : 'line-clamp-1'}`}>{note.title}</h3>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="收起"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
            title="导出此笔记"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mb-3">
          <MarkdownRenderer content={note.content} />
        </div>
      ) : (
        <p className="text-sm text-gray-600 line-clamp-3 mb-3">{note.content}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
        {subject && (
          <span
            className="px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: subject.color }}
          >
            {subject.name}
          </span>
        )}
        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">
          {catLabel}
        </span>
        {note.chapter && note.chapter !== '通用' && (
          <span className="text-[10px] text-gray-400">{note.chapter}</span>
        )}
        <span>{formatDate(note.updatedAt)}</span>
      </div>
    </div>
  )
}
