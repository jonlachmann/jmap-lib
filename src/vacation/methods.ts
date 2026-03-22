import type { JmapMethod } from "../core/method";
import { AccountId } from "../core/ids";
import type {
  VacationResponseGetRequest,
  VacationResponseGetResponse,
  VacationResponseSetRequest,
} from "./types";

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
  implements JmapMethod<VacationResponseSetRequest, import("../core/set").JmapSetResponse>
{
  readonly methodName = "VacationResponse/set";
  readonly arguments: VacationResponseSetRequest;

  constructor(args: VacationResponseSetRequest) {
    this.arguments = args;
  }
}
