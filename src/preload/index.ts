import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb: (maximized: boolean) => void): void => {
      ipcRenderer.on('window:maximized', (_, val) => cb(val))
    }
  },
  session: {
    syncCookies: (appId: string, cookiesJSON: string) =>
      ipcRenderer.invoke('sync-cookies', { appId, cookiesJSON })
  },
  launchNative: (appId: string) => ipcRenderer.invoke('app:launch-native', appId),
  update: {
    version: () => ipcRenderer.invoke('app:version'),
    check: () => ipcRenderer.invoke('update:check'),
    install: (url: string) => ipcRenderer.invoke('update:install', url)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
