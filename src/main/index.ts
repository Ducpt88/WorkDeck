import { app, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { tmpdir } from 'os'
import { promises as fsp } from 'fs'
import { spawn } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// GitHub repo that hosts WorkDeck releases (for the in-app updater).
const UPDATE_REPO = 'Ducpt88/WorkDeck'

let mainWindow: BrowserWindow | null = null

// Real desktop Chrome user-agent so providers (Google/Gemini/GitHub) don't block
// the embedded views with "this browser may not be secure".
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// Each app gets its own persistent, isolated session so logins survive restarts
// and accounts don't clobber each other across apps. Name matches the webview's
// `partition` attribute and the historical cookie-sync target.
const partitionFor = (appId: string): string => `persist:${appId}`

// Cookie that proves you're actually logged in, per app. Used to warn the user
// when an imported cookie set is missing the real auth token.
const AUTH_COOKIE: Record<string, string> = {
  claude: 'sessionKey',
  codex: '__Secure-next-auth.session-token',
  github: 'user_session'
}

// Native desktop apps already installed + signed in on this machine. Launching
// these reuses their existing session, so the user never logs in inside WorkDeck.
// `aumid` is the Windows AppUserModelID (works for both Store/UWP and registered
// desktop apps via the shell AppsFolder); `exe` is a direct-path fallback.
// This is the allowlist — the renderer can only launch apps named here.
const NATIVE_LAUNCH: Record<string, { aumid?: string; exe?: string }> = {
  claude: {
    aumid: 'com.squirrel.AnthropicClaude.claude',
    exe: join(process.env.LOCALAPPDATA || '', 'AnthropicClaude', 'claude.exe')
  },
  codex: {
    aumid: 'OpenAI.Codex_2p2nqsd0c76g0!App'
  },
  antigravity: {
    aumid: 'com.google.antigravity',
    exe: join(process.env.LOCALAPPDATA || '', 'Programs', 'antigravity', 'Antigravity.exe')
  }
}

// Launch a native app by appId. Tries the AUMID via Explorer's AppsFolder first
// (covers Store apps and desktop apps uniformly), then falls back to the exe.
function launchNativeApp(appId: string): { success: boolean; error?: string } {
  const target = NATIVE_LAUNCH[appId]
  if (!target) return { success: false, error: `Unknown native app: ${appId}` }
  if (target.aumid) {
    try {
      spawn('explorer.exe', [`shell:AppsFolder\\${target.aumid}`], {
        detached: true,
        stdio: 'ignore'
      }).unref()
      return { success: true }
    } catch {
      /* fall through to exe */
    }
  }
  if (target.exe) {
    try {
      spawn(target.exe, [], { detached: true, stdio: 'ignore' }).unref()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
  return { success: false, error: `No launch target for: ${appId}` }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    icon: icon,
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true,
      // Trim weight: no spellcheck dictionaries, throttle hidden/background renderers.
      spellcheck: false,
      backgroundThrottling: true
    },
    show: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized', false)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Window control IPC
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

// Launch a native desktop app (reuses its existing login). Returns success/error
// so the renderer can fall back to the web view if the app isn't installed.
ipcMain.handle('app:launch-native', (_, appId: string) => launchNativeApp(appId))

// ---- In-app updater (GitHub Releases) -------------------------------------
ipcMain.handle('app:version', () => app.getVersion())

// Compare dotted versions; returns >0 if a is newer than b.
function cmpVersion(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n) || 0)
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n) || 0)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d !== 0) return d
  }
  return 0
}

// Ask GitHub whether a newer release exists than the running version.
ipcMain.handle('update:check', async () => {
  try {
    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'WorkDeck', Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) {
      if (res.status === 404) return { ok: true, hasUpdate: false, current: app.getVersion(), note: 'no-release' }
      throw new Error(`GitHub API ${res.status}`)
    }
    const rel: any = await res.json()
    const latest = String(rel.tag_name || '').replace(/^v/, '')
    const current = app.getVersion()
    const asset = (rel.assets || []).find((a: any) => String(a.name).toLowerCase().endsWith('.zip'))
    const hasUpdate = !!latest && !!asset && cmpVersion(latest, current) > 0
    return { ok: true, hasUpdate, latest, current, url: asset?.browser_download_url, notes: rel.body || '' }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

// Download the new release zip, then hand off to a helper script that waits for
// WorkDeck to exit, copies the new files over the app folder, and relaunches.
ipcMain.handle('update:install', async (_, url: string) => {
  try {
    if (!url) throw new Error('Thiếu link tải')
    const tmp = join(tmpdir(), 'workdeck-update')
    await fsp.rm(tmp, { recursive: true, force: true })
    const extractDir = join(tmp, 'new')
    await fsp.mkdir(extractDir, { recursive: true })
    const zipPath = join(tmp, 'update.zip')

    const res = await fetch(url, { headers: { 'User-Agent': 'WorkDeck' } })
    if (!res.ok) throw new Error(`Tải lỗi ${res.status}`)
    await fsp.writeFile(zipPath, Buffer.from(await res.arrayBuffer()))

    // Extract with Windows' built-in tar (handles .zip).
    await new Promise<void>((resolve, reject) => {
      const p = spawn('tar', ['-xf', zipPath, '-C', extractDir], { windowsHide: true })
      p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('Giải nén lỗi ' + c))))
      p.on('error', reject)
    })

    const appDir = join(app.getPath('exe'), '..')
    const bat = join(tmp, 'apply-update.bat')
    const script = [
      '@echo off',
      'timeout /t 2 /nobreak >nul',
      ':wait',
      'tasklist /fi "imagename eq WorkDeck.exe" 2>nul | find /i "WorkDeck.exe" >nul',
      'if not errorlevel 1 ( timeout /t 1 /nobreak >nul & goto wait )',
      `robocopy "${extractDir}" "${appDir}" /E /IS /IT /NFL /NDL /NJH /NJS >nul`,
      `start "" "${join(appDir, 'WorkDeck.exe')}"`,
      `rmdir /s /q "${tmp}"`
    ].join('\r\n')
    await fsp.writeFile(bat, script)
    spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    setTimeout(() => app.quit(), 400)
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
})

