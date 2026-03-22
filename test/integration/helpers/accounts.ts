import { AccountId, resolvePrimaryAccountId, type JmapSession } from "jmap-lib";
import type { IntegrationUserConfig } from "./config.js";

export function resolveIntegrationAccountId(
  config: IntegrationUserConfig,
  session: JmapSession,
): AccountId {
  const configuredAccountId = config.accountId?.trim();
  if (configuredAccountId) {
    return AccountId.of(configuredAccountId);
  }

  const discoveredAccountId = resolvePrimaryAccountId(session);
  if (discoveredAccountId) {
    return AccountId.of(discoveredAccountId);
  }

  throw new Error(
    `Could not resolve an account id for ${config.label}; set JMAP_ACCOUNT_ID or ensure the session exposes primaryAccounts/accounts`,
  );
}
