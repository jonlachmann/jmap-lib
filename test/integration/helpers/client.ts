import { JmapClient } from "jmap-lib";
import { AccountId, type JmapSession } from "jmap-lib";
import { resolveIntegrationAccountId } from "./accounts.js";
import type { IntegrationUserConfig } from "./config.js";
import { discoverIntegrationSession } from "./session.js";

export interface IntegrationClientContext {
  user: IntegrationUserConfig;
  session: JmapSession;
  client: JmapClient;
  accountId: AccountId;
  authorizationHeader: string;
}

export async function createIntegrationClientContext(
  user: IntegrationUserConfig,
): Promise<IntegrationClientContext> {
  const discovered = await discoverIntegrationSession(user);
  const accountId = resolveIntegrationAccountId(user, discovered.session);
  const client = new JmapClient({
    endpoint: discovered.apiUrl,
    authorizationHeader: discovered.authorizationHeader,
    capabilities: discovered.capabilities,
  });

  return {
    user,
    session: discovered.session,
    client,
    accountId,
    authorizationHeader: discovered.authorizationHeader,
  };
}
