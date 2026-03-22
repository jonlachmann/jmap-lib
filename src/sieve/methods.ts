import type { JmapMethod } from "../core/method";
import { AccountId } from "../core/ids";
import type {
  SieveScriptGetRequest,
  SieveScriptGetResponse,
  SieveScriptSetRequest,
  SieveScriptValidateRequest,
  SieveScriptValidateResponse,
} from "./types";

export class SieveScriptGet implements JmapMethod<SieveScriptGetRequest, SieveScriptGetResponse> {
  readonly methodName = "SieveScript/get";
  readonly arguments: SieveScriptGetRequest;

  constructor(args: SieveScriptGetRequest) {
    this.arguments = args;
  }

  static all(accountId: AccountId): SieveScriptGet {
    return new SieveScriptGet({ accountId: accountId.value });
  }
}

export class SieveScriptSet
  implements JmapMethod<SieveScriptSetRequest, import("../core/set").JmapSetResponse>
{
  readonly methodName = "SieveScript/set";
  readonly arguments: SieveScriptSetRequest;

  constructor(args: SieveScriptSetRequest) {
    this.arguments = args;
  }
}

export class SieveScriptValidate
  implements JmapMethod<SieveScriptValidateRequest, SieveScriptValidateResponse>
{
  readonly methodName = "SieveScript/validate";
  readonly arguments: SieveScriptValidateRequest;

  constructor(args: SieveScriptValidateRequest) {
    this.arguments = args;
  }
}
