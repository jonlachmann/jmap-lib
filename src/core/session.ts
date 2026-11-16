import { JMAP_CORE_CAPABILITY } from "./capabilities";
import { JmapHttpError } from "./client";
type FetchLike = typeof fetch;

export interface JmapSessionAccount {
  name?: string;
  isPersonal?: boolean;
  isReadOnly?: boolean;
  accountCapabilities?: Record<string, unknown>;
}

/** RFC 8620 2. */
export interface JmapCoreCapability {
  maxSizeUpload: number;
  maxConcurrentUpload: number;
  maxSizeRequest: number;
  maxConcurrentRequests: number;
  maxCallsInRequest: number;
  maxObjectsInGet: number;
  maxObjectsInSet: number;
  collationAlgorithms: string[];
}

export interface JmapSession {
  apiUrl: string;
  downloadUrl?: string;
  uploadUrl?: string;
  eventSourceUrl?: string;
  capabilities: Record<string, unknown> & { [JMAP_CORE_CAPABILITY]: JmapCoreCapability };
  primaryAccounts?: Record<string, string>;
  accounts?: Record<string, JmapSessionAccount>;
  username?: string;
  /** Changes when the session does, as accounts shared with the user come and go (RFC 8620 2); every response names
   *  the current one as its sessionState. */
  state?: string;
}

type DiscoverJmapSessionOptions = {
  baseUrl: string;
  username: string;
  password: string;
  fetch?: FetchLike;
};

export function createBasicAuthorizationHeader(username: string, password: string): string {
  const token = encodeBase64(`${username}:${password}`);
  return `Basic ${token}`;
}

export async function discoverJmapSession(options: DiscoverJmapSessionOptions): Promise<JmapSession> {
  const fetchImpl = options.fetch ?? fetch.bind(globalThis);
  const sessionUrl = new URL("/.well-known/jmap", options.baseUrl).toString();
  const response = await fetchImpl(sessionUrl, {
    method: "GET",
    headers: {
      authorization: createBasicAuthorizationHeader(options.username, options.password),
    },
  });

  const rawBody = await response.text();

  if (!response.ok) {
    // Typed, so a caller can tell a session refused (401) from a server failing; the body names the URL that failed
    throw new JmapHttpError(response.status, `${sessionUrl}: ${rawBody}`);
  }

  let session: unknown;
  try {
    session = JSON.parse(rawBody);
  } catch {
    throw new Error(`Invalid JSON in JMAP session response from ${sessionUrl}`);
  }

  if (!isJmapSession(session)) {
    throw new Error(`Invalid JMAP session response from ${sessionUrl}`);
  }

  return session;
}

export function resolvePrimaryAccountId(
  session: JmapSession,
  capability = "urn:ietf:params:jmap:mail",
): string | undefined {
  const primaryAccountId = session.primaryAccounts?.[capability];
  if (primaryAccountId) {
    return primaryAccountId;
  }

  const accountIds = Object.keys(session.accounts ?? {});
  return accountIds[0];
}

function isJmapSession(value: unknown): value is JmapSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<JmapSession>;
  return typeof candidate.apiUrl === "string" && isRecord(candidate.capabilities);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function encodeBase64(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }

  if (typeof btoa === "function") {
    return btoa(value);
  }

  throw new Error("No base64 encoder is available in this runtime");
}
