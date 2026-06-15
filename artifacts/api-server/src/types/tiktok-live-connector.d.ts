declare module "tiktok-live-connector" {
  export interface ChatData {
    uniqueId: string;
    nickname: string;
    comment: string;
    userId?: string;
  }

  export interface ConnectState {
    isConnected: boolean;
    upgradedToWebsocket: boolean;
  }

  export interface WebcastPushConnectionOptions {
    processInitialData?: boolean;
    enableExtendedGiftInfo?: boolean;
    enableWebsocketUpgrade?: boolean;
    requestPollingIntervalMs?: number;
    sessionId?: string;
    clientParams?: Record<string, unknown>;
    requestHeaders?: Record<string, string>;
  }

  export class WebcastPushConnection {
    constructor(uniqueId: string, options?: WebcastPushConnectionOptions);
    connect(): Promise<ConnectState>;
    disconnect(): void;
    on(event: "chat", listener: (data: ChatData) => void): this;
    on(event: "connect", listener: (state: ConnectState) => void): this;
    on(event: "disconnect", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }
}
