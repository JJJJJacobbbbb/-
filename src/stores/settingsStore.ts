import { create } from 'zustand'
import { logger } from '../lib/logger'
import { SETTINGS_DEBOUNCE_MS, DEFAULT_MAX_TOKENS } from '../lib/constants'
import { generateId } from '../lib/id'

export type ProviderCategory = 'official' | 'cn' | 'aggregator' | 'custom'
export type ModelModality = 'vision' | 'document'

export interface ModelConfig {
  id: string
  name: string
  modelId: string
  modalities: ModelModality[]
  maxContextTokens: number
  audioCapable?: boolean
}

export interface ApiConfig {
  id: string
  name: string
  apiUrl: string
  apiKey: string
  models: ModelConfig[]
  category?: ProviderCategory
}

export interface DefaultModels {
  vision: string | null
  document: string | null
}

export interface ShortcutConfig {
  screenshot: string
  voice: string
}

interface SettingsState {
  apiConfigs: ApiConfig[]
  activeApiConfigId: string | null
  defaultModels: DefaultModels
  modelBarTab: string
  shortcuts: ShortcutConfig

  addApiConfig: (config: Omit<ApiConfig, 'id'>) => string
  updateApiConfig: (id: string, config: Partial<ApiConfig>) => void
  removeApiConfig: (id: string) => void
  setActiveApiConfig: (id: string) => void
  getActiveApiConfig: () => ApiConfig | null

  addModelToConfig: (configId: string, model: Omit<ModelConfig, 'id'>) => string
  removeModelFromConfig: (configId: string, modelId: string) => void
  updateModelInConfig: (configId: string, modelId: string, updates: Partial<ModelConfig>) => void

  setDefaultModel: (modality: ModelModality, modelConfigId: string | null) => void
  hasModelWithModality: (modality: ModelModality) => boolean
  hasAudioModel: () => boolean
  getModelConfigById: (modelConfigId: string) => { config: ApiConfig; model: ModelConfig } | null
  getActiveModelForModality: (modality: ModelModality) => { config: ApiConfig; model: ModelConfig } | null

  updateShortcut: (action: keyof ShortcutConfig, key: string) => void
  setModelBarTab: (tab: string) => void
  loadFromStorage: () => void
  saveToStorage: () => void
}

const STORAGE_KEY = 'student-assistant-settings'

let saveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSave(fn: () => void) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(fn, SETTINGS_DEBOUNCE_MS)
}

const defaultSettings = {
  apiConfigs: [] as ApiConfig[],
  activeApiConfigId: null as string | null,
  defaultModels: {
    vision: null,
    document: null,
  } as DefaultModels,
  shortcuts: {
    screenshot: 'Ctrl+Shift+X',
    voice: 'Ctrl+Shift+V',
  },
  modelBarTab: 'vision',
}

