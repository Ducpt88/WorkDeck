import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import './WebviewContainer.css'

export default function WebviewContainer(): JSX.Element {
  const { tabs, activeTabId, apps, addAppVisible } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const webviewRefs = useRef<Map<string, HTMLElement>>(new Map())
  // Native apps whose desktop window is currently reparented into this container.
  const nativeAttached = useRef<Set<string>>(new Set())
  // Native apps that couldn't be embedded (e.g. not installed) and fell back to web.
  const webFallback = useRef<Set<string>>(new Set())

  const getBounds = (): { x: number; y: number; width: number; height: number } => {
    const r = containerRef.current?.getBoundingClientRect()
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 }
  }

  const createWebview = useCallback((tabId: string, url: string, appId: string) => {
    if (webviewRefs.current.has(tabId)) return
    const wv = document.createElement('webview') as any
    wv.setAttribute('partition', `persist:${appId}`)
    wv.setAttribute('allowpopups', 'true')
    wv.setAttribute('autosize', 'on')
    wv.className = 'webview-instance'
    wv.style.display = 'none'
    wv.addEventListener('did-start-loading', () => {
      useAppStore.setState(s => ({ tabs: s.tabs.map(t => t.id === tabId ? { ...t, isLoading: true } : t) }))
    })
    wv.addEventListener('did-stop-loading', () => {
      useAppStore.setState(s => ({ tabs: s.tabs.map(t => t.id === tabId ? { ...t, isLoading: false } : t) }))
    })
    wv.addEventListener('page-title-updated', (e: any) => {
      const title = e.title?.substring(0, 40) || 'Untitled'
      useAppStore.setState(s => ({ tabs: s.tabs.map(t => t.id === tabId ? { ...t, title } : t) }))
    })
    containerRef.current?.appendChild(wv)
    webviewRefs.current.set(tabId, wv)
    wv.src = url
  }, [])

  // Native apps get their desktop window reparented in; web apps get a web view.
  useEffect(() => {
    tabs.forEach(tab => {
      const app = apps.find(a => a.id === tab.appId)
      if (!app) return
      const wantsNative = app.native && !webFallback.current.has(app.id)
      if (wantsNative) {
        if (!nativeAttached.current.has(app.id)) {
          nativeAttached.current.add(app.id)
          window.api?.embed?.attach(app.id, getBounds())?.then(res => {
            useAppStore.setState(s => ({ tabs: s.tabs.map(t => t.id === tab.id ? { ...t, isLoading: false } : t) }))
            if (!res.found) {
              webFallback.current.add(app.id)
              nativeAttached.current.delete(app.id)
              createWebview(tab.id, app.url, app.id)
            }
          })
        }
      } else {
        createWebview(tab.id, app.url, app.id)
      }
    })
    webviewRefs.current.forEach((wv, id) => {
      if (!tabs.find(t => t.id === id)) {
        wv.remove()
        webviewRefs.current.delete(id)
      }
    })
    nativeAttached.current.forEach(appId => {
      if (!tabs.find(t => t.appId === appId)) {
        window.api?.embed?.detach(appId)
        nativeAttached.current.delete(appId)
      }
    })
  }, [tabs, apps, createWebview])

  // Reload an app's open web views after its cookies are imported.
  useEffect(() => {
    const onReload = (e: Event): void => {
      const appId = (e as CustomEvent).detail?.appId
      if (!appId) return
      useAppStore.getState().tabs.filter(t => t.appId === appId).forEach(tab => {
        const wv = webviewRefs.current.get(tab.id) as any
        try { wv?.reloadIgnoringCache?.() ?? wv?.reload?.() } catch { /* not ready */ }
      })
    }
    window.addEventListener('workdeck:reload-app', onReload)
    return () => window.removeEventListener('workdeck:reload-app', onReload)
  }, [])

  // Show only the active tab's surface. Native windows are shown/hidden via the OS
  // and repositioned. A full-screen modal must hide the (always-on-top) embed.
  useEffect(() => {
    webviewRefs.current.forEach((wv, id) => {
      ;(wv as HTMLElement).style.display = id === activeTabId ? 'flex' : 'none'
    })
    const activeAppId = tabs.find(t => t.id === activeTabId)?.appId
    nativeAttached.current.forEach(appId => {
      const visible = appId === activeAppId && !addAppVisible
      window.api?.embed?.setVisible(appId, visible)
      if (visible) window.api?.embed?.setBounds(appId, getBounds())
    })
  }, [activeTabId, tabs, addAppVisible])

  // On unmount (leaving 'app' view), hide embeds so they don't float over other views.
  useEffect(() => {
    const attached = nativeAttached.current
    return () => { attached.forEach(appId => window.api?.embed?.setVisible(appId, false)) }
  }, [])

  // Keep the active native window aligned with the content area as it resizes.
  useEffect(() => {
    let raf = 0
    const flush = (): void => {
      raf = 0
      const state = useAppStore.getState()
      const activeAppId = state.tabs.find(t => t.id === state.activeTabId)?.appId
      if (activeAppId && nativeAttached.current.has(activeAppId)) {
        window.api?.embed?.setBounds(activeAppId, getBounds())
      }
    }
    const update = (): void => { if (!raf) raf = requestAnimationFrame(flush) }
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', update)
    return () => { if (raf) cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  return <div ref={containerRef} className="webview-container" />
}
