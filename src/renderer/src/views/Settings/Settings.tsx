import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import './Settings.css'

export default function Settings(): JSX.Element {
  const { apps, removeApp } = useAppStore()
  const [cookieApp, setCookieApp] = useState(apps[0]?.id || '')
  const [cookieJson, setCookieJson] = useState('')
  const [syncStatus, setSyncStatus] = useState('')

  // ---- Auto-update state ----
  const [version, setVersion] = useState('')
  const [updateMsg, setUpdateMsg] = useState('')
  const [updateUrl, setUpdateUrl] = useState('')
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    window.api?.update?.version().then(setVersion).catch(() => setVersion('?'))
  }, [])

  const handleCheckUpdate = async (): Promise<void> => {
    setChecking(true)
    setUpdateUrl('')
    setUpdateMsg('Đang kiểm tra...')
    try {
      const r = await window.api.update.check()
      if (!r.ok) { setUpdateMsg(`❌ Lỗi: ${r.error}`); return }
      if (r.note === 'no-release') { setUpdateMsg('Chưa có bản phát hành nào trên GitHub.'); return }
      if (r.hasUpdate && r.url) {
        setUpdateUrl(r.url)
        setUpdateMsg(`🎉 Có bản mới v${r.latest} (đang dùng v${r.current}).`)
      } else {
        setUpdateMsg(`✅ Bạn đang dùng bản mới nhất (v${r.current}).`)
      }
    } catch (e: any) {
      setUpdateMsg(`❌ Lỗi: ${e.message}`)
    } finally {
      setChecking(false)
    }
  }

  const handleInstall = async (): Promise<void> => {
    setInstalling(true)
    setUpdateMsg('⬇️ Đang tải & cài bản mới, app sẽ tự khởi động lại...')
    const r = await window.api.update.install(updateUrl)
    if (!r.ok) { setUpdateMsg(`❌ Lỗi cài đặt: ${r.error}`); setInstalling(false) }
  }

  const handleSync = async () => {
    if (!cookieJson.trim() || !cookieApp) return
    setSyncStatus('Đang xử lý...')
    try {
      const res = await window.api.session.syncCookies(cookieApp, cookieJson)
      if (res.success && res.missingAuth) {
        setSyncStatus(
          `⚠️ Đã nạp ${res.count} cookies NHƯNG thiếu cookie đăng nhập "${res.expected}". ` +
          `Hãy export LẠI và đảm bảo có cookie "${res.expected}" (bật hiện cả cookie httpOnly).`
        )
        return
      }
      if (res.success) {
        setSyncStatus(`✅ Thành công! Đã nạp ${res.count} cookies. Đang mở lại app...`)
        setCookieJson('')
        // Reload any open webview for this app so the login applies right away.
        window.dispatchEvent(
          new CustomEvent('workdeck:reload-app', { detail: { appId: cookieApp } })
        )
        // Open the app so the user lands straight on the logged-in session.
        useAppStore.getState().openTab(cookieApp)
      } else {
        setSyncStatus(`❌ Lỗi: ${res.error}`)
      }
    } catch (e: any) {
      setSyncStatus(`❌ Lỗi: ${e.message}`)
    }
  }

  return (
    <div className="settings animate-fade-in">
      <h2 className="settings-title">⚙️ Settings</h2>

      <section className="settings-section">
        <h3>Managed Apps</h3>
        <p className="settings-desc">Apps available in your workspace. Remove custom apps or rearrange them.</p>
        <div className="settings-app-list">
          {apps.map(app => (
            <div key={app.id} className="settings-app-row">
              <span className="settings-app-icon">{app.icon}</span>
              <div className="settings-app-info">
                <span className="settings-app-name">{app.name}</span>
                <span className="settings-app-url">{app.url}</span>
              </div>
              <span className="settings-app-cat">{app.category}</span>
              {app.id.startsWith('custom-') && (
                <button className="settings-remove" onClick={() => removeApp(app.id)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>Keyboard Shortcuts</h3>
        <div className="settings-shortcuts">
          {[
            ['Ctrl+1-9', 'Switch to tab N'],
            ['Ctrl+D', 'Go to Dashboard'],
            ['Ctrl+P', 'Toggle Pomodoro Timer'],
            ['Ctrl+N', 'Toggle Quick Notes'],
            ['Ctrl+W', 'Close current tab'],
          ].map(([key, desc]) => (
            <div key={key} className="settings-shortcut-row">
              <kbd>{key}</kbd>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>Cookie Sync (Nhận diện tài khoản)</h3>
        <p className="settings-desc">
          Chọn app (vd: <strong>Claude</strong>) → dán chuỗi JSON Cookies export từ extension cookie
          (Cookie-Editor / EditThisCookie) của tài khoản bạn đang đăng nhập trên trình duyệt → bấm
          Áp dụng. App sẽ tự mở lại và vào thẳng tài khoản, không cần đăng nhập.
        </p>
        <div className="cookie-sync-box">
          <select 
            value={cookieApp} 
            onChange={e => setCookieApp(e.target.value)}
            className="cookie-select"
          >
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <textarea 
            placeholder='Paste JSON array ở đây: [{"name": "__Secure-next-auth.session-token", ...}]'
            value={cookieJson}
            onChange={e => setCookieJson(e.target.value)}
            className="cookie-textarea"
          />
          <div className="cookie-actions">
            <span className="cookie-status">{syncStatus}</span>
            <button className="cookie-btn" onClick={handleSync}>Áp dụng Cookies</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>Cập nhật</h3>
        <p className="settings-desc">
          Phiên bản hiện tại: <strong>WorkDeck v{version || '...'}</strong>. Bấm để kiểm tra bản mới
          từ GitHub; nếu có, app sẽ tải về và tự khởi động lại.
        </p>
        <div className="cookie-actions">
          <span className="cookie-status">{updateMsg}</span>
          {updateUrl ? (
            <button className="cookie-btn" onClick={handleInstall} disabled={installing}>
              {installing ? 'Đang cài...' : '⬇️ Tải & cài bản mới'}
            </button>
          ) : (
            <button className="cookie-btn" onClick={handleCheckUpdate} disabled={checking}>
              {checking ? 'Đang kiểm tra...' : '🔄 Kiểm tra cập nhật'}
            </button>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3>About</h3>
        <p className="settings-desc">
          <strong>WorkDeck v{version || '1.0.0'}</strong><br/>
          Unified Workspace Hub — All your AI tools and apps in one place.<br/>
          Built with Electron + React + TypeScript
        </p>
      </section>
    </div>
  )
}
