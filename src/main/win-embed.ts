// Win32 window-embedding via koffi FFI: reparent another app's top-level window
// into WorkDeck (SetParent) so a native desktop app shows inside a WorkDeck tab.
// This is inherently hacky and a Chromium-in-Chromium embed will lag — that is a
// known, accepted trade-off for showing the real app inside the WorkDeck window.
//
// koffi returns uintptr_t/intptr_t as plain JS numbers here (HWND + window-style
// values fit safely), so this module uses `number` throughout. Window styles are
// 32-bit DWORDs, so standard JS 32-bit bitwise ops are correct.
import koffi from 'koffi'

const user32 = koffi.load('user32.dll')
const kernel32 = koffi.load('kernel32.dll')

const EnumWindowsProc = koffi.proto('bool EnumWindowsProc(uintptr_t hwnd, intptr_t lparam)')
const EnumWindows = user32.func('bool EnumWindows(void* proc, intptr_t lparam)')
const GetWindowThreadProcessId = user32.func('uint32 GetWindowThreadProcessId(uintptr_t hwnd, _Out_ void* pid)')
const GetWindowTextW = user32.func('int GetWindowTextW(uintptr_t hwnd, _Out_ void* str, int max)')
const IsWindowVisible = user32.func('bool IsWindowVisible(uintptr_t hwnd)')
const IsWindow = user32.func('bool IsWindow(uintptr_t hwnd)')
const GetWindow = user32.func('uintptr_t GetWindow(uintptr_t hwnd, uint32 cmd)')
const SetParent = user32.func('uintptr_t SetParent(uintptr_t child, uintptr_t parent)')
const GetParent = user32.func('uintptr_t GetParent(uintptr_t hwnd)')
const GetWindowLongPtr = user32.func('intptr_t GetWindowLongPtrW(uintptr_t hwnd, int index)')
const SetWindowLongPtr = user32.func('intptr_t SetWindowLongPtrW(uintptr_t hwnd, int index, intptr_t value)')
const SetWindowPos = user32.func('bool SetWindowPos(uintptr_t hwnd, uintptr_t after, int x, int y, int cx, int cy, uint32 flags)')
const ShowWindow = user32.func('bool ShowWindow(uintptr_t hwnd, int cmd)')
const PostMessageW = user32.func('bool PostMessageW(uintptr_t hwnd, uint32 msg, uintptr_t wParam, intptr_t lParam)')
const AttachThreadInput = user32.func('bool AttachThreadInput(uint32 idAttach, uint32 idAttachTo, bool fAttach)')
const SetFocus = user32.func('uintptr_t SetFocus(uintptr_t hwnd)')
const BringWindowToTop = user32.func('bool BringWindowToTop(uintptr_t hwnd)')

const OpenProcess = kernel32.func('uintptr_t OpenProcess(uint32 access, bool inherit, uint32 pid)')
const QueryFullProcessImageNameW = kernel32.func('bool QueryFullProcessImageNameW(uintptr_t h, uint32 flags, _Out_ void* buf, _Inout_ void* size)')
const CloseHandle = kernel32.func('bool CloseHandle(uintptr_t h)')

const GWL_STYLE = -16
const WS_CHILD = 0x40000000
const WS_VISIBLE = 0x10000000
const WS_POPUP = 0x80000000
const WS_CAPTION = 0x00c00000
const WS_THICKFRAME = 0x00040000
const WS_MINIMIZEBOX = 0x00020000
const WS_MAXIMIZEBOX = 0x00010000
const WS_SYSMENU = 0x00080000
const WS_OVERLAPPEDWINDOW = 0x00cf0000
const GW_OWNER = 4
const SWP_NOZORDER = 0x0004
const SWP_NOACTIVATE = 0x0010
const SWP_FRAMECHANGED = 0x0020
const SWP_SHOWWINDOW = 0x0040
const SW_HIDE = 0
const SW_SHOW = 5
const WM_CLOSE = 0x0010
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

