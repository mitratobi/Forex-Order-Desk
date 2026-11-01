import { amountToCents, rateToPaise, calculateTotals } from '../src/services/pricing.js';

describe('pricing', () => {
  test('amountToCents handles whole numbers, one and two decimals', () => {
    expect(amountToCents('250')).toBe(25000);
    expect(amountToCents('250.5')).toBe(25050);
    expect(amountToCents('250.05')).toBe(25005);
  });

  test('rateToPaise removes float noise', () => {
    expect(rateToPaise(83.2)).toBe(8320);
    expect(rateToPaise(22.65)).toBe(2265);
  });

  test('worked example: 250.50 USD at 83.20 with 1.5% fee', () => {
    const totals = calculateTotals(25050, 8320, 1.5);
    expect(totals).toEqual({ subtotalPaise: 2084160, feePaise: 31262, totalPaise: 2115422 });
  });

  test('rounds half-up on the paise', () => {
    // 1 cent x 0.50 rupee/unit = 0.5 paise -> rounds up to 1
    expect(calculateTotals(1, 50, 0).subtotalPaise).toBe(1);
  });

  test('zero fee percent adds nothing', () => {
    expect(calculateTotals(10000, 8320, 0).feePaise).toBe(0);
  });
});
