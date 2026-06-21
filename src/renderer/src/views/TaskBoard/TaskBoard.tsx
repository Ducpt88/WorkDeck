import { useState } from 'react'
import { useAppStore } from '../../stores/app-store'
import { Task } from '../../../../shared/types'
import './TaskBoard.css'

const COLUMNS: { status: Task['status']; label: string; emoji: string }[] = [
  { status: 'todo', label: 'To Do', emoji: '📋' },
  { status: 'in-progress', label: 'In Progress', emoji: '🔄' },
  { status: 'done', label: 'Done', emoji: '✅' }
]

const PRIORITY_COLORS = {
  high: { bg: 'var(--accent-red-dim)', color: 'var(--accent-red)' },
  medium: { bg: 'var(--accent-orange-dim)', color: 'var(--accent-orange)' },
  low: { bg: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }
}

export default function TaskBoard(): JSX.Element {
  const { tasks, addTask, moveTask, deleteTask } = useAppStore()
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium')

  const handleAdd = (): void => {
    if (!newTitle.trim()) return
    addTask(newTitle.trim(), newPriority)
    setNewTitle('')
  }

  return (
    <div className="taskboard animate-fade-in">
      <div className="tb-header">
        <h2>📊 Task Board</h2>
        <div className="tb-add-form">
          <input
            className="tb-input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add new task..."
          />
          <select className="tb-select" value={newPriority} onChange={e => setNewPriority(e.target.value as Task['priority'])}>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>
          </select>
          <button className="tb-add-btn" onClick={handleAdd}>Add</button>
        </div>
      </div>

      <div className="tb-columns">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status)
          return (
            <div key={col.status} className="tb-column">
              <div className="tb-col-header">
                <span>{col.emoji} {col.label}</span>
                <span className="tb-col-count">{colTasks.length}</span>
              </div>
              <div className="tb-col-body">
                {colTasks.map(task => (
                  <div key={task.id} className="tb-card">
                    <div className="tb-card-top">
                      <span
                        className="tb-card-priority"
                        style={{ background: PRIORITY_COLORS[task.priority].bg, color: PRIORITY_COLORS[task.priority].color }}
                      >
                        {task.priority}
                      </span>
                      <button className="tb-card-delete" onClick={() => deleteTask(task.id)}>✕</button>
                    </div>
                    <p className="tb-card-title">{task.title}</p>
                    <div className="tb-card-actions">
                      {col.status !== 'todo' && (
                        <button onClick={() => moveTask(task.id, col.status === 'done' ? 'in-progress' : 'todo')}>← Back</button>
                      )}
                      {col.status !== 'done' && (
                        <button onClick={() => moveTask(task.id, col.status === 'todo' ? 'in-progress' : 'done')}>Next →</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
