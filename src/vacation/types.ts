import type { JmapGetResponse } from "../core/get.js";
import type { JmapGetArgs } from "../core/get.js";
import type { JmapPatchObject } from "../core/patch.js";
import type { JmapSetArgs } from "../core/set.js";

export interface VacationResponse {
  id: string;
  isEnabled: boolean;
  fromDate: string | null;
  toDate: string | null;
  subject: string | null;
  textBody: string | null;
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

export type VacationResponseGetResponse = JmapGetResponse<VacationResponse>;

export type VacationResponseMutable = {
  isEnabled?: boolean;
  fromDate?: string | null;
  toDate?: string | null;
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
};

export type VacationResponseUpdate = JmapPatchObject<VacationResponseMutable>;

export interface VacationResponseSetRequest extends JmapSetArgs<never, VacationResponseUpdate> {
  update: Record<string, VacationResponseUpdate>;
}
