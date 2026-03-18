import { z } from "zod";

// ─── Invoice / Nota Fiscal ───────────────────────────────────────────────────

export const InvoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number().optional().default(1),
  unitPrice: z.number().optional(),
  total: z.number(),
  ean: z.string().optional(),
  ncm: z.string().optional(),
});

export const InvoiceOCRSchema = z.object({
  store: z.string(),
  cnpj: z.string().optional(),
  date: z.string(),
  items: z.array(InvoiceItemSchema),
  subtotal: z.number().optional(),
  discounts: z.number().optional(),
  total: z.number(),
});

export type InvoiceOCRResult = z.infer<typeof InvoiceOCRSchema>;

// ─── Payslip / Holerite ──────────────────────────────────────────────────────

export const PayslipDeductionSchema = z.object({
  name: z.string(),
  value: z.number(),
});

export const PayslipOCRSchema = z.object({
  company: z.string(),
  cnpj: z.string().optional(),
  employee: z.string().optional(),
  period: z.string(),
  grossSalary: z.number(),
  deductions: z.array(PayslipDeductionSchema),
  netSalary: z.number(),
});

export type PayslipOCRResult = z.infer<typeof PayslipOCRSchema>;

// ─── Union type ──────────────────────────────────────────────────────────────

export type OCRDocumentType = "invoice" | "payslip";

export function getOCRSchema(type: OCRDocumentType) {
  return type === "invoice" ? InvoiceOCRSchema : PayslipOCRSchema;
}
