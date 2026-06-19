import { create } from 'zustand'
import { useSettingsStore } from './settingsStore'
import { useSubjectStore } from './subjectStore'
import { logger } from '../lib/logger'
import { SESSION_DEBOUNCE_MS } from '../lib/constants'
import { generateId } from '../lib/id'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  type: 'text' | 'screenshot' | 'file'
  screenshotData?: string
  fileName?: string
}

export interface AiSession {
  id: string
  subjectId: string
  name: string
  messages: Message[]
  chatState: 'idle' | 'thinking' | 'streaming' | 'error'
  streamingText: string
  error: string | null
  createdAt: number
  updatedAt: number
}

interface AiState {
  sessions: Record<string, AiSession>
  activeSessionId: string | null
  abortController: AbortController | null
  pendingScreenshots: string[]
  thinkingMode: boolean

  getActiveSession: () => AiSession | null
  createSession: () => string
  switchSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  listSessionsBySubject: (subjectId: string) => AiSession[]

  sendMessage: (content: string, screenshotData?: string | string[], isFollowUp?: boolean) => Promise<void>
  stopGeneration: () => void
  clearError: (sessionId: string) => void

  addPendingScreenshot: (data: string) => void
  removePendingScreenshot: (index: number) => void
  clearPendingScreenshots: () => void
  setThinkingMode: (on: boolean) => void

  loadFromStorage: () => void
  saveToStorage: () => void
}

const SESSION_STORAGE_KEY = 'student-assistant-sessions'

let sessionSaveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSessionSave() {
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer)
  sessionSaveTimer = setTimeout(() => {
    useAiStore.getState().saveToStorage()
  }, SESSION_DEBOUNCE_MS)
}

function generateSessionName(content: string): string {
  const clean = content.replace(/\n/g, ' ').trim()
  return clean.length > 20 ? clean.slice(0, 20) + '...' : clean
}

