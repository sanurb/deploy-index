const CHANNEL_NAME = "yaml-editor-autosave"
const MESSAGE_TYPES = {
  FOCUS: "focus",
  BLUR: "blur",
} as const

type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES]

interface FocusMessage {
  type: typeof MESSAGE_TYPES.FOCUS
  tabId: string
}

interface BlurMessage {
  type: typeof MESSAGE_TYPES.BLUR
  tabId: string
}

type Message = FocusMessage | BlurMessage

class MultiTabCoordinator {
  private channel: BroadcastChannel | null = null
  private tabId: string
  private isForeground = true
  private listeners = new Set<(isForeground: boolean) => void>()

  constructor() {
    if (typeof window === "undefined") {
      this.tabId = ""
      return
    }

    this.tabId = `${Date.now()}-${Math.random()}`
    this.setupChannel()
    this.setupFocusHandlers()
  }

  private setupChannel(): void {
    if (typeof BroadcastChannel === "undefined") {
      return
    }

    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.addEventListener("message", (event) => {
      this.handleMessage(event.data)
    })
  }

  private handleMessage(message: Message): void {
    if (message.type === MESSAGE_TYPES.FOCUS) {
      if (message.tabId !== this.tabId) {
        this.isForeground = false
        this.notifyListeners()
      }
    } else if (message.type === MESSAGE_TYPES.BLUR) {
      if (message.tabId === this.tabId) {
        this.isForeground = true
        this.notifyListeners()
      }
    }
  }

  private setupFocusHandlers(): void {
    if (typeof window === "undefined") {
      return
    }

    window.addEventListener("focus", () => {
      this.broadcastFocus()
    })

    window.addEventListener("blur", () => {
      this.broadcastBlur()
    })

    if (document.hasFocus()) {
      this.broadcastFocus()
    }
  }

  private broadcastFocus(): void {
    if (this.channel) {
      this.channel.postMessage({
        type: MESSAGE_TYPES.FOCUS,
        tabId: this.tabId,
      } satisfies FocusMessage)
    }
    this.isForeground = true
    this.notifyListeners()
  }

  private broadcastBlur(): void {
    if (this.channel) {
      this.channel.postMessage({
        type: MESSAGE_TYPES.BLUR,
        tabId: this.tabId,
      } satisfies BlurMessage)
    }
  }

  getIsForeground(): boolean {
    return this.isForeground
  }

  onForegroundChange(callback: (isForeground: boolean) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.isForeground)
    }
  }

  destroy(): void {
    this.channel?.close()
    this.listeners.clear()
  }
}

export const multiTabCoordinator = typeof window !== "undefined" ? new MultiTabCoordinator() : null

