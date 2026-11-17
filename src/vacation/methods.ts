import type { JmapMethod } from "../core/method.js";
import type { JmapSetResponse } from "../core/set.js";
import { AccountId } from "../core/ids.js";
import type {
  VacationResponseGetRequest,
  VacationResponseGetResponse,
  VacationResponseSetRequest,
} from "./types.js";

export class VacationResponseGet
  implements JmapMethod<VacationResponseGetRequest, VacationResponseGetResponse>
{
  readonly methodName = "VacationResponse/get";
  readonly arguments: VacationResponseGetRequest;

  constructor(args: VacationResponseGetRequest) {
    this.arguments = args;
  }

  static singleton(accountId: AccountId): VacationResponseGet {
    return new VacationResponseGet({
      accountId: accountId.value,
      ids: ["singleton"],
    });
  }
}

export class VacationResponseSet
  implements JmapMethod<VacationResponseSetRequest, JmapSetResponse>
{
  readonly methodName = "VacationResponse/set";
  readonly arguments: VacationResponseSetRequest;

  constructor(args: VacationResponseSetRequest) {
    this.arguments = args;
  }
}
