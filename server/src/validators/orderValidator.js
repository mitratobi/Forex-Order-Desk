import { findRate, RATES, MAX_AMOUNT } from '../data/rates.js';

const NAME_PATTERN = /^[\p{L} .'-]+$/u;
// Digits, optionally followed by a dot and 1-2 digits. Rejects negatives, exponents and junk.
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

function validateName(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return { error: 'Please enter your full name.' };
  const name = raw.trim();
  const validLength = name.length >= 2 && name.length <= 60;
  if (!validLength || !NAME_PATTERN.test(name)) {
    return { error: 'Name can only contain letters, spaces, dots, apostrophes and hyphens (2-60 characters).' };
  }
  return { value: name };
}

function validateCurrency(raw) {
  const currency = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!findRate(currency)) {
    const supported = RATES.map((r) => r.currency);
    const shown = currency || 'that currency';
    return { error: `We don't support ${shown}. Choose ${supported.slice(0, -1).join(', ')} or ${supported.at(-1)}.` };
  }
  return { value: currency };
}

// Returns the amount as a clean string ("250.50") so later maths can use integers.
function validateAmount(raw, currency) {
  if (isBlank(raw)) return { error: 'Please enter how much currency you want to buy.' };
  const isTextOrNumber = typeof raw === 'string' || (typeof raw === 'number' && Number.isFinite(raw));
  const text = isTextOrNumber ? String(raw).trim() : '';
  if (!AMOUNT_PATTERN.test(text)) {
    // A well-formed number with 3+ decimals deserves the more specific message.
    if (/^\d+\.\d{3,}$/.test(text)) return { error: 'Amount can have at most 2 decimal places.' };
    if (/^-/.test(text) && Number(text) <= 0) return { error: 'Amount must be greater than zero.' };
    return { error: 'Amount must be a number, e.g. 250 or 250.50.' };
  }
  const value = Number(text);
  if (value <= 0) return { error: 'Amount must be greater than zero.' };
  if (value > MAX_AMOUNT) {
    const unit = currency || 'units';
    return { error: `The maximum per order is ${MAX_AMOUNT.toLocaleString('en-US')} ${unit}. Please split larger amounts into separate orders.` };
  }
  return { value: text };
}

// Returns { errors } (field -> message) or { value } with cleaned fields.
export function validateOrder(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Request body must be valid JSON.' } };
  }
  const name = validateName(body.customerName);
  const currency = validateCurrency(body.currency);
  const amount = validateAmount(body.amount, currency.value);

  const errors = {};
  if (name.error) errors.customerName = name.error;
  if (currency.error) errors.currency = currency.error;
  if (amount.error) errors.amount = amount.error;
  if (Object.keys(errors).length) return { errors };

  return { value: { customerName: name.value, currency: currency.value, amount: amount.value } };
}
