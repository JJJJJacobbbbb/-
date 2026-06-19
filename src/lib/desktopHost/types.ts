export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface DialogOpenOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
  multiSelections?: boolean
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

export interface DialogSaveOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export type DesktopHostCapability =
  | 'screenshot'
  | 'dialogs'
  | 'window'
  | 'clipboard'
  | 'shell'
  | 'file'

export interface DesktopHost {
  kind: 'browser' | 'electron'
  isDesktop: boolean
  capabilities: Record<DesktopHostCapability, boolean>

  // Direct IPC invoke for Electron-specific calls
  invoke(channel: string, ...args: unknown[]): Promise<unknown>

  dialogs: {
    open(options?: DialogOpenOptions): Promise<string[]>
    save(options?: DialogSaveOptions): Promise<string>
  }

  window: {
    minimize(): Promise<void>
    toggleMaximize(): Promise<void>
    close(): Promise<void>
    isMaximized(): Promise<boolean>
  }

  screenshot: {
    captureRegion(bounds: ScreenBounds): Promise<string>
    startRegionSelect(): Promise<ScreenBounds>
  }

  clipboard: {
    readText(): Promise<string>
    writeText(text: string): Promise<void>
  }

  events: {
    listen<T>(eventName: string, handler: (payload: T) => void): Promise<() => void>
  }

  shell: {
    openExternal(url: string): Promise<void>
    openPath(path: string): Promise<void>
  }

  file: {
    read(filePath: string): Promise<ArrayBuffer>
    readText(filePath: string): Promise<string>
    write(filePath: string, data: ArrayBuffer | string): Promise<void>
    list(dirPath: string): Promise<string[]>
  }
}
