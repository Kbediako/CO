declare module 'playwright' {
  export interface Request {
    url(): string;
  }

  export interface Route {
    request(): Request;
    abort(): Promise<void>;
    continue(): Promise<void>;
  }

  export interface Page {
    goto(url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'; timeout?: number }): Promise<unknown>;
    addStyleTag(options: { content: string }): Promise<void>;
    content(): Promise<string>;
    screenshot(options?: { path?: string; fullPage?: boolean; type?: 'png' | 'jpeg' }): Promise<Buffer>;
    evaluate<T>(pageFunction: () => T): Promise<T>;
  }

  export interface BrowserContext {
    newPage(): Promise<Page>;
    route(url: string, handler: (route: Route) => Promise<void>): Promise<void>;
    route(url: string, handler: (route: Route) => void): Promise<void>;
    close(): Promise<void>;
  }

  export interface Browser {
    newContext(options?: {
      viewport?: { width: number; height: number };
      deviceScaleFactor?: number;
    }): Promise<BrowserContext>;
    close(): Promise<void>;
  }

  export const chromium: {
    launch(options?: { headless?: boolean }): Promise<Browser>;
  };
}
