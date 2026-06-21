import { useAppStore } from '../../stores/app-store'
import logoImg from '../../assets/logo.png'
import './Sidebar.css'

interface SidebarProps {
  onAddApp: () => void
}

export default function Sidebar({ onAddApp }: SidebarProps): JSX.Element {
  const { apps, tabs, currentView, setCurrentView, openApp, openTab, activeTabId, togglePomodoro, toggleNotes, pomodoroVisible, notesVisible } = useAppStore()

  const activeAppId = tabs.find(t => t.id === activeTabId)?.appId

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        {/* Logo */}
        <button
          className={`sidebar-btn sidebar-logo ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
          title="Dashboard (Ctrl+D)"
        >
          <img src={logoImg} alt="WorkDeck" className="logo-img" />
        </button>

        <div className="sidebar-divider" />

        {/* App icons */}
        <div className="sidebar-apps">
          {apps.map(app => {
            const isActive = currentView === 'app' && activeAppId === app.id
            const appTabs = tabs.filter(t => t.appId === app.id)
            const hasTab = appTabs.length > 0
            return (
              <div key={app.id} className="sidebar-app-wrapper">
                <button
                  className={`sidebar-btn sidebar-app ${isActive ? 'active' : ''} ${hasTab ? 'has-tab' : ''}`}
                  onClick={() => openApp(app.id)}
                  title={app.native ? `${app.name} (mở app trên máy)` : app.name}
                  style={{ '--app-color': app.color } as React.CSSProperties}
                >
                  <span className="app-icon">{app.icon}</span>
                  {hasTab && <span className="tab-dot" />}
                </button>
                {hasTab && (
                  <button 
                    className="sidebar-app-add-instance" 
                    onClick={() => openTab(app.id, true)}
                    title={`Mở thêm tab ${app.name}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button className="sidebar-btn sidebar-add" onClick={onAddApp} title="Add App">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div className="sidebar-bottom">
        <button
          className={`sidebar-btn ${currentView === 'taskboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('taskboard')}
          title="Task Board"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="5" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="11" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="11" y="9" width="5" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
        </button>

        <button
          className={`sidebar-btn ${pomodoroVisible ? 'active' : ''}`}
          onClick={togglePomodoro}
          title="Pomodoro (Ctrl+P)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9 6.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M7 2.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </button>

        <button
          className={`sidebar-btn ${notesVisible ? 'active' : ''}`}
          onClick={toggleNotes}
          title="Quick Notes (Ctrl+N)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M6 6h6M6 9h6M6 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>

        <div className="sidebar-divider" />

        <button
          className={`sidebar-btn ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  )
}
