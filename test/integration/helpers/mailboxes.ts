import { MailboxGet, type JmapMailbox, type MailboxGetResponse, JmapClient, AccountId } from "jmap-lib";

export async function fetchMailboxes(
  client: JmapClient,
  accountId: AccountId,
): Promise<MailboxGetResponse> {
  return client.invoke(MailboxGet.all(accountId)) as Promise<MailboxGetResponse>;
}

export function findInboxMailbox(mailboxes: JmapMailbox[]): JmapMailbox | undefined {
  return mailboxes.find((mailbox) => mailbox.role === "inbox")
    ?? mailboxes.find((mailbox) => mailbox.name.toLowerCase() === "inbox");
}
