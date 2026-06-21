import { useAppStore } from '../../stores/app-store'
import './TabBar.css'

export default function TabBar(): JSX.Element {
  const { tabs, activeTabId, setActiveTab, closeTab, apps } = useAppStore()

  return (
    <div className="tabbar">
      <div className="tabbar-scroll">
        {tabs.map(tab => {
          const app = apps.find(a => a.id === tab.appId)
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ '--tab-color': app?.color || '#3b82f6' } as React.CSSProperties}
            >
              <span className="tab-icon">{app?.icon || '🌐'}</span>
              <span className="tab-title">{tab.title}</span>
              {tab.isLoading && <span className="tab-loading" />}
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.2"/></svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