// Normalize sameSite values coming from cookie-editor extensions to what Electron expects.
function normalizeSameSite(v: any): 'unspecified' | 'no_restriction' | 'lax' | 'strict' | undefined {
  if (!v) return undefined
  const s = String(v).toLowerCase()
  if (s === 'no_restriction' || s === 'none') return 'no_restriction'
  if (s === 'lax') return 'lax'
  if (s === 'strict') return 'strict'
  if (s === 'unspecified') return 'unspecified'
  return undefined
}

// Write a batch of cookies into an app's persistent partition.
async function setCookies(appId: string, cookies: any[]): Promise<{ count: number; names: string[] }> {
  const ses = session.fromPartition(partitionFor(appId))
  let count = 0
  const names: string[] = []
  for (const c of cookies) {
    if (!c.name || c.value == null || !c.domain) continue

    const protocol = c.secure ? 'https://' : 'http://'
    const domainStr = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain
    const url = c.url || `${protocol}${domainStr}${c.path || '/'}`
    // chrome-cookies-secure ("puppeteer" format) uses `expires`; our JSON uses `expirationDate`.
    const expirationDate =
      c.expirationDate ?? (typeof c.expires === 'number' && c.expires > 0 ? c.expires : undefined)
    const sameSite = normalizeSameSite(c.sameSite)

    try {
      await ses.cookies.set({
        url,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        // sameSite=no_restriction requires secure; force it so the cookie isn't rejected.
        secure: c.secure ?? sameSite === 'no_restriction',
        httpOnly: c.httpOnly,
        expirationDate,
        sameSite
      })
      count++
      names.push(c.name)
    } catch {
      // Skip cookies the session rejects (e.g. invalid domain/host-only mismatch).
    }
  }
  return { count, names }
}

// Manual cookie sync (JSON payload) — kept for advanced/import-from-file use.
ipcMain.handle('sync-cookies', async (_, { appId, cookiesJSON }) => {
  try {
    const cookies = JSON.parse(cookiesJSON)
    if (!Array.isArray(cookies)) throw new Error('Invalid cookies format')
    const { count, names } = await setCookies(appId, cookies)
    // Warn if the real login cookie for this app wasn't part of the import.
    const expected = AUTH_COOKIE[appId]
    const missingAuth = expected ? !names.includes(expected) : false
    return { success: true, count, missingAuth, expected }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// One-time cookie seeder: if <userData>/seed-cookies.json exists, load it into the
// matching partitions via Electron's cookie API, then delete it. Format:
//   [ { "appId": "claude", "cookies": [ { name, value, domain, path, secure, httpOnly, ... } ] } ]
async function seedCookiesFromFile(): Promise<void> {
  const fs = await import('fs')
  const seedPath = join(app.getPath('userData'), 'seed-cookies.json')
  if (!fs.existsSync(seedPath)) return
  try {
    const entries = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
    for (const entry of entries) {
      if (!entry?.appId || !Array.isArray(entry.cookies)) continue
      const { count } = await setCookies(entry.appId, entry.cookies)
      console.log(`[seed] ${entry.appId}: loaded ${count} cookies`)
    }
  } catch (err: any) {
    console.error('[seed] failed:', err.message)
  } finally {
    try {
      fs.unlinkSync(seedPath)
    } catch {
      /* ignore */
    }
  }
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.workdeck')
  // Present as real Chrome to every web view (removes the "Electron" token).
  app.userAgentFallback = CHROME_UA
  // Seed any pending cookies before the window (and its webviews) load.
  await seedCookiesFromFile()
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
