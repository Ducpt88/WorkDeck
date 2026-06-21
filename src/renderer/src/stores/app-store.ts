import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppConfig, Tab, Task, Note, ViewType } from '../../../shared/types'

const DEFAULT_APPS: AppConfig[] = [
  { id: 'codex', name: 'Codex (OpenAI)', url: 'https://chatgpt.com', icon: '🤖', color: '#10b981', category: 'ai-coding', native: true },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: '🟠', color: '#f59e0b', category: 'ai-coding', native: true },
  { id: 'antigravity', name: 'Antigravity (Gemini)', url: 'https://gemini.google.com', icon: '🌌', color: '#8b5cf6', category: 'ai-coding', native: true },
  { id: 'github', name: 'GitHub', url: 'https://github.com', icon: '🐙', color: '#ffffff', category: 'dev-tools' }
]

interface AppStore {
  currentView: ViewType
  setCurrentView: (v: ViewType) => void

  apps: AppConfig[]
  addApp: (app: Omit<AppConfig, 'id'>) => void
  removeApp: (id: string) => void

  tabs: Tab[]
  activeTabId: string | null
  openApp: (appId: string) => void
  openTab: (appId: string, forceNew?: boolean) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  pomodoroVisible: boolean
  togglePomodoro: () => void

  notesVisible: boolean
  toggleNotes: () => void
  // Add-App modal visibility lives in the store so the native-embed layer can hide
  // the (always-on-top) embedded window while a full-screen modal is open.
  addAppVisible: boolean
  setAddApp: (v: boolean) => void
  notes: Note[]
  addNote: () => void
  updateNote: (id: string, content: string) => void
  deleteNote: (id: string) => void

  tasks: Task[]
  addTask: (title: string, priority: Task['priority']) => void
  moveTask: (id: string, status: Task['status']) => void
  deleteTask: (id: string) => void
}

let _tabCounter = 0

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentView: 'dashboard',
      setCurrentView: (v) => set({ currentView: v }),

      apps: DEFAULT_APPS,
      addApp: (app) =>
        set((s) => ({
          apps: [...s.apps, { ...app, id: `custom-${Date.now()}` }]
        })),
      removeApp: (id) =>
        set((s) => ({
          apps: s.apps.filter((a) => a.id !== id),
          tabs: s.tabs.filter((t) => t.appId !== id)
        })),

      tabs: [],
      activeTabId: null,
      // Entry point for clicking an app. Native apps launch as their own desktop
      // window (full native speed, already logged in); web apps open as a tab.
      openApp: (appId) => {
        const app = get().apps.find((a) => a.id === appId)
        if (app?.native && window.api?.launchNative) {
          window.api.launchNative(appId).then((res) => {
            // Not installed → fall back to the web view so the button still works.
            if (!res.success) get().openTab(appId)
          })
          return
        }
        get().openTab(appId)
      },
      openTab: (appId, forceNew = false) => {
        const state = get()
        if (!forceNew) {
          const existing = state.tabs.find((t) => t.appId === appId)
          if (existing) {
            set({ activeTabId: existing.id, currentView: 'app' })
            return
          }
        }
        const app = state.apps.find((a) => a.id === appId)
        if (!app) return
        const tabId = `tab-${++_tabCounter}-${Date.now()}`
        set({
          tabs: [...state.tabs, { id: tabId, appId, title: app.name, isLoading: true }],
          activeTabId: tabId,
          currentView: 'app'
        })
      },
      closeTab: (tabId) =>
        set((s) => {
          const newTabs = s.tabs.filter((t) => t.id !== tabId)
          let newActive = s.activeTabId
          if (s.activeTabId === tabId) {
            newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
          }
          return {
            tabs: newTabs,
            activeTabId: newActive,
            currentView: newTabs.length === 0 || newActive === null ? 'dashboard' : s.currentView
          }
        }),
      setActiveTab: (tabId) => set({ activeTabId: tabId, currentView: 'app' }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      pomodoroVisible: false,
      togglePomodoro: () => set((s) => ({ pomodoroVisible: !s.pomodoroVisible })),

      notesVisible: false,
      toggleNotes: () => set((s) => ({ notesVisible: !s.notesVisible })),
      addAppVisible: false,
      setAddApp: (v) => set({ addAppVisible: v }),
      notes: [],
      addNote: () =>
        set((s) => ({
          notes: [
            { id: `note-${Date.now()}`, content: '', createdAt: Date.now(), updatedAt: Date.now() },
            ...s.notes
          ]
        })),
      updateNote: (id, content) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, content, updatedAt: Date.now() } : n))
        })),
      deleteNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      tasks: [],
      addTask: (title, priority) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            { id: `task-${Date.now()}`, title, status: 'todo', priority, createdAt: Date.now() }
          ]
        })),
      moveTask: (id, status) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t))
        })),
      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    }),
    {
      name: 'workdeck-storage',
      partialize: (state) => ({
        notes: state.notes,
        tasks: state.tasks,
        sidebarCollapsed: state.sidebarCollapsed,
        // Remember which app tabs were open so reopening WorkDeck restores the
        // user's session instead of starting empty.
        tabs: state.tabs,
        activeTabId: state.activeTabId
      }),
      // Tabs are restored from a previous run, so clear the transient loading
      // flag — the web views/native windows re-attach fresh on mount.
      onRehydrateStorage: () => (state) => {
        if (state?.tabs) {
          state.tabs = state.tabs.map((t) => ({ ...t, isLoading: false }))
        }
      },
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2 && persistedState.apps) {
          delete persistedState.apps
        }
        return persistedState
      }
    }
  )
)
