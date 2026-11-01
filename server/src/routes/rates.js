import { Router } from 'express';
import { RATES, FEE_PERCENT } from '../data/rates.js';

export function ratesRouter() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({ base: 'INR', isSample: true, feePercent: FEE_PERCENT, rates: RATES });
  });

  return router;
}
