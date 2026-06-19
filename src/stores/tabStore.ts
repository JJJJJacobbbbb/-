import { create } from 'zustand'

export type TabType = 'document' | 'settings' | 'notes'

interface TabState {
  activeTabType: TabType
  notesCollapsed: boolean
  openDocument: () => void
  openSettings: () => void
  openNotes: () => void
  collapseNotes: () => void
  expandNotes: () => void
}

export const useTabStore = create<TabState>((set) => ({
  activeTabType: 'document',
  notesCollapsed: false,

  openDocument: () => set({ activeTabType: 'document' }),
  openSettings: () => set({ activeTabType: 'settings' }),
  openNotes: () => set((s) => {
    if (s.activeTabType === 'notes') return s // 已经在笔记页
    return { activeTabType: 'notes', notesCollapsed: false }
  }),
  collapseNotes: () => set({ notesCollapsed: true }),
  expandNotes: () => set({ notesCollapsed: false }),
}))
