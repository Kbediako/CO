declare module 'chalk' {
  const chalk: any;
  export default chalk;
}

declare module 'commander' {
  export class Command {
    constructor();
    requiredOption(...args: any[]): Command;
    option(...args: any[]): Command;
    parse(argv?: string[]): Command;
    opts<T>(): T;
  }
}

declare module 'csstree' {
  const csstree: any;
  export = csstree;
}

declare module 'fs-extra' {
  const fs: any;
  export = fs;
}

declare module 'pixelmatch' {
  const pixelmatch: any;
  export default pixelmatch;
}

declare module 'playwright' {
  export const chromium: any;
  export type Response = any;
}

declare module 'pngjs' {
  export const PNG: any;
}

declare module 'tinycolor2' {
  const tinycolor: any;
  export default tinycolor;
}
