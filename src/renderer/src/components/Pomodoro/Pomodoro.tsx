import { useState, useEffect, useRef, useCallback } from 'react'
import './Pomodoro.css'

type Phase = 'work' | 'break'

export default function Pomodoro(): JSX.Element {
  const [workMin, setWorkMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('work')
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const totalSeconds = phase === 'work' ? workMin * 60 : breakMin * 60
  const progress = 1 - seconds / totalSeconds
  const displayMin = Math.floor(seconds / 60)
  const displaySec = seconds % 60

  const reset = useCallback(() => {
    setSeconds(workMin * 60)
    setPhase('work')
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [workMin])

  // Fire a desktop notification without ever letting a failure break the timer tick.
  const notify = (body: string): void => {
    try {
      new Notification('WorkDeck Pomodoro', { body })
    } catch {
      /* notifications unavailable — ignore */
    }
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            // Phase complete
            if (phase === 'work') {
              setSessions(p => p + 1)
              setPhase('break')
              notify('☕ Break time!')
              return breakMin * 60
            } else {
              setPhase('work')
              notify('🔥 Back to work!')
              return workMin * 60
            }
          }
          return s - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, phase, workMin, breakMin])

  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="pomodoro animate-scale-in">
      <div className="pomo-header">
        <span className="pomo-title">🍅 Pomodoro</span>
        <span className={`pomo-phase ${phase}`}>{phase === 'work' ? 'FOCUS' : 'BREAK'}</span>
      </div>

      <div className="pomo-timer">
        <svg className="pomo-ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" className="pomo-ring-bg" />
          <circle
            cx="60" cy="60" r="54"
            className={`pomo-ring-progress ${phase}`}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="pomo-time">
          {String(displayMin).padStart(2, '0')}:{String(displaySec).padStart(2, '0')}
        </div>
      </div>

      <div className="pomo-controls">
        <button className={`pomo-btn ${running ? 'pause' : 'start'}`} onClick={() => setRunning(!running)}>
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button className="pomo-btn reset" onClick={reset}>↺ Reset</button>
      </div>

      <div className="pomo-config">
        <label>
          <span>Work</span>
          <select value={workMin} onChange={e => { setWorkMin(+e.target.value); if (!running) setSeconds(+e.target.value * 60) }}>
            {[15,20,25,30,45,50,60].map(m => <option key={m} value={m}>{m}m</option>)}
          </select>
        </label>
        <label>
          <span>Break</span>
          <select value={breakMin} onChange={e => setBreakMin(+e.target.value)}>
            {[3,5,10,15].map(m => <option key={m} value={m}>{m}m</option>)}
          </select>
        </label>
      </div>

      <div className="pomo-sessions">
        Sessions today: <strong>{sessions}</strong>
      </div>
    </div>
  )
}
