import { DesktopHost } from './types'
import { desktopHost as electronHost } from './electronHost'
import { desktopHost as browserHost } from './browserHost'

let host: DesktopHost | null = null

export function getDesktopHost(): DesktopHost {
  if (host) {
    return host
  }

  if (window.desktopHost) {
    host = electronHost
  } else {
    host = browserHost
  }

  return host
}

export type { DesktopHost, ScreenBounds, DialogOpenOptions, DialogSaveOptions } from './types'
