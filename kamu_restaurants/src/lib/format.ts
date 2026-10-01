const lkr = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Menu prices are stored in LKR (PROJECT.md section 6). */
export function formatLkr(amount: number): string {
  return lkr.format(amount);
}
