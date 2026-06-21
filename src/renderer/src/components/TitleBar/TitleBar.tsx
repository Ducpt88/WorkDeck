import { useState, useEffect } from 'react'
import './TitleBar.css'

export default function TitleBar(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.api?.window.isMaximized().then(setMaximized)
    window.api?.window.onMaximizeChange(setMaximized)
  }, [])

  return (
    <div className="titlebar drag-region">
      {/* macOS-style traffic light buttons */}
      <div className="traffic-lights no-drag">
        <button
          className="tl-btn tl-close"
          onClick={() => window.api?.window.close()}
          title="Close"
        >
          <svg width="6" height="6" viewBox="0 0 6 6"><path d="M0.5 0.5L5.5 5.5M5.5 0.5L0.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>
        <button
          className="tl-btn tl-minimize"
          onClick={() => window.api?.window.minimize()}
          title="Minimize"
        >
          <svg width="8" height="2" viewBox="0 0 8 2"><path d="M1 1H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </button>
        <button
          className="tl-btn tl-maximize"
          onClick={() => window.api?.window.maximize()}
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? (
            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 2.5h5v4.5H1z" stroke="currentColor" strokeWidth="1" fill="none"/><path d="M2.5 2.5V1H7v4.5H6" stroke="currentColor" strokeWidth="1" fill="none"/></svg>
          ) : (
            <svg width="6" height="6" viewBox="0 0 6 6"><path d="M0 1L3 5L6 1" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="rotate(45 3 3)"/></svg>
          )}
        </button>
      </div>

      <div className="titlebar-center">
        <span className="titlebar-title">WorkDeck</span>
      </div>

      <div className="titlebar-spacer" />
    </div>
  )
}
