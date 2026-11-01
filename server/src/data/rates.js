// Fixed sample rates (INR per 1 unit). Adding a currency is one line here.
export const FEE_PERCENT = 1.5;
export const MAX_AMOUNT = 5000;

export const RATES = Object.freeze([
  Object.freeze({ currency: 'USD', name: 'US Dollar', rate: 83.2 }),
  Object.freeze({ currency: 'EUR', name: 'Euro', rate: 90.5 }),
  Object.freeze({ currency: 'GBP', name: 'British Pound', rate: 105.8 }),
  Object.freeze({ currency: 'AED', name: 'UAE Dirham', rate: 22.65 }),
  Object.freeze({ currency: 'SGD', name: 'Singapore Dollar', rate: 61.4 }),
]);

export function findRate(currency) {
  return RATES.find((r) => r.currency === currency);
}
