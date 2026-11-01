// Client-side copy of the server rules, for instant feedback. The server still has the final say.
const NAME_PATTERN = /^[\p{L} .'-]+$/u;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT = 5000;

export function validateName(raw) {
  const name = raw.trim();
  if (!name) return 'Please enter your full name.';
  if (name.length < 2 || name.length > 60 || !NAME_PATTERN.test(name)) {
    return 'Name can only contain letters, spaces, dots, apostrophes and hyphens (2-60 characters).';
  }
  return '';
}

export function validateCurrency(currency) {
  return currency ? '' : 'Please choose a currency.';
}

export function validateAmount(raw, currency) {
  const text = raw.trim();
  if (!text) return 'Please enter how much currency you want to buy.';
  if (!AMOUNT_PATTERN.test(text)) {
    if (/^\d+\.\d{3,}$/.test(text)) return 'Amount can have at most 2 decimal places.';
    if (/^-/.test(text) && Number(text) <= 0) return 'Amount must be greater than zero.';
    return 'Amount must be a number, e.g. 250 or 250.50.';
  }
  const value = Number(text);
  if (value <= 0) return 'Amount must be greater than zero.';
  if (value > MAX_AMOUNT) {
    return `The maximum per order is 5,000 ${currency || 'units'}. Please split larger amounts into separate orders.`;
  }
  return '';
}
