export type { AppState } from "./src/state";
export { createInitialState } from "./src/state";

export { domainReducer } from "./src/reducer";

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

export {
  recordPayslipEvent,
  deletePayslipEvent,
  getPayslipHistory,
  summarizePayslips,
  formatPayslipPeriod,
} from "./src/payslips";
export type { RecordPayslipParams, PayslipSummary } from "./src/payslips";
export type { StoredPayslip } from "./src/state";
