import { useState } from 'react'
import { useSubjectStore } from '../../stores/subjectStore'
import { useAiStore } from '../../stores/aiStore'
import { useNoteStore } from '../../stores/noteStore'

export default function SubjectManager() {
  const { subjects, addSubject, removeSubject } = useSubjectStore()
  const { sessions, deleteSession } = useAiStore()
  const { notes, removeNote } = useNoteStore()
  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return

    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      alert('该学科已存在')
      return
    }

    addSubject(name)
    setNewName('')
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`确定要删除学科"${name}"吗？将同时删除该科目下所有会话和笔记。`)) return

    // 删除该科目下所有会话
    Object.values(sessions)
      .filter((s) => s.subjectId === id)
      .forEach((s) => deleteSession(s.id))

    // 删除该科目下所有笔记
    notes
      .filter((n) => n.subjectId === id)
      .forEach((n) => removeNote(n.id))

    removeSubject(id)
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-medium text-gray-800 mb-4">学科管理</h2>
      <p className="text-sm text-gray-500 mb-6">
        管理你的学科分类。AI会根据对话内容自动识别学科。
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入新学科名称"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          添加
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          <p>暂无学科</p>
          <p className="text-sm mt-1">添加学科后，AI会自动将对话归类到对应学科</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="font-medium text-gray-800">{subject.name}</span>
              </div>
              <button
                onClick={() => handleDelete(subject.id, subject.name)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
