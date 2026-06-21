import { useAppStore } from '../../stores/app-store'
import './QuickNotes.css'

export default function QuickNotes(): JSX.Element {
  const { notes, addNote, updateNote, deleteNote, toggleNotes } = useAppStore()

  return (
    <div className="quicknotes animate-slide-in">
      <div className="qn-header">
        <span className="qn-title">📝 Quick Notes</span>
        <div className="qn-actions">
          <button className="qn-btn-add" onClick={addNote} title="New Note">+</button>
          <button className="qn-btn-close" onClick={toggleNotes}>✕</button>
        </div>
      </div>

      <div className="qn-list">
        {notes.length === 0 && (
          <div className="qn-empty">
            <p>No notes yet</p>
            <button className="qn-create" onClick={addNote}>Create your first note</button>
          </div>
        )}
        {notes.map(note => (
          <div key={note.id} className="qn-card">
            <textarea
              className="qn-textarea"
              value={note.content}
              onChange={e => updateNote(note.id, e.target.value)}
              placeholder="Type your note here..."
              rows={4}
            />
            <div className="qn-card-footer">
              <span className="qn-date">{new Date(note.updatedAt).toLocaleDateString('vi-VN')}</span>
              <button className="qn-delete" onClick={() => deleteNote(note.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
