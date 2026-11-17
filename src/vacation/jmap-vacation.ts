import { CORE_MAIL_VACATION_CAPABILITIES } from "../core/capabilities.js";
import { JmapClient } from "../core/client.js";
import { assertSetOk, type JmapSetResponse } from "../core/set.js";
import { AccountId } from "../core/ids.js";
import { VacationResponseGet, VacationResponseSet } from "./methods.js";
import type {
  VacationResponse,
  VacationResponseGetRequest,
  VacationResponseGetResponse,
  VacationResponseSetRequest,
  VacationResponseUpdate,
} from "./types.js";

export class JmapVacation {
  constructor(private readonly client: JmapClient) {}

  async get(accountId: AccountId): Promise<VacationResponse | undefined> {
    const response = await this.client.invoke<VacationResponseGetRequest, VacationResponseGetResponse>(VacationResponseGet.singleton(accountId), {
      capabilities: CORE_MAIL_VACATION_CAPABILITIES,
    });
    return response.list[0];
  }

  async update(accountId: AccountId, updates: VacationResponseUpdate): Promise<JmapSetResponse> {
    const response = await this.client.invoke<VacationResponseSetRequest, JmapSetResponse>(
      new VacationResponseSet({
        accountId: accountId.value,
        update: { singleton: updates },
      }),
      { capabilities: CORE_MAIL_VACATION_CAPABILITIES },
    );

    assertSetOk(response, "vacation response");

    return response;
  }
}
