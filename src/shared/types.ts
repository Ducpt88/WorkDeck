export interface AppConfig {
  id: string
  name: string
  url: string
  icon: string
  color: string
  category: 'ai-coding' | 'ai-chat' | 'dev-tools' | 'productivity' | 'communication' | 'custom'
  // When true, clicking the app launches the installed native desktop app
  // (reusing its existing login) instead of opening the web view.
  native?: boolean
}

export interface Tab {
  id: string
  appId: string
  title: string
  isLoading: boolean
}

export interface Task {
  id: string
  title: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  createdAt: number
}

export interface Note {
  id: string
  content: string
  createdAt: number
  updatedAt: number
}

export type ViewType = 'dashboard' | 'taskboard' | 'settings' | 'app'
