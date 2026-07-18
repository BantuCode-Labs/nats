# AI Chatbot — Reporting & Custom Reports Guide

This guide explains how authorized users can use the NATS AI assistant for **standard system reports** and **custom SQL-backed reports**.

## Who can do what?

| Capability | All authenticated roles | superadmin | Accountant |
|---|---|---|---|
| Operational tools (orders, stock, etc.) | Yes | Yes | Yes |
| Standard reports (`run_standard_report`) | Yes* | Yes | Yes |
| Database schema inspection | No | Yes | Yes |
| Custom SQL reports | No | Yes | Yes |

\* Standard report endpoints still enforce each module’s native permission checks (e.g. `sales.view`, `cash_bank.view`). If a report fails with “Unauthorized”, your role needs the corresponding module permission.

Custom SQL tools are **hard-gated** to roles named `superadmin` or `Accountant` (case-insensitive), or any role with the `*` permission.

---

## Standard reports (all users with module access)

In AI Chat, ask naturally or name a report code:

**Examples**

- “Show me the profit and loss for this year”
- “Run balance sheet as of today”
- “AR aging summary”
- “What reports can you generate?”

**Report codes**

| Code | Module | Description |
|---|---|---|
| `profit_loss` | Accounting | Income statement |
| `balance_sheet` | Accounting | Balance sheet |
| `cash_flow` | Accounting | Cash flow statement |
| `equity_change` | Accounting | Changes in equity |
| `financial_ratios` | Accounting | Liquidity / profitability ratios |
| `ar_aging` | Sales | Receivable aging |
| `receivable` | Sales | Receivable movement |
| `customer_recap` | Sales | Sales by customer |
| `sales_by_product` | Sales | Sales by product |
| `profitability` | Sales | Margin / profitability |
| `ap_aging` | Purchase | Payable aging |
| `payable` | Purchase | Payable movement |
| `vendor_recap` | Purchase | Purchases by vendor |
| `cash_balance` | Cash & Bank | Cash balances |
| `cash_flow_summary` | Cash & Bank | Cash flow summary |
| `daily_cash_movement` | Cash & Bank | Daily movement |
| `stock_valuation` | Inventory | Stock valuation |
| `low_stock` | Inventory | Low stock alerts |
| `slow_moving` | Inventory | Slow movers |
| `inventory_movement` | Inventory | Movement summary |
| `budget_variance` | Budgeting | Budget vs actual |
| `overspending` | Budgeting | Overspending |
| `asset_register` | Assets | Asset register |
| `depreciation_summary` | Assets | Depreciation |
| `asset_valuation` | Assets | Book values |
| `production_output` | Production | Output / yield |
| `material_consumption` | Production | Materials used |
| `wip` | Production | Work in progress |

Always provide dates when possible: `YYYY-MM-DD`.

---

## Custom reports (superadmin & Accountant only)

### Recommended workflow

1. **Prefer a standard report** if one already answers the question.
2. Ask the agent to **inspect the schema** for the relevant module.
3. Let the agent draft a **read-only SELECT**.
4. For sensitive tables (users, journals, payments, payroll), the agent must set **`approved=true`** only when the request is legitimate.
5. Review the table + **insights** (trends, anomalies, recommendations).

### Example prompts

- “Using the schema, build a report of top 20 customers by invoice total this quarter.”
- “Show monthly posted journal debit totals by account type for 2026.”
- “List products with stock quantity under reorder point and their warehouse.”

### Security controls

- **SELECT / WITH … SELECT only** — no INSERT/UPDATE/DELETE/DDL.
- **Single statement** — no stacked queries.
- **Sensitive columns blocked** — e.g. `password`, tokens, secrets.
- **Blocked tables** — e.g. `VerificationToken`, integration outbox/inbox.
- **Sensitive tables** require explicit approval flag: `User`, `Role`, journals, payments, payroll, etc.
- **LIMIT** auto-applied (max 500 rows).
- **15s timeout** on execution.
- Queries are **audited** via `ReportLog` (`source: AI_CUSTOM_SQL`).

### What the agent will refuse

- Any mutation or schema-change SQL
- Selecting password / secret fields
- Custom SQL for Cashier, Manager, Customer, Merchant, etc.
- Unknown table names not present in the Prisma schema catalog

---

## Interpreting analysis output

Custom and standard reports may append an **Insights** section:

- **SUMMARY** — totals, averages, ranges
- **TREND** — first-half vs second-half comparison
- **ANOMALY** — outliers (mean ± 2σ) or sparse columns
- **RECOMMENDATION** — suggested follow-up actions

Always reconcile material findings against the native report screens before making financial decisions.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| “Access denied” on custom SQL | Role is not superadmin/Accountant | Use standard reports or request role change |
| “Approval required” | Query touches sensitive tables | Confirm need; re-run with approval |
| “Unknown table” | Wrong model name | Call schema tool; use Prisma model names (e.g. `SalesInvoice`) |
| “Unauthorized” on standard report | Missing module permission | Grant e.g. `sales.view`, `accounting.view` |
| Empty result | Filters / date range | Broaden dates; check posted/status filters |

---

## Developer notes

| Component | Path |
|---|---|
| Role context | `lib/ai/context.ts` |
| Schema parser | `lib/ai/schema/parser.ts` |
| SQL validator | `lib/ai/sql/validator.ts` |
| SQL executor | `lib/ai/sql/executor.ts` |
| Standard report tools | `lib/ai/tools/report-tools.ts` |
| Custom report tools | `lib/ai/tools/custom-report-tools.ts` |
| Tool assembly | `lib/ai/tool-registry.ts` |
| Agent system prompt | `lib/ai/agent.ts` |
| Chat API | `app/api/ai/chat/route.ts` |

Run unit tests:

```bash
npx vitest run lib/ai
```
