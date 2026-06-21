import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (cb: (maximized: boolean) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: WindowAPI
      session: {
        syncCookies: (appId: string, cookiesJSON: string) => Promise<{ success: boolean; count?: number; missingAuth?: boolean; expected?: string; error?: string }>
      }
      launchNative: (appId: string) => Promise<{ success: boolean; error?: string }>
      update: {
        version: () => Promise<string>
        check: () => Promise<{ ok: boolean; hasUpdate?: boolean; latest?: string; current?: string; url?: string; notes?: string; note?: string; error?: string }>
        install: (url: string) => Promise<{ ok: boolean; error?: string }>
      }
    }
  }
}
