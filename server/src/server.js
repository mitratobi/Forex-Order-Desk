import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createOrderStore } from './store/orderStore.js';

const PORT = process.env.PORT || 4000;
const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = process.env.DATA_FILE || path.join(serverRoot, 'data', 'orders.json');

createApp(createOrderStore(dataFile)).listen(PORT, () => {
  console.log(`Forex Order Desk API listening on http://localhost:${PORT}`);
});