export const useAiStore = create<AiState>((set, get) => ({
  sessions: {},
  activeSessionId: null,
  abortController: null,
  pendingScreenshots: [],
  thinkingMode: false,

  getActiveSession: () => {
    const { sessions, activeSessionId } = get()
    if (!activeSessionId) return null
    return sessions[activeSessionId] || null
  },

  createSession: () => {
    const subjectStore = useSubjectStore.getState()
    let subjectId = subjectStore.currentSubjectId

    if (!subjectId) {
      subjectId = subjectStore.addSubject('默认学科')
      subjectStore.setCurrentSubject(subjectId)
    }

    const id = generateId('session')
    const session: AiSession = {
      id,
      subjectId,
      name: '新会话',
      messages: [],
      chatState: 'idle',
      streamingText: '',
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    set((state) => ({
      sessions: { ...state.sessions, [id]: session },
      activeSessionId: id,
    }))
    debouncedSessionSave()

    return id
  },

  switchSession: (sessionId) => {
    set({ activeSessionId: sessionId })
    debouncedSessionSave()
  },

  deleteSession: (sessionId) => {
    const { abortController, activeSessionId } = get()
    if (sessionId === activeSessionId && abortController) {
      abortController.abort()
      set({ abortController: null })
    }
    set((state) => {
      const newSessions = { ...state.sessions }
      delete newSessions[sessionId]
      return {
        sessions: newSessions,
        activeSessionId:
          state.activeSessionId === sessionId ? null : state.activeSessionId,
      }
    })
    debouncedSessionSave()
  },

  listSessionsBySubject: (subjectId) => {
    const { sessions } = get()
    return Object.values(sessions)
      .filter((s) => s.subjectId === subjectId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },

  sendMessage: async (content, screenshotData, isFollowUp = false) => {
    const screenshots = Array.isArray(screenshotData) ? screenshotData : screenshotData ? [screenshotData] : []
    const subjectStore = useSubjectStore.getState()
    const settingsStore = useSettingsStore.getState()

    let subjectId = subjectStore.currentSubjectId
    if (!subjectId) {
      const detectedId = subjectStore.detectSubject(content)
      if (detectedId) {
        subjectStore.setCurrentSubject(detectedId)
        subjectId = detectedId
      } else {
        // 确保"综合"存在，始终落在综合
        let main = subjectStore.subjects.find((s) => s.id === 'main')
        if (!main) {
          subjectId = subjectStore.addSubject('综合')
          main = subjectStore.subjects.find((s) => s.id === subjectId)!
        }
        subjectId = main.id
        subjectStore.setCurrentSubject(subjectId)
      }
    }

    // 确保有活跃会话
    let { activeSessionId } = get()
    if (!activeSessionId || !get().sessions[activeSessionId]) {
      activeSessionId = get().createSession()
    }

    const userMessage: Message = {
      id: generateId('msg'),
      role: 'user',
      content,
      timestamp: Date.now(),
      type: screenshots.length > 0 ? 'screenshot' : 'text',
      screenshotData: screenshots[0],
    }

    // 添加用户消息到当前会话
    set((state) => {
      const session = state.sessions[activeSessionId!]
      if (!session) return state
      return {
        sessions: {
          ...state.sessions,
          [activeSessionId!]: {
            ...session,
            messages: [...session.messages, userMessage],
            chatState: 'thinking',
            streamingText: '',
            error: null,
            name: session.messages.length === 0 ? generateSessionName(content) : session.name,
            updatedAt: Date.now(),
          },
        },
      }
    })

    // 确定模态：有截图时需要视觉模型，否则任意模型
    const needsVision = screenshots.length > 0
    let modelInfo = needsVision
      ? settingsStore.getActiveModelForModality('vision')
      : settingsStore.getActiveModelForModality('vision') || settingsStore.getActiveModelForModality('document')

    // 回退：找第一个可用模型（含 modalities 为空的纯文本模型）
    if (!modelInfo) {
      for (const config of settingsStore.apiConfigs) {
        if (config.models.length > 0) { modelInfo = { config, model: config.models[0] }; break }
      }
    }

    if (!modelInfo) {
      set((state) => {
        const session = state.sessions[activeSessionId!]
        if (!session) return state
        return {
          sessions: {
            ...state.sessions,
            [activeSessionId!]: {
              ...session,
              chatState: 'error',
              error: '请先在设置中配置AI模型。点击右上角"设置"按钮添加。',
            },
          },
        }
      })
      return
    }

    // 需要视觉能力但当前模型不支持视觉
    if (needsVision && !modelInfo.model.modalities.includes('vision')) {
      set((state) => {
        const session = state.sessions[activeSessionId!]
        if (!session) return state
        return {
          sessions: {
            ...state.sessions,
            [activeSessionId!]: {
              ...session,
              chatState: 'error',
              error: '需要视觉模型来处理图片，但当前模型不支持视觉。请前往设置添加视觉模型。',
            },
          },
        }
      })
      return
    }

    const { config, model } = modelInfo

    let controller: AbortController | null = null
    try {
      const session = get().sessions[activeSessionId!]
      if (!session) return

      // 上下文隔离：只发送当前消息
      // 追问模式：带上最后一对 Q&A
      let contextMessages: Message[]
      if (isFollowUp && session.messages.length >= 3) {
        const prevQ = session.messages[session.messages.length - 3]
        const prevA = session.messages[session.messages.length - 2]
        contextMessages = [prevQ, prevA, userMessage]
      } else {
        contextMessages = [userMessage]
      }

      const apiMessages = contextMessages.map((msg) => {
        const msgScreenshots = msg === userMessage ? screenshots : (msg.screenshotData ? [msg.screenshotData] : [])
        if (msgScreenshots.length > 0) {
          return {
            role: msg.role,
            content: [
              { type: 'text', text: msg.content },
              ...msgScreenshots.map((url) => ({ type: 'image_url', image_url: { url } })),
            ],
          }
        }
        return { role: msg.role, content: msg.content }
      })

      let apiUrl = config.apiUrl.trim()
      const apiKey = config.apiKey.trim()
      // 自动补全 /chat/completions 端点
      if (!/\/chat\/completions\/?$/.test(apiUrl)) {
        apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions'
      }
      if (!apiUrl || !apiKey) {
        set((state) => {
          const session = state.sessions[activeSessionId!]
          if (!session) return state
          return {
            sessions: {
              ...state.sessions,
              [activeSessionId!]: { ...session, chatState: 'error', error: 'API 地址或 Key 为空，请检查设置' },
            },
          }
        })
        return
      }

      const prevController = get().abortController
      if (prevController) prevController.abort()

      controller = new AbortController()
      set({ abortController: controller })

      const { thinkingMode } = get()
      const body: Record<string, unknown> = {
        model: model.modelId,
        messages: apiMessages,
        stream: true,
      }
      if (thinkingMode) body.think = true

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        let errorMsg = `请求失败 (${response.status})`
        if (response.status === 401) errorMsg = 'API Key 无效，请检查设置中的配置'
        else if (response.status === 403) errorMsg = 'API Key 权限不足或已过期'
        else if (response.status === 404) errorMsg = 'API 地址错误或模型不存在'
        else if (response.status === 429) errorMsg = '请求过于频繁，请稍后再试'
        else if (response.status === 500) errorMsg = '服务器错误，请稍后再试'
        else if (errorText) errorMsg += `: ${errorText.slice(0, 100)}`
        throw new Error(errorMsg)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) buffer += decoder.decode(result.value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') { done = true; break }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              fullText += delta
              set((state) => {
                const s = state.sessions[activeSessionId!]
                if (!s) return state
                return {
                  sessions: {
                    ...state.sessions,
                    [activeSessionId!]: { ...s, chatState: 'streaming', streamingText: fullText },
                  },
                }
              })
            }
          } catch { /* ignore parse errors */ }
        }
      }

      const assistantMessage: Message = {
        id: generateId('msg'),
        role: 'assistant',
        content: fullText || '(无响应内容)',
        timestamp: Date.now(),
        type: 'text',
      }

      set((state) => {
        const s = state.sessions[activeSessionId!]
        if (!s) return state
        return {
          sessions: {
            ...state.sessions,
            [activeSessionId!]: {
              ...s,
              messages: [...s.messages, assistantMessage],
              chatState: 'idle',
              streamingText: '',
              updatedAt: Date.now(),
            },
          },
          abortController: null,
        }
      })
      debouncedSessionSave()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        set((state) => {
          const s = state.sessions[activeSessionId!]
          if (!s) return state
          return {
            sessions: {
              ...state.sessions,
              [activeSessionId!]: { ...s, chatState: 'idle', streamingText: '' },
            },
            // Only clear controller if it's still ours (not replaced by a newer send)
            abortController: state.abortController === controller ? null : state.abortController,
          }
        })
        debouncedSessionSave()
        return
      }

      logger.error('AI 请求失败', error)
      // Only clear controller if it's still ours
      if (get().abortController === controller) set({ abortController: null })

      let errorMsg = '未知错误'
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMsg = '无法连接到AI服务。请检查网络连接和API地址是否正确。'
        } else {
          errorMsg = error.message
        }
      }

      set((state) => {
        const s = state.sessions[activeSessionId!]
        if (!s) return state
        return {
          sessions: {
            ...state.sessions,
            [activeSessionId!]: { ...s, chatState: 'error', error: errorMsg },
          },
        }
      })
      debouncedSessionSave()
    }
  },

  stopGeneration: () => {
    const { activeSessionId, abortController } = get()
    if (!activeSessionId) return

    if (abortController) {
      abortController.abort()
      set({ abortController: null })
    }

    set((state) => {
      const session = state.sessions[activeSessionId]
      if (!session) return state

      const lastMessage = session.messages[session.messages.length - 1]

      // Case 1: Last message is assistant with streaming text → save partial content
      if (lastMessage && lastMessage.role === 'assistant' && session.streamingText) {
        const completedMessage: Message = { ...lastMessage, content: session.streamingText }
        return {
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...session,
              messages: [...session.messages.slice(0, -1), completedMessage],
              chatState: 'idle',
              streamingText: '',
            },
          },
        }
      }

      // Case 2: Streaming text exists but last message is NOT assistant (just started streaming)
      // → create a new assistant message with the partial content
      if (session.streamingText) {
        const partialMessage: Message = {
          id: generateId('msg'),
          role: 'assistant',
          content: session.streamingText,
          timestamp: Date.now(),
          type: 'text',
        }
        return {
          sessions: {
            ...state.sessions,
            [activeSessionId]: {
              ...session,
              messages: [...session.messages, partialMessage],
              chatState: 'idle',
              streamingText: '',
            },
          },
        }
      }

      // Case 3: No streaming text → just reset state
      return {
        sessions: {
          ...state.sessions,
          [activeSessionId]: { ...session, chatState: 'idle', streamingText: '' },
        },
      }
    })
    debouncedSessionSave()
  },

  clearError: (sessionId) => {
    set((state) => {
      const session = state.sessions[sessionId]
      if (!session) return state
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...session, chatState: 'idle', error: null },
        },
      }
    })
    debouncedSessionSave()
  },

  addPendingScreenshot: (data) => set((s) => {
    const MAX_PENDING = 5
    const next = [...s.pendingScreenshots, data]
    return { pendingScreenshots: next.length > MAX_PENDING ? next.slice(-MAX_PENDING) : next }
  }),
  removePendingScreenshot: (index) => set((s) => ({
    pendingScreenshots: s.pendingScreenshots.filter((_, i) => i !== index),
  })),
  clearPendingScreenshots: () => set({ pendingScreenshots: [] }),
  setThinkingMode: (on) => set({ thinkingMode: on }),

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const sessions: Record<string, AiSession> = {}
        for (const [id, raw] of Object.entries(parsed.sessions || {})) {
          const s = raw as Record<string, unknown>
          // Validate required fields
          if (!s.id || !s.subjectId || !Array.isArray(s.messages)) continue
          sessions[id] = {
            id: String(s.id),
            subjectId: String(s.subjectId),
            name: String(s.name || '新会话'),
            messages: s.messages as Message[],
            chatState: 'idle',
            streamingText: '',
            error: null,
            createdAt: Number(s.createdAt) || Date.now(),
            updatedAt: Number(s.updatedAt) || Date.now(),
          }
        }
        const loadedActiveId = parsed.activeSessionId || null
        set({
          sessions,
          activeSessionId: loadedActiveId && sessions[loadedActiveId] ? loadedActiveId : null,
        })
      }
    } catch (e) {
      logger.error('加载会话失败', e)
    }
  },

  saveToStorage: () => {
    try {
      const { sessions, activeSessionId } = get()
      const saveableSessions: Record<string, AiSession> = {}
      for (const [id, session] of Object.entries(sessions)) {
        // 流式中的会话保存为 idle，避免丢失
        if (session.chatState === 'streaming' || session.chatState === 'thinking') {
          saveableSessions[id] = { ...session, chatState: 'idle', streamingText: '' }
        } else {
          saveableSessions[id] = session
        }
      }
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        sessions: saveableSessions,
        activeSessionId,
      }))
    } catch (e) {
      logger.error('保存会话失败', e)
    }
  },
}))
