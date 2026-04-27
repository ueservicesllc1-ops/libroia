/**
 * @param {import("better-sqlite3").Database} db
 * @param {number} userId
 */
function resetBillingCycleIfNeeded(db, userId) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!row) return null;
  const now = new Date();
  const end = new Date(row.billing_cycle_end);
  if (now.getTime() <= end.getTime()) return row;

  const cycleDays = Math.max(1, Math.floor(Number(process.env.BILLING_CYCLE_DAYS) || 30));
  const newStart = new Date(row.billing_cycle_end);
  const newEnd = new Date(newStart);
  newEnd.setDate(newEnd.getDate() + cycleDays);
  const iso = new Date().toISOString();

  db.prepare(
    `UPDATE users SET
      billing_cycle_start = ?,
      billing_cycle_end = ?,
      included_tokens_used = 0,
      sonnet_monthly_spend_used = 0,
      updated_at = ?
    WHERE id = ?`
  ).run(newStart.toISOString(), newEnd.toISOString(), iso, userId);

  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

module.exports = { resetBillingCycleIfNeeded };
