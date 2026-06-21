import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import './WebviewContainer.css'

export default function WebviewContainer(): JSX.Element {
  const { tabs, activeTabId, apps } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const webviewRefs = useRef<Map<string, HTMLElement>>(new Map())

  const createWebview = useCallback((tabId: string, url: string, appId: string) => {
    if (webviewRefs.current.has(tabId)) return
    const wv = document.createElement('webview') as any
    // Per-app persistent + isolated session: logins survive restarts and accounts
    // don't clobber each other. Partition must be set before the element navigates.
    wv.setAttribute('partition', `persist:${appId}`)
    wv.setAttribute('allowpopups', 'true')
    wv.setAttribute('autosize', 'on')
    wv.className = 'webview-instance'
    wv.style.display = 'none'

    wv.addEventListener('did-start-loading', () => {
      useAppStore.setState(s => ({
        tabs: s.tabs.map(t => t.id === tabId ? { ...t, isLoading: true } : t)
      }))
    })
    wv.addEventListener('did-stop-loading', () => {
      useAppStore.setState(s => ({
        tabs: s.tabs.map(t => t.id === tabId ? { ...t, isLoading: false } : t)
      }))
    })
    wv.addEventListener('page-title-updated', (e: any) => {
      const title = e.title?.substring(0, 40) || 'Untitled'
      useAppStore.setState(s => ({
        tabs: s.tabs.map(t => t.id === tabId ? { ...t, title } : t)
      }))
    })

    containerRef.current?.appendChild(wv)
    webviewRefs.current.set(tabId, wv)
    wv.src = url
  }, [])

  // Create web views for new tabs. (Native apps don't open as tabs — they launch
  // as their own desktop window — so only web apps reach here.)
  useEffect(() => {
    tabs.forEach(tab => {
      const app = apps.find(a => a.id === tab.appId)
      if (app) createWebview(tab.id, app.url, app.id)
    })
    // Clean up removed tabs
    webviewRefs.current.forEach((wv, id) => {
      if (!tabs.find(t => t.id === id)) {
        wv.remove()
        webviewRefs.current.delete(id)
      }
    })
  }, [tabs, apps, createWebview])

  // Reload an app's open web views after its cookies are imported.
  useEffect(() => {
    const onReload = (e: Event): void => {
      const appId = (e as CustomEvent).detail?.appId
      if (!appId) return
      const openTabs = useAppStore.getState().tabs.filter(t => t.appId === appId)
      openTabs.forEach(tab => {
        const wv = webviewRefs.current.get(tab.id) as any
        try {
          wv?.reloadIgnoringCache?.() ?? wv?.reload?.()
        } catch {
          /* webview not ready yet */
        }
      })
    }
    window.addEventListener('workdeck:reload-app', onReload)
    return () => window.removeEventListener('workdeck:reload-app', onReload)
  }, [])

  // Toggle visibility based on active tab.
  useEffect(() => {
    webviewRefs.current.forEach((wv, id) => {
      ;(wv as HTMLElement).style.display = id === activeTabId ? 'flex' : 'none'
    })
  }, [activeTabId])

  return <div ref={containerRef} className="webview-container" />
}
