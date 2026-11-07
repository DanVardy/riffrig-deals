declare module "@/lib/production-gate.mjs" {
  export function productionBlocked(env?: NodeJS.ProcessEnv): boolean;
  export function blockedBody(pathname: string): { ok: false; ready?: false; persisted?: false; error?: string } | null;
  export const blockedHtml: string;
}
