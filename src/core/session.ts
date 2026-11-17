import { JMAP_CORE_CAPABILITY } from "./capabilities.js";
import { JmapHttpError, resolveAuthorization, type JmapAuthorization } from "./client.js";
type FetchLike = typeof fetch;

/** RFC 8620 2. */
export interface JmapSessionAccount {
  name: string;
  isPersonal: boolean;
  isReadOnly: boolean;
  accountCapabilities: Record<string, unknown>;
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

/** RFC 8620 2. */
export interface JmapSession {
  capabilities: Record<string, unknown> & { [JMAP_CORE_CAPABILITY]: JmapCoreCapability };
  accounts: Record<string, JmapSessionAccount>;
  primaryAccounts: Record<string, string>;
  username: string;
  apiUrl: string;
  /** A URI template (RFC 6570) with accountId, blobId, type and name. */
  downloadUrl: string;
  /** A URI template with accountId. */
  uploadUrl: string;
  /** A URI template with types, closeafter and ping. */
  eventSourceUrl: string;
  /** Changes when the session does, as accounts shared with the user come and go; every response names the current
   *  one as its sessionState. */
  state: string;
}

type DiscoverJmapSessionOptions = {
  baseUrl: string;
  authorization: JmapAuthorization;
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
      authorization: await resolveAuthorization(options.authorization),
    },
  });

  const rawBody = await response.text();

  if (!response.ok) {
    // Typed, so a caller can tell a session refused (401) from a server failing
    throw new JmapHttpError(response.status, rawBody, sessionUrl);
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

/** The account to use for the capability: its primary one, or else the only account that has it; none when there is
 *  no single answer. */
export function resolvePrimaryAccountId(
  session: JmapSession,
  capability = "urn:ietf:params:jmap:mail",
): string | undefined {
  const primaryAccountId = session.primaryAccounts[capability];
  if (primaryAccountId) {
    return primaryAccountId;
  }

  const withCapability = Object.keys(session.accounts).filter((id) => capability in session.accounts[id].accountCapabilities);
  return withCapability.length === 1 ? withCapability[0] : undefined;
}

/** Fill a URI template's variables (RFC 6570 level 1, as the session's URLs are written), each percent-encoded. */
export function expandUriTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)}/g, (match, name: string) =>
    name in variables ? encodeURIComponent(variables[name]) : match);
}

function isJmapSession(value: unknown): value is JmapSession {
  if (!isRecord(value)) {
    return false;
  }

  const strings = ["apiUrl", "downloadUrl", "uploadUrl", "eventSourceUrl", "username", "state"] as const;
  return strings.every((field) => typeof value[field] === "string")
    && isRecord(value.capabilities)
    && isRecord(value.capabilities[JMAP_CORE_CAPABILITY])
    && isRecord(value.primaryAccounts)
    && isRecord(value.accounts)
    && Object.values(value.accounts).every((account) => isRecord(account) && isRecord(account.accountCapabilities));
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
