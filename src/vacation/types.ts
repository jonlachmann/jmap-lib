export interface VacationResponse {
  id: string;
  isEnabled: boolean;
  fromDate: string | null;
  toDate: string | null;
  subject: string;
  textBody: string;
  htmlBody: string | null;
}

export interface VacationResponseGetRequest {
  accountId: string;
  ids?: readonly string[];
}

export interface VacationResponseGetResponse {
  accountId: string;
  state?: string;
  list: VacationResponse[];
}

export interface VacationResponseSetRequest {
  accountId: string;
  update: Record<string, Partial<VacationResponse>>;
}
