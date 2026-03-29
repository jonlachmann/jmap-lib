import { JmapMail, type JmapMailbox } from "jmap-lib";
import { loadSingleUserIntegrationConfig } from "./config.js";
import { createIntegrationClientContext, type IntegrationClientContext } from "./client.js";
import { fetchMailboxes, findMailboxByRole } from "./mailboxes.js";

export interface MailIntegrationContext {
  context: IntegrationClientContext;
  mail: JmapMail;
  mailboxes: JmapMailbox[];
}

export async function createMailIntegrationContext(): Promise<MailIntegrationContext> {
  const context = await createIntegrationClientContext(loadSingleUserIntegrationConfig());
  const mail = new JmapMail(context.client);
  const mailboxes = (await fetchMailboxes(context.client, context.accountId)).list;

  return {
    context,
    mail,
    mailboxes,
  };
}

export function requireMailboxByRole(mailboxes: JmapMailbox[], role: string): JmapMailbox {
  const mailbox = findMailboxByRole(mailboxes, role);
  if (!mailbox) {
    throw new Error(`expected a ${role} mailbox`);
  }
  return mailbox;
}
