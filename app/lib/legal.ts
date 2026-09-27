import { backendGet, backendPost } from "./backend";

export type LegalRequirements = {
  locationId: number;
  legalEntityId: number;
  legalEntityName: string;
  acceptanceRequired: boolean;
  isAccepted: boolean;
  termsVersion: string | null;
  termsUrl: string | null;
};

export type AcceptLegalTermsPayload = {
  locationId: number;
  acceptTerms: true;
  termsVersion: string;
};

export function getLegalRequirements(locationId: number) {
  return backendGet<LegalRequirements>(
    "public/group-classes/legal-requirements",
    { locationId },
  );
}

export function acceptLegalTerms(payload: AcceptLegalTermsPayload) {
  return backendPost<void>("public/group-classes/legal-consents/me", payload);
}
