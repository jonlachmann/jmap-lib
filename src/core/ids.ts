export class AccountId {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static of(value: string): AccountId {
    return new AccountId(value);
  }
}

export class CallId {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static of(value: string): CallId {
    return new CallId(value);
  }
}
