// All money maths is done in integers (cents of foreign currency, paise of INR)
// so floating point errors can never creep in. Rounding is half-up.
// NOTE: client/src/utils/pricing.js must stay identical in logic to this file.

// "250.50" -> 25050. Works on the string so no float multiplication is involved.
export function amountToCents(amountText) {
  const [whole, decimals = ''] = String(amountText).split('.');
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
}

// 83.2 -> 8320. Rates have at most 2 decimals, so rounding only removes float noise.
export function rateToPaise(rate) {
  return Math.round(rate * 100);
}

// subtotal = amountCents * ratePaise / 100  (cents x paise-per-unit -> paise)
export function calculateTotals(amountCents, ratePaise, feePercent) {
  const subtotalPaise = Math.round((amountCents * ratePaise) / 100);
  // feePercent 1.5 -> 15 per mille, kept as an integer ratio.
  const feePaise = Math.round((subtotalPaise * Math.round(feePercent * 10)) / 1000);
  return { subtotalPaise, feePaise, totalPaise: subtotalPaise + feePaise };
}

export function paiseToRupees(paise) {
  return paise / 100;
}
