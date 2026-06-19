import { ProviderCategory, ModelModality } from '../stores/settingsStore'

export interface PresetModel {
  name: string
  modelId: string
  modalities: ModelModality[]
  maxContextTokens: number
}

export interface ProviderPreset {
  name: string
  apiUrl: string
  models: PresetModel[]
  category: ProviderCategory
  icon?: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    models: [
      { name: 'GPT-4o', modelId: 'gpt-4o', modalities: ['vision'], maxContextTokens: 128000 },
      { name: 'GPT-4o mini', modelId: 'gpt-4o-mini', modalities: ['vision'], maxContextTokens: 128000 },
    ],
    category: 'official',
  },
  {
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/chat/completions',
    models: [
      { name: 'DeepSeek Chat', modelId: 'deepseek-chat', modalities: ['vision'], maxContextTokens: 64000 },
      { name: 'DeepSeek R1', modelId: 'deepseek-reasoner', modalities: ['vision'], maxContextTokens: 64000 },
    ],
    category: 'cn',
  },
  {
    name: '智谱 GLM',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: [
      { name: 'GLM-4-Flash', modelId: 'glm-4-flash', modalities: ['vision'], maxContextTokens: 128000 },
      { name: 'GLM-4V-Flash', modelId: 'glm-4v-flash', modalities: ['vision'], maxContextTokens: 8000 },
      { name: 'GLM-4-Plus', modelId: 'glm-4-plus', modalities: ['vision'], maxContextTokens: 128000 },
    ],
    category: 'cn',
  },
  {
    name: '通义 Qwen',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: [
      { name: 'Qwen-Plus', modelId: 'qwen-plus', modalities: ['vision'], maxContextTokens: 131072 },
      { name: 'Qwen-VL-Plus', modelId: 'qwen-vl-plus', modalities: ['vision'], maxContextTokens: 8000 },
      { name: 'Qwen-Max', modelId: 'qwen-max', modalities: ['vision'], maxContextTokens: 32000 },
    ],
    category: 'cn',
  },
  {
    name: 'Moonshot',
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    models: [
      { name: 'Moonshot v1 8K', modelId: 'moonshot-v1-8k', modalities: ['document'], maxContextTokens: 8000 },
      { name: 'Moonshot v1 32K', modelId: 'moonshot-v1-32k', modalities: ['document'], maxContextTokens: 32000 },
      { name: 'Moonshot v1 128K', modelId: 'moonshot-v1-128k', modalities: ['document'], maxContextTokens: 128000 },
    ],
    category: 'cn',
  },
  {
    name: '零一万物',
    apiUrl: 'https://api.lingyiwanwu.com/v1/chat/completions',
    models: [
      { name: 'Yi-Lightning', modelId: 'yi-lightning', modalities: ['vision'], maxContextTokens: 16000 },
    ],
    category: 'cn',
  },
  {
    name: '百川',
    apiUrl: 'https://api.baichuan-ai.com/v1/chat/completions',
    models: [
      { name: 'Baichuan4', modelId: 'Baichuan4', modalities: ['vision'], maxContextTokens: 32000 },
    ],
    category: 'cn',
  },
  {
    name: 'OpenRouter',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      { name: 'GPT-4o (via OpenRouter)', modelId: 'openai/gpt-4o', modalities: ['vision'], maxContextTokens: 128000 },
    ],
    category: 'aggregator',
  },
  {
    name: 'OneAPI / NewAPI',
    apiUrl: '',
    models: [
      { name: '自定义模型', modelId: 'gpt-4o', modalities: ['vision'], maxContextTokens: 128000 },
    ],
    category: 'aggregator',
  },
]

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  official: '国际官方',
  cn: '国产模型',
  aggregator: '聚合平台',
  custom: '自定义',
}

export const CATEGORY_COLORS: Record<ProviderCategory, string> = {
  official: '#10b981',
  cn: '#3b82f6',
  aggregator: '#f59e0b',
  custom: '#6b7280',
}

export const MODALITY_LABELS: Record<string, string> = {
  vision: '视觉',
  document: '多模态',
}

export const MODALITY_COLORS: Record<string, string> = {
  vision: '#8b5cf6',
  document: '#10b981',
}
