declare module 'minimatch' {
  export type IOptions = Record<string, unknown>;
  export function minimatch(target: string, pattern: string, options?: IOptions): boolean;
}

