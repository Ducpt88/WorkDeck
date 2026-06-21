import { useEffect } from 'react'
import { useAppStore } from './stores/app-store'
import Sidebar from './components/Sidebar/Sidebar'
import TabBar from './components/TabBar/TabBar'
import TitleBar from './components/TitleBar/TitleBar'
import WebviewContainer from './components/WebviewContainer/WebviewContainer'
import Dashboard from './views/Dashboard/Dashboard'
import TaskBoard from './views/TaskBoard/TaskBoard'
import Settings from './views/Settings/Settings'
import Pomodoro from './components/Pomodoro/Pomodoro'
import QuickNotes from './components/QuickNotes/QuickNotes'
import AddAppModal from './components/AddAppModal/AddAppModal'

function App(): JSX.Element {
  const { currentView, tabs, pomodoroVisible, notesVisible, addAppVisible, setAddApp } = useAppStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        const state = useAppStore.getState()
        if (state.tabs[idx]) state.setActiveTab(state.tabs[idx].id)
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        useAppStore.getState().setCurrentView('dashboard')
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        useAppStore.getState().togglePomodoro()
      }
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        useAppStore.getState().toggleNotes()
      }
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        const state = useAppStore.getState()
        if (state.activeTabId) state.closeTab(state.activeTabId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="app-layout">
      <Sidebar onAddApp={() => setAddApp(true)} />
      <div className="main-area">
        <TitleBar />
        {tabs.length > 0 && <TabBar />}
        <div className="content-area">
          {currentView === 'dashboard' && <Dashboard onAddApp={() => setAddApp(true)} />}
          {currentView === 'taskboard' && <TaskBoard />}
          {currentView === 'settings' && <Settings />}
          {currentView === 'app' && <WebviewContainer />}
        </div>
      </div>
      {pomodoroVisible && <Pomodoro />}
      {notesVisible && <QuickNotes />}
      {addAppVisible && <AddAppModal onClose={() => setAddApp(false)} />}
    </div>
  )
}

export default App
