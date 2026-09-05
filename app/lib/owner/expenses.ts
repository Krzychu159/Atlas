import {
  backendDelete,
  backendDownload,
  backendFetch,
  backendGet,
  backendPost,
  backendPut,
} from "@/app/lib/backend";

export type CompanyExpense = {
  id: number;
  legalEntityId: number;
  legalEntityName: string;
  locationId: number | null;
  locationName: string | null;
  category: number;
  paymentStatus: number;
  vendorName: string;
  vendorNip: string | null;
  invoiceNumber: string | null;
  issueDate: string;
  saleDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  attachmentUrl: string | null;
  attachmentFileName: string | null;
  attachmentContentType: string | null;
  isRecurring: boolean;
  recurringGroupId: string | null;
  recurrenceIntervalMonths: number | null;
  recurrenceStartDate: string | null;
  recurrenceEndDate: string | null;
  recurrenceDayOfMonth: number | null;
  recurrenceInstanceNumber: number | null;
  createdByUserId: number | null;
  paidByUserId: number | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExpensePayload = {
  legalEntityId: number;
  locationId: number | null;
  category: number;
  paymentStatus: number;
  vendorName: string;
  vendorNip: string | null;
  invoiceNumber: string | null;
  issueDate: string;
  saleDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  description: string | null;
  notes: string | null;
  attachmentUrl: string | null;
  isRecurring: boolean;
  recurringGroupId: string | null;
  recurrenceEndDate: string | null;
  recurringOccurrencesCount: number | null;
  recurrenceEditScope?: number | null;
};

export type ExpenseQuery = {
  legalEntityId?: number | null;
  locationId?: number | null;
  category?: number | null;
  paymentStatus?: number | null;
  from?: string | null;
  to?: string | null;
  dueFrom?: string | null;
  dueTo?: string | null;
  paidFrom?: string | null;
  paidTo?: string | null;
  search?: string | null;
  isRecurring?: boolean | null;
  recurringGroupId?: string | null;
  isOverdue?: boolean | null;
  page?: number | null;
  pageSize?: number | null;
};

export type ExpensePagedResult = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: CompanyExpense[] | null;
};

export type ExpenseBreakdown = {
  id?: number;
  key?: string | number;
  name?: string;
  label?: string;
  legalEntityId?: number;
  legalEntityName?: string;
  locationId?: number;
  locationName?: string;
  category?: number;
  paymentStatus?: number;
  count?: number;
  expenseCount?: number;
  netAmount?: number;
  grossAmount?: number;
  amount?: number;
  month?: string;
};

export type ExpenseStatistics = {
  expenseCount: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  paidGrossAmount: number;
  unpaidGrossAmount: number;
  overdueGrossAmount: number;
  revenueGrossAmount: number;
  paymentProviderFeeAmount: number;
  revenueNetAmount: number;
  operatingProfitGrossAmount: number;
  operatingProfitNetAmount: number;
  byLegalEntity: ExpenseBreakdown[] | null;
  byLocation: ExpenseBreakdown[] | null;
  byCategory: ExpenseBreakdown[] | null;
  byPaymentStatus: ExpenseBreakdown[] | null;
  byMonth: ExpenseBreakdown[] | null;
};

export type ExpenseDictionaryItem = {
  value?: number;
  id?: number;
  key?: number;
  name?: string;
  label?: string;
  displayName?: string;
};

export function getExpenses(query: ExpenseQuery) {
  return backendGet<ExpensePagedResult>("expenses", query);
}

export function getExpense(id: number) {
  return backendGet<CompanyExpense>(`expenses/${id}`);
}

export function createExpense(payload: ExpensePayload) {
  return backendPost<CompanyExpense>("expenses", payload);
}

export function updateExpense(id: number, payload: ExpensePayload) {
  return backendPut<CompanyExpense>(`expenses/${id}`, payload);
}

export function markExpenseAsPaid(id: number, paidAt?: string) {
  return backendPost<CompanyExpense>(
    `expenses/${id}/mark-paid`,
    paidAt ? { paidAt } : undefined,
  );
}

export function deleteExpense(id: number, recurrenceEditScope?: number | null) {
  return backendDelete<void>(`expenses/${id}`, { recurrenceEditScope });
}

export function getExpenseCategories() {
  return backendGet<ExpenseDictionaryItem[] | Record<string, string | number>>(
    "expenses/categories",
  );
}

export function getExpensePaymentStatuses() {
  return backendGet<ExpenseDictionaryItem[] | Record<string, string | number>>(
    "expenses/payment-statuses",
  );
}

export function getExpenseRecurrenceEditScopes() {
  return backendGet<ExpenseDictionaryItem[]>("expenses/recurrence-edit-scopes");
}

export function getExpenseStatistics(query: ExpenseQuery) {
  const filters = { ...query };
  delete filters.page;
  delete filters.pageSize;
  return backendGet<ExpenseStatistics>("expenses/statistics", filters);
}

export async function uploadExpenseAttachment(id: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return backendFetch<CompanyExpense>(`expenses/${id}/attachment`, {
    method: "POST",
    body: formData,
  });
}

export function downloadExpenseAttachment(id: number) {
  return backendDownload(`expenses/${id}/attachment`);
}

export function deleteExpenseAttachment(id: number) {
  return backendDelete<CompanyExpense | void>(`expenses/${id}/attachment`);
}
