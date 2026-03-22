import { CORE_MAIL_VACATION_CAPABILITIES } from "../core/capabilities";
import { JmapClient } from "../core/client";
import { getSetError } from "../core/set";
import { AccountId } from "../core/ids";
import { VacationResponseGet, VacationResponseSet } from "./methods";
import type {
  VacationResponse,
  VacationResponseGetRequest,
  VacationResponseGetResponse,
  VacationResponseSetRequest,
} from "./types";

export class JmapVacation {
  constructor(private readonly client: JmapClient) {}

  async get(accountId: AccountId): Promise<VacationResponse | undefined> {
    const response = await this.client.invoke<VacationResponseGetRequest, VacationResponseGetResponse>(VacationResponseGet.singleton(accountId), {
      capabilities: CORE_MAIL_VACATION_CAPABILITIES,
    });
    return response.list[0];
  }

  async update(accountId: AccountId, updates: Partial<VacationResponse>): Promise<void> {
    const response = await this.client.invoke<VacationResponseSetRequest, import("../core/set").JmapSetResponse>(
      new VacationResponseSet({
        accountId: accountId.value,
        update: { singleton: updates },
      }),
      { capabilities: CORE_MAIL_VACATION_CAPABILITIES },
    );

    const error = getSetError(response, "notUpdated", "singleton");
    if (error) {
      throw new Error(error.description || "Failed to update vacation response");
    }
  }
}
