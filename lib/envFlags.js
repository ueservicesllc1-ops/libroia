/**
 * @param {string} name
 */
function envBool(name) {
  const v = process.env[name];
  if (v == null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

module.exports = { envBool };
