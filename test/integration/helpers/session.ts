import {
  createBasicAuthorizationHeader,
  discoverJmapSession,
  type JmapSession,
} from "jmap-lib";
import type { IntegrationUserConfig } from "./config.js";

export interface DiscoveredIntegrationSession {
  session: JmapSession;
  apiUrl: string;
  capabilities: string[];
  authorizationHeader: string;
}

export async function discoverIntegrationSession(
  config: IntegrationUserConfig,
): Promise<DiscoveredIntegrationSession> {
  const session = await discoverJmapSession({
    baseUrl: config.baseUrl,
    authorization: createBasicAuthorizationHeader(config.username, config.password),
  });

  const capabilities = Object.keys(session.capabilities);
  if (capabilities.length === 0) {
    throw new Error(`JMAP session at ${config.baseUrl} did not expose any capabilities`);
  }

  return {
    session,
    apiUrl: session.apiUrl,
    capabilities,
    authorizationHeader: createBasicAuthorizationHeader(config.username, config.password),
  };
}
