import { PersistenceUnavailable } from "./errors";
import type { Store } from "./store/types";
import { previewStore } from "./store/preview";
import { getPostgresStore } from "./store/postgres";

export { PersistenceUnavailable };

export type Runtime =
  | { mode: "preview"; store: Store }
  | { mode: "postgres"; store: Store }
  | { mode: "fail-closed" };

let testStore: Store | null = null;

export function setStoreForTests(store: Store | null): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("setStoreForTests is test-only");
  }
  testStore = store;
}

export function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
}

export function getRuntime(): Runtime {
  if (testStore) return { mode: "postgres", store: testStore };
  if (process.env.DATABASE_URL && process.env.NODE_ENV !== "test") {
    return { mode: "postgres", store: getPostgresStore() };
  }
  if (isProductionRuntime()) return { mode: "fail-closed" };
  return { mode: "preview", store: previewStore };
}

export function notPersisted(message = "Not saved. Nothing was stored and no email was sent."): {
  status: number;
  body: Record<string, unknown>;
} {
  return { status: 503, body: { ok: false, persisted: false, error: "persistence_unavailable", message } };
}
