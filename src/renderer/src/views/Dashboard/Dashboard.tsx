import { useAppStore } from '../../stores/app-store'
import './Dashboard.css'

interface DashboardProps {
  onAddApp: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  'ai-coding': '🤖 AI & Coding',
  'ai-chat': '💬 AI Chat',
  'dev-tools': '🛠️ Dev Tools',
  'productivity': '📋 Productivity',
  'communication': '💬 Communication',
  'custom': '🌐 Custom'
}

export default function Dashboard({ onAddApp }: DashboardProps): JSX.Element {
  const { apps, openApp, tabs, tasks } = useAppStore()

  const todoCount = tasks.filter(t => t.status === 'todo').length
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length
  const doneCount = tasks.filter(t => t.status === 'done').length

  const grouped = apps.reduce<Record<string, typeof apps>>((acc, app) => {
    const cat = app.category || 'custom'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(app)
    return acc
  }, {})

  return (
    <div className="dashboard animate-fade-in">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">
            Welcome to <span className="gradient-text">WorkDeck</span>
          </h1>
          <p className="dash-subtitle">Your unified workspace — all tools in one place</p>
        </div>
        <div className="dash-stats">
          <div className="stat-card stat-todo">
            <span className="stat-value">{todoCount}</span>
            <span className="stat-label">To Do</span>
          </div>
          <div className="stat-card stat-progress">
            <span className="stat-value">{inProgressCount}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-card stat-done">
            <span className="stat-value">{doneCount}</span>
            <span className="stat-label">Done</span>
          </div>
        </div>
      </div>

      <div className="dash-sections">
        {Object.entries(grouped).map(([cat, catApps]) => (
          <div key={cat} className="dash-section">
            <h3 className="section-title">{CATEGORY_LABELS[cat] || cat}</h3>
            <div className="app-grid">
              {catApps.map((app, i) => {
                const hasTab = tabs.some(t => t.appId === app.id)
                return (
                  <button
                    key={app.id}
                    className={`app-card ${hasTab ? 'active' : ''}`}
                    onClick={() => openApp(app.id)}
                    style={{ '--card-color': app.color, animationDelay: `${i * 50}ms` } as React.CSSProperties}
                  >
                    <div className="app-card-icon">{app.icon}</div>
                    <div className="app-card-info">
                      <span className="app-card-name">{app.name}</span>
                      <span className="app-card-url">{app.native ? 'Ứng dụng trên máy' : new URL(app.url).hostname}</span>
                    </div>
                    {app.native ? <span className="app-card-badge">APP</span> : hasTab && <span className="app-card-badge">OPEN</span>}
                  </button>
                )
              })}

              {cat === Object.keys(grouped).pop() && (
                <button className="app-card app-card-add" onClick={onAddApp}>
                  <div className="app-card-icon">➕</div>
                  <div className="app-card-info">
                    <span className="app-card-name">Add App</span>
                    <span className="app-card-url">Custom URL</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="dash-shortcuts">
        <h3 className="section-title">⌨️ Keyboard Shortcuts</h3>
        <div className="shortcut-grid">
          {[
            ['Ctrl+1-9', 'Switch Tab'],
            ['Ctrl+D', 'Dashboard'],
            ['Ctrl+P', 'Pomodoro'],
            ['Ctrl+N', 'Notes'],
            ['Ctrl+W', 'Close Tab'],
          ].map(([key, desc]) => (
            <div key={key} className="shortcut-item">
              <kbd>{key}</kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
