export class LeadmailDisabledError extends Error {
  constructor() {
    super("leadmail_disabled");
    this.name = "LeadmailDisabledError";
  }
}

export class LeadmailRequestError extends Error {
  constructor() {
    super("leadmail_request_failed");
    this.name = "LeadmailRequestError";
  }
}

export type LeadmailConfig = {
  apiBase: string | null;
  apiKey: string | null;
  listId: string | null;
  sendingVerified: boolean;
};

export function readLeadmailConfig(env: NodeJS.ProcessEnv = process.env): LeadmailConfig {
  const apiBase = env.LEADMAIL_API_BASE?.trim() || null;
  const apiKey = env.LEADMAIL_API_KEY?.trim() || null;
  const listId = env.LEADMAIL_LIST_ID?.trim() || null;
  return {
    apiBase,
    apiKey,
    listId,
    sendingVerified: env.LEADMAIL_SENDING_VERIFIED === "true",
  };
}

export function leadmailIsEnabled(config: LeadmailConfig): boolean {
  if (!config.sendingVerified || !config.apiBase || !config.apiKey || !config.listId) return false;
  try {
    const url = new URL(config.apiBase);
    if (url.protocol !== "https:") return false;
    if (!url.hostname || !url.hostname.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Server adapter for the Leadmail endpoints described at https://app.leadmail.ai/docs.
 * The published examples use a broken host (`https:///api`), and the add-contact
 * section shows a POST example without a method line. Nothing here is called
 * unless LEADMAIL_SENDING_VERIFIED=true and a real https base is configured.
 * Broadcast send, scheduling, suppression enforcement, one-click headers,
 * bounces, and rate limits are not implemented.
 */
export class LeadmailClient {
  constructor(
    private readonly config: LeadmailConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  isEnabled(): boolean {
    return leadmailIsEnabled(this.config);
  }

  createContact(email: string): Promise<void> {
    return this.post("/api/contacts/create", { email });
  }

  addToList(email: string): Promise<void> {
    return this.post("/api/lists/add-contact", { email, listId: this.config.listId as string });
  }

  removeFromList(email: string): Promise<void> {
    return this.post("/api/lists/remove-contact", { email, listId: this.config.listId as string });
  }

  removeFromAll(email: string): Promise<void> {
    return this.post("/api/lists/remove-contact-all", { email });
  }

  unsubscribe(email: string): Promise<void> {
    return this.post("/api/contacts/unsubscribe", { email });
  }

  private async post(path: string, body: Record<string, string>): Promise<void> {
    if (!this.isEnabled()) throw new LeadmailDisabledError();
    const root = (this.config.apiBase as string).replace(/\/$/, "");
    let response: Response;
    try {
      response = await this.fetchImpl(`${root}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.config.apiKey as string,
        },
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      if (error instanceof LeadmailDisabledError) throw error;
      throw new LeadmailRequestError();
    }
    if (!response.ok) throw new LeadmailRequestError();
  }
}
