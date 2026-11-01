import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ratesRouter } from './routes/rates.js';
import { ordersRouter } from './routes/orders.js';
import { createOrderStore } from './store/orderStore.js';
import { errorHandler } from './middleware/errorHandler.js';

// Built separately from server.js so tests can import the app without opening a port.
export function createApp(store = createOrderStore()) {
  const app = express();

  // Comma-separated allowlist from env; in dev the Vite proxy means CORS is not needed.
  const origins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
  app.use(helmet());
  app.use(cors({ origin: origins.length ? origins : false }));
  app.use(express.json({ limit: '10kb' }));

  // Only order creation is limited; reading rates and history stays unrestricted.
  app.use(
    '/api/orders',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 30,
      skip: (req) => req.method !== 'POST',
      message: { error: 'Too many orders from this address. Please wait a minute and try again.' },
    }),
  );

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/rates', ratesRouter());
  app.use('/api/orders', ordersRouter(store));

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });
  app.use(errorHandler);

  return app;
}
