import { useState, useRef, useEffect } from 'react'
import { useSettingsStore, type ModelModality } from '../../stores/settingsStore'
import { MODALITY_LABELS, MODALITY_COLORS } from '../../config/providerPresets'

const MODALITIES: ModelModality[] = ['vision', 'document']

export default function ModelBar() {
  const { apiConfigs, defaultModels, modelBarTab, setDefaultModel, setModelBarTab, getActiveModelForModality } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<ModelModality>((modelBarTab as ModelModality) || 'vision')
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 获取当前活跃模态的模型
  const activeModel = getActiveModelForModality(activeTab)

  // 收集所有有该模态的模型
  const getModelsByModality = (modality: ModelModality) => {
    const models: { configId: string; configName: string; modelId: string; modelName: string; modalities: ModelModality[] }[] = []
    for (const config of apiConfigs) {
      for (const model of config.models) {
        if (model.modalities.includes(modality)) {
          models.push({
            configId: config.id,
            configName: config.name,
            modelId: model.id,
            modelName: model.name,
            modalities: model.modalities,
          })
        }
      }
    }
    return models
  }

  const currentModels = getModelsByModality(activeTab)

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100" ref={dropdownRef} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {/* 模态 tabs */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
        {MODALITIES.map((mod) => {
          const hasModel = getModelsByModality(mod).length > 0
          return (
            <button
              key={mod}
              onClick={() => { setActiveTab(mod); setModelBarTab(mod) }}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                activeTab === mod
                  ? 'bg-white text-gray-800 shadow-sm'
                  : hasModel
                    ? 'text-gray-500 hover:text-gray-700'
                    : 'text-gray-300'
              }`}
              title={hasModel ? MODALITY_LABELS[mod] : `${MODALITY_LABELS[mod]}（无可用模型）`}
            >
              {MODALITY_LABELS[mod]}
            </button>
          )
        })}
      </div>

      {/* 当前模型显示 + 下拉 */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ml-1 ${
          open ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }`}
        title="切换模型"
      >
        {activeModel ? (
          <>
            <span className="font-medium truncate max-w-[100px]">
              {activeModel.model.name}
            </span>
            <span className="text-gray-400 text-[10px] truncate max-w-[60px]">({activeModel.config.name})</span>
          </>
        ) : (
          <span className="text-gray-400">未配置</span>
        )}
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px] max-h-[240px] overflow-hidden">
          {currentModels.length === 0 ? (
            <div className="px-4 py-5 text-xs text-gray-400 text-center">
              该模态暂无可用模型
            </div>
          ) : (
            <div className="py-1 overflow-y-auto max-h-[240px]">
              {currentModels.map((m) => {
                const isDefault = defaultModels[activeTab] === m.modelId
                return (
                  <button
                    key={m.modelId}
                    onClick={() => {
                      setDefaultModel(activeTab, m.modelId)
                      setOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                      isDefault ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-xs truncate ${isDefault ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{m.modelName}</span>
                      <span className="text-[10px] text-gray-400 truncate">{m.configName}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {m.modalities.map((mod) => (
                        <span
                          key={mod}
                          className="text-[9px] px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: `${MODALITY_COLORS[mod]}20`,
                            color: MODALITY_COLORS[mod],
                          }}
                        >
                          {MODALITY_LABELS[mod]}
                        </span>
                      ))}
                      {isDefault && (
                        <svg className="w-3 h-3 text-blue-500 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
