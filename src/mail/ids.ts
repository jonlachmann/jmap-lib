export class MailboxId {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static of(value: string): MailboxId {
    return new MailboxId(value);
  }
}