// 迁移旧格式 → 新格式
function migrateConfig(raw: Record<string, unknown>): ApiConfig {
  // 旧格式有 model + isMultimodal，新格式有 models[]
  if (typeof raw.model === 'string' && !Array.isArray(raw.models)) {
    const modalities: ModelModality[] = ['vision']
    return {
      id: raw.id as string,
      name: raw.name as string,
      apiUrl: raw.apiUrl as string,
      apiKey: raw.apiKey as string,
      category: raw.category as ProviderCategory | undefined,
      models: [{
        id: generateId('model'),
        name: raw.model as string,
        modelId: raw.model as string,
        modalities,
        maxContextTokens: DEFAULT_MAX_TOKENS,
      }],
    }
  }
  // 验证必要字段存在
  if (typeof raw.id === 'string' && typeof raw.name === 'string' && typeof raw.apiUrl === 'string' && typeof raw.apiKey === 'string' && Array.isArray(raw.models)) {
    return {
      id: raw.id,
      name: raw.name,
      apiUrl: raw.apiUrl,
      apiKey: raw.apiKey,
      models: raw.models as ModelConfig[],
      category: raw.category as ProviderCategory | undefined,
    }
  }
  // 如果验证失败，返回一个基本的配置（确保 ID 非空）
  return {
    id: raw.id ? String(raw.id) : generateId('api'),
    name: String(raw.name || ''),
    apiUrl: String(raw.apiUrl || ''),
    apiKey: String(raw.apiKey || ''),
    models: Array.isArray(raw.models) ? raw.models as ModelConfig[] : [],
    category: raw.category as ProviderCategory | undefined,
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaultSettings,

  addApiConfig: (config) => {
    const id = generateId('api')
    const newConfig: ApiConfig = { ...config, id }

    set((state) => ({
      apiConfigs: [...state.apiConfigs, newConfig],
      activeApiConfigId: state.activeApiConfigId || id,
    }))
    debouncedSave(() => get().saveToStorage())
    return id
  },

  updateApiConfig: (id, config) => {
    set((state) => ({
      apiConfigs: state.apiConfigs.map((c) =>
        c.id === id ? { ...c, ...config } : c
      ),
    }))
    debouncedSave(() => get().saveToStorage())
  },

  removeApiConfig: (id) => {
    set((state) => {
      const newConfigs = state.apiConfigs.filter((c) => c.id !== id)
      // 清理被删除 config 下的 defaultModels 引用
      const removedConfig = state.apiConfigs.find((c) => c.id === id)
      const removedModelIds = new Set(removedConfig?.models.map((m) => m.id) || [])
      const newDefaults = { ...state.defaultModels }
      for (const modality of Object.keys(newDefaults) as (keyof DefaultModels)[]) {
        if (newDefaults[modality] && removedModelIds.has(newDefaults[modality]!)) {
          newDefaults[modality] = null
        }
      }
      return {
        apiConfigs: newConfigs,
        activeApiConfigId:
          state.activeApiConfigId === id
            ? newConfigs.length > 0 ? newConfigs[0].id : null
            : state.activeApiConfigId,
        defaultModels: newDefaults,
      }
    })
    debouncedSave(() => get().saveToStorage())
  },

  setActiveApiConfig: (id) => {
    set({ activeApiConfigId: id })
    debouncedSave(() => get().saveToStorage())
  },

  getActiveApiConfig: () => {
    const { apiConfigs, activeApiConfigId } = get()
    return apiConfigs.find((c) => c.id === activeApiConfigId) || null
  },

  // === 多模型管理方法 ===

  addModelToConfig: (configId, model) => {
    const modelId = generateId('model')
    const newModel: ModelConfig = { ...model, id: modelId }

    set((state) => ({
      apiConfigs: state.apiConfigs.map((c) =>
        c.id === configId ? { ...c, models: [...c.models, newModel] } : c
      ),
    }))
    debouncedSave(() => get().saveToStorage())
    return modelId
  },

  removeModelFromConfig: (configId, modelId) => {
    set((state) => {
      const newConfigs = state.apiConfigs.map((c) =>
        c.id === configId ? { ...c, models: c.models.filter((m) => m.id !== modelId) } : c
      )
      // 清理 defaultModels 引用
      const newDefaults = { ...state.defaultModels }
      for (const modality of Object.keys(newDefaults) as (keyof DefaultModels)[]) {
        if (newDefaults[modality] === modelId) {
          newDefaults[modality] = null
        }
      }
      return { apiConfigs: newConfigs, defaultModels: newDefaults }
    })
    debouncedSave(() => get().saveToStorage())
  },

  updateModelInConfig: (configId, modelId, updates) => {
    const { id: _id, ...safeUpdates } = updates as Record<string, unknown> & { id?: string }
    set((state) => ({
      apiConfigs: state.apiConfigs.map((c) =>
        c.id === configId
          ? { ...c, models: c.models.map((m) => m.id === modelId ? { ...m, ...safeUpdates } : m) }
          : c
      ),
    }))
    debouncedSave(() => get().saveToStorage())
  },

  setDefaultModel: (modality, modelConfigId) => {
    set((state) => ({
      defaultModels: { ...state.defaultModels, [modality]: modelConfigId },
    }))
    debouncedSave(() => get().saveToStorage())
  },

  hasModelWithModality: (modality) => {
    const { apiConfigs } = get()
    return apiConfigs.some((c) =>
      c.models.some((m) => m.modalities.includes(modality))
    )
  },

  hasAudioModel: () => {
    const { apiConfigs } = get()
    return apiConfigs.some((c) =>
      c.models.some((m) => m.audioCapable)
    )
  },

  getModelConfigById: (modelConfigId) => {
    const { apiConfigs } = get()
    for (const config of apiConfigs) {
      const model = config.models.find((m) => m.id === modelConfigId)
      if (model) return { config, model }
    }
    return null
  },

  getActiveModelForModality: (modality) => {
    const { defaultModels, apiConfigs } = get()

    // 1. 优先使用 defaultModels 中该模态的设定
    const defaultModelId = defaultModels[modality]
    if (defaultModelId) {
      const result = get().getModelConfigById(defaultModelId)
      if (result && result.model.modalities.includes(modality)) return result
    }

    // 2. Fallback: 在所有 config 中找第一个有该模态的模型
    for (const config of apiConfigs) {
      const model = config.models.find((m) => m.modalities.includes(modality))
      if (model) return { config, model }
    }

    return null
  },

  updateShortcut: (action, key) => {
    set((state) => ({
      shortcuts: {
        ...state.shortcuts,
        [action]: key,
      },
    }))
    debouncedSave(() => get().saveToStorage())
  },

  setModelBarTab: (tab) => {
    set({ modelBarTab: tab })
    debouncedSave(() => get().saveToStorage())
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // 迁移旧格式
        if (Array.isArray(parsed.apiConfigs)) {
          parsed.apiConfigs = parsed.apiConfigs.map(migrateConfig)
        }
        const loadedConfigs = Array.isArray(parsed.apiConfigs) ? parsed.apiConfigs : defaultSettings.apiConfigs
        const loadedActiveId = typeof parsed.activeApiConfigId === 'string' ? parsed.activeApiConfigId : defaultSettings.activeApiConfigId
        set({
          apiConfigs: loadedConfigs,
          activeApiConfigId: loadedActiveId && loadedConfigs.some((c: ApiConfig) => c.id === loadedActiveId) ? loadedActiveId : (loadedConfigs[0]?.id || null),
          defaultModels: { ...defaultSettings.defaultModels, ...(parsed.defaultModels || {}) },
          modelBarTab: typeof parsed.modelBarTab === 'string' ? parsed.modelBarTab : defaultSettings.modelBarTab,
          shortcuts: parsed.shortcuts && typeof parsed.shortcuts === 'object' ? { ...defaultSettings.shortcuts, ...parsed.shortcuts } : defaultSettings.shortcuts,
        })
      }
    } catch (e) {
      logger.error('加载设置失败', e)
    }
  },

  saveToStorage: () => {
    try {
      const state = get()
      const settings = {
        apiConfigs: state.apiConfigs,
        activeApiConfigId: state.activeApiConfigId,
        defaultModels: state.defaultModels,
        modelBarTab: state.modelBarTab,
        shortcuts: state.shortcuts,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      logger.error('保存设置失败', e)
    }
  },
}))
