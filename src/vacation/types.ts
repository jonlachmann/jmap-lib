import type { JmapGetArgs } from "../core/get";
import type { JmapSetArgs } from "../core/set";

export interface VacationResponse {
  id: string;
  isEnabled: boolean;
  fromDate: string | null;
  toDate: string | null;
  subject: string;
  textBody: string;
  htmlBody: string | null;
}

export type VacationResponseProperty =
  | "id"
  | "isEnabled"
  | "fromDate"
  | "toDate"
  | "subject"
  | "textBody"
  | "htmlBody";

export interface VacationResponseGetRequest extends JmapGetArgs<VacationResponseProperty> {}

export interface VacationResponseGetResponse {
  accountId: string;
  state?: string;
  list: VacationResponse[];
}

export interface VacationResponseSetRequest extends JmapSetArgs<never, Partial<VacationResponse>> {
  update: Record<string, Partial<VacationResponse>>;
}