function getTitle(hwnd: number): string {
  const buf = Buffer.alloc(512)
  const len = GetWindowTextW(hwnd, buf, 256)
  return len > 0 ? buf.toString('ucs2', 0, len * 2) : ''
}
function getPid(hwnd: number): number {
  const buf = Buffer.alloc(4)
  GetWindowThreadProcessId(hwnd, buf)
  return buf.readUInt32LE(0)
}
function threadOf(hwnd: number): number {
  const buf = Buffer.alloc(4)
  return GetWindowThreadProcessId(hwnd, buf)
}
function getExe(pid: number): string {
  const h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
  if (!h) return ''
  try {
    const buf = Buffer.alloc(1024)
    const size = Buffer.alloc(4)
    size.writeUInt32LE(512, 0)
    if (!QueryFullProcessImageNameW(h, 0, buf, size)) return ''
    return (buf.toString('ucs2', 0, size.readUInt32LE(0) * 2).split('\\').pop() || '').toLowerCase()
  } catch {
    return ''
  } finally {
    CloseHandle(h)
  }
}

export interface WinInfo {
  hwnd: number
  title: string
  pid: number
}

export function isWindow(hwnd: number): boolean {
  try {
    return !!IsWindow(hwnd)
  } catch {
    return false
  }
}

// Visible, top-level (owner-less) windows owned by the given executable basename.
// Matching by process (not title) avoids grabbing a browser tab titled "Claude".
export function findWindowsByExe(exeName: string): WinInfo[] {
  const out: WinInfo[] = []
  const target = exeName.toLowerCase()
  const cb = koffi.register((hwnd: number) => {
    try {
      if (!IsWindowVisible(hwnd)) return true
      if (GetWindow(hwnd, GW_OWNER) !== 0) return true
      const pid = getPid(hwnd)
      if (getExe(pid) === target) out.push({ hwnd, title: getTitle(hwnd), pid })
    } catch {
      /* ignore individual window */
    }
    return true
  }, koffi.pointer(EnumWindowsProc))
  try {
    EnumWindows(cb, 0)
  } finally {
    koffi.unregister(cb)
  }
  return out.sort((a, b) => (b.title ? 1 : 0) - (a.title ? 1 : 0))
}

function attachInput(child: number, parent: number, attach: boolean): void {
  try {
    const ct = threadOf(child)
    const pt = threadOf(parent)
    if (ct && pt && ct !== pt) AttachThreadInput(ct, pt, attach)
  } catch {
    /* best effort */
  }
}

export function focus(child: number): void {
  if (!isWindow(child)) return
  try {
    BringWindowToTop(child)
    SetFocus(child)
  } catch {
    /* window may be gone */
  }
}

// Reparent `child` into `parent` as a borderless child at the given physical-pixel
// rect (relative to the parent's client area).
export function embed(child: number, parent: number, x: number, y: number, w: number, h: number): void {
  let style = GetWindowLongPtr(child, GWL_STYLE) & 0xffffffff
  style =
    (style & ~(WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)) |
    WS_CHILD |
    WS_VISIBLE
  SetWindowLongPtr(child, GWL_STYLE, style >>> 0)
  SetParent(child, parent)
  SetWindowPos(child, 0, Math.round(x), Math.round(y), Math.round(w), Math.round(h), SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW)
  attachInput(child, parent, true)
  focus(child)
}

export function setBounds(child: number, x: number, y: number, w: number, h: number): void {
  if (!isWindow(child)) return
  SetWindowPos(child, 0, Math.round(x), Math.round(y), Math.round(w), Math.round(h), SWP_NOZORDER | SWP_NOACTIVATE)
}

export function setVisible(child: number, visible: boolean): void {
  if (!isWindow(child)) return
  ShowWindow(child, visible ? SW_SHOW : SW_HIDE)
  if (visible) focus(child)
}

// Detach from parent and close (tab closed).
export function detach(child: number): void {
  try {
    const parent = GetParent(child)
    if (parent) attachInput(child, parent, false)
    SetParent(child, 0)
    PostMessageW(child, WM_CLOSE, 0, 0)
  } catch {
    /* gone */
  }
}

// Detach and restore as a normal standalone window WITHOUT closing (on WorkDeck quit).
export function release(child: number): void {
  try {
    const parent = GetParent(child)
    if (parent) attachInput(child, parent, false)
    SetParent(child, 0)
    SetWindowLongPtr(child, GWL_STYLE, (WS_OVERLAPPEDWINDOW | WS_VISIBLE) >>> 0)
    SetWindowPos(child, 0, 100, 100, 1100, 800, SWP_NOZORDER | SWP_FRAMECHANGED | SWP_SHOWWINDOW)
  } catch {
    /* gone */
  }
}
