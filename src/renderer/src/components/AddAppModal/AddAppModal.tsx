import { useState } from 'react'
import { useAppStore } from '../../stores/app-store'
import { AppConfig } from '../../../../shared/types'
import './AddAppModal.css'

interface Props {
  onClose: () => void
}

export default function AddAppModal({ onClose }: Props): JSX.Element {
  const { addApp } = useAppStore()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('https://')
  const [icon, setIcon] = useState('🌐')
  const [color, setColor] = useState('#3b82f6')
  const [category, setCategory] = useState<AppConfig['category']>('custom')

  const handleSubmit = (): void => {
    if (!name.trim() || !url.trim()) return
    addApp({ name: name.trim(), url: url.trim(), icon, color, category })
    onClose()
  }

  const EMOJIS = ['🌐', '💻', '🔧', '📊', '🎯', '🚀', '📱', '🤖', '💡', '🔗', '📂', '🎨']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">➕ Add Custom App</h3>

        <div className="modal-field">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="My App" />
        </div>

        <div className="modal-field">
          <label>URL</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
        </div>

        <div className="modal-field">
          <label>Icon</label>
          <div className="emoji-picker">
            {EMOJIS.map(em => (
              <button
                key={em}
                className={`emoji-btn ${icon === em ? 'selected' : ''}`}
                onClick={() => setIcon(em)}
              >{em}</button>
            ))}
          </div>
        </div>

        <div className="modal-row">
          <div className="modal-field">
            <label>Color</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="color-input" />
          </div>
          <div className="modal-field">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as AppConfig['category'])}>
              <option value="ai-coding">AI & Coding</option>
              <option value="ai-chat">AI Chat</option>
              <option value="dev-tools">Dev Tools</option>
              <option value="productivity">Productivity</option>
              <option value="communication">Communication</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>Cancel</button>
          <button className="modal-submit" onClick={handleSubmit}>Add App</button>
        </div>
      </div>
    </div>
  )
}
