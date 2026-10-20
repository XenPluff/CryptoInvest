export type CardNetwork = "VISA" | "MASTERCARD";
export type CardFormat = "PHYSICAL" | "VIRTUAL";
export type CardStatus = "SUBMITTED" | "UNDER_REVIEW" | "WAITLISTED" | "DECLINED" | "WITHDRAWN";
export const CARD_CONSENT_VERSION = "card-prelaunch-v1";
export const cardStatusLabels: Record<CardStatus, string> = {
  SUBMITTED: "Application submitted",
  UNDER_REVIEW: "Under preliminary review",
  WAITLISTED: "On the pre-launch list",
  DECLINED: "Application declined",
  WITHDRAWN: "Application withdrawn",
};
export const cardStatusDescriptions: Record<CardStatus, string> = {
  SUBMITTED: "Your preferences have been recorded. No card or credit facility has been issued.",
  UNDER_REVIEW: "AUREON is reviewing your pre-launch application. This is not a credit or issuer decision.",
  WAITLISTED: "Your preliminary review is complete and you are on the pre-launch list. This does not guarantee launch, eligibility or approval.",
  DECLINED: "This pre-launch application was declined. Read the review message before deciding whether to submit an updated application.",
  WITHDRAWN: "Your application is closed at your request. Its record and audit history are retained; contact support about data rights.",
};
export type CardApplication = {
  id: string;
  network: CardNetwork;
  format: CardFormat;
  country: string;
  intendedUse: "PERSONAL" | "BUSINESS" | "BOTH";
  status: CardStatus;
  version: number;
  consentVersion: string;
  consentedAt: string;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewMessage: string | null;
  events?: { id: string; status: CardStatus; message: string; createdAt: string }[];
  user?: { id: string; name: string; email: string; emailVerifiedAt: string | null; suspended: boolean; kyc: { status: string } | null };
};

export const CARD_PROGRAM = {
  phase: "PRELAUNCH" as const,
  issuingEnabled: false,
  paymentsEnabled: false,
  issuerName: null,
  supportedCountries: [] as string[],
  consentVersion: CARD_CONSENT_VERSION,
  message: "Pre-launch applications only. No issuing bank or live card program is configured. Network choice is a preference, not a confirmed partnership. Cards cannot currently be issued, activated or used for payments.",
};
