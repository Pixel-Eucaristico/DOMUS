export type { AppState, OutOfOrderState, StoredPayslip } from "./src/state";
export { createInitialState, createInitialOutOfOrderState } from "./src/state";

export { domainReducer, sameEmployer, normalizeCompany, samePayslipSlot, payslipKindOf } from "./src/reducer";

export { replayEvents, replayEventsSince } from "./src/replay";

export {
  createAccountEvent,
  updateAccountEvent,
  deleteAccountEvent,
  getCreditUsage,
  getAvailableCredit,
} from "./src/accounts";
export type { CreateAccountParams } from "./src/accounts";

export {
  createTransactionEvent,
  updateTransactionEvent,
  deleteTransactionEvent,
  calculate503020,
  getIdeal503020,
} from "./src/transactions";
export type { CreateTransactionParams, BudgetBreakdown } from "./src/transactions";

export { recordPayslipEvent, deletePayslipEvent, PAYSLIP_PERIOD_PATTERN, PAYSLIP_SOURCES, PAYSLIP_KINDS } from "./src/payslips";
export type { RecordPayslipParams } from "./src/payslips";

export {
  PAYSLIP_INCOME_CATEGORY_ID,
  findPayslipsInSlot,
  defaultLaunchIncome,
  incomeEligibleAccounts,
  defaultIncomeAccountId,
  formatPayslipPeriodLabel,
  replacePayslipMessage,
  payslipIncomeDescription,
  isRealIsoDate,
  buildPayslipSaveEvents,
} from "./src/payslipReview";
export type { PayslipReviewValues, PayslipSaveOptions, PayslipSaveEvents } from "./src/payslipReview";

export {
  PAYSLIP_HISTORY_WINDOW,
  UNDETAILED_DEDUCTIONS_LABEL,
  buildPayslipHistory,
  payslipHistoryWindow,
  summarizePayslipHistory,
  payslipChartSeries,
  deductionKey,
  payslipDeductionTotals,
  payslipDeductionTitle,
  sortPayslipsNewestFirst,
  payslipEmployerLabel,
  deletePayslipMessage,
} from "./src/payslipHistory";
export type {
  PayslipHistoryEntry,
  PayslipHistorySummary,
  PayslipChartPoint,
  PayslipDeductionTotal,
  PayslipHistoryWindow,
} from "./src/payslipHistory";
