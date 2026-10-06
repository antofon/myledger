// Utils.gs: shared helpers

// ─────────────────────────────────────────
// HELPER: timezone-safe date string
// ─────────────────────────────────────────
/**
 * Timezone-safe yyyy-MM-dd string from a Sheets cell value (Date or string).
 * String dates are pinned to noon UTC so the calendar day can't shift.
 * @param {*} val
 * @return {?string}
 */
function toDateStr_(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return Utilities.formatDate(val, 'America/Los_Angeles', 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  var parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (parts) {
    var d = new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3], 12, 0, 0));
    return Utilities.formatDate(d, 'America/Los_Angeles', 'yyyy-MM-dd');
  }
  var d2 = new Date(s + 'T12:00:00');
  if (isNaN(d2.getTime())) return null;
  return Utilities.formatDate(d2, 'America/Los_Angeles', 'yyyy-MM-dd');
}
