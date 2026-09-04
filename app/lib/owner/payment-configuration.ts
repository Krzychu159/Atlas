import { backendGet, backendPost, backendPut } from "../backend";

export type LegalEntity = {
  id: number;
  name: string;
  nip: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  paymentRecipientName: string | null;
  bankAccountNumber: string | null;
  blikPhoneNumber: string | null;
  transferTitleTemplate: string | null;
  paymentDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type LegalEntityPayload = {
  name: string;
  nip: string;
  address: string;
  email: string;
  phone: string;
  paymentRecipientName: string;
  bankAccountNumber: string;
  blikPhoneNumber: string;
  transferTitleTemplate: string;
  paymentDescription: string;
  isActive: boolean;
};

export type PaymentConfiguration = {
  legalEntities: LegalEntity[];
  paymentProviderAccounts: PaymentProviderAccount[];
  locations: PaymentConfigurationLocation[];
};

export type PaymentProviderAccount = {
  id: number;
  legalEntityId: number | null;
  legalEntityName: string | null;
  locationId: number | null;
  locationName: string | null;
  provider: string;
  displayName: string;
  merchantId: string | null;
  posId: string | null;
  accountKey: string | null;
  isActive: boolean;
  webhookSecretConfigured: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type PaymentConfigurationLocation = {
  id: number;
  name: string;
  city: string | null;
  address: string | null;
  isActive: boolean;
  legalEntityId: number | null;
  legalEntityName: string | null;
  paymentRecipientName: string | null;
  bankAccountNumber: string | null;
  blikPhoneNumber: string | null;
  transferTitleTemplate: string | null;
  paymentDescription: string | null;
  fiscalReceiptMode: number;
  fiscalRegisterName: string | null;
  fiscalRegisterNumber: string | null;
  createdAt: string;
};

export function getPaymentConfiguration() {
  return backendGet<PaymentConfiguration>("billing/payment-configuration");
}

export function createLegalEntity(payload: LegalEntityPayload) {
  return backendPost<LegalEntity>(
    "billing/payment-configuration/legal-entities",
    payload,
  );
}

export function updateLegalEntity(id: number, payload: LegalEntityPayload) {
  return backendPut<LegalEntity>(
    `billing/payment-configuration/legal-entities/${id}`,
    payload,
  );
}
