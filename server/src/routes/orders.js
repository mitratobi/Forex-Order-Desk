import { Router } from 'express';
import { findRate, FEE_PERCENT } from '../data/rates.js';
import { validateOrder } from '../validators/orderValidator.js';
import { amountToCents, rateToPaise, calculateTotals, paiseToRupees } from '../services/pricing.js';

// Builds the order fields. The rate always comes from the server, never from the client.
function priceOrder({ customerName, currency, amount }) {
  const { rate } = findRate(currency);
  const totals = calculateTotals(amountToCents(amount), rateToPaise(rate), FEE_PERCENT);
  return {
    customerName,
    currency,
    amount: Number(amount),
    rate,
    inrSubtotal: paiseToRupees(totals.subtotalPaise),
    feePercent: FEE_PERCENT,
    serviceFee: paiseToRupees(totals.feePaise),
    inrTotal: paiseToRupees(totals.totalPaise),
  };
}

export function ordersRouter(store) {
  const router = Router();

  router.post('/', (req, res) => {
    const key = req.get('Idempotency-Key');
    const existing = key && store.findByKey(key);
    if (existing) return res.status(200).json(existing);

    const { errors, value } = validateOrder(req.body);
    if (errors) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
    }
    const order = store.add(priceOrder(value), key);
    return res.status(201).json(order);
  });

  router.get('/', (req, res) => {
    const { currency } = req.query;
    if (currency !== undefined) {
      const code = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
      if (!findRate(code)) {
        return res.status(400).json({ error: 'Unknown currency filter.', fields: { currency: `We don't support ${code || 'that currency'}.` } });
      }
      return res.json(store.list(code));
    }
    return res.json(store.list());
  });

  return router;
}
