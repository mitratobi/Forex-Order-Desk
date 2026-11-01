import fs from 'node:fs';
import path from 'node:path';

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

// Reads saved orders. A missing file means a fresh start; an unreadable one is set aside, not overwritten.
function loadOrders(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  try {
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(saved)) throw new Error('orders file is not an array');
    return saved;
  } catch (err) {
    console.error(`Could not read ${filePath} (${err.message}); starting empty.`);
    fs.renameSync(filePath, `${filePath}.corrupt-${Date.now()}`);
    return [];
  }
}

// Write to a temp file then rename, so a crash mid-write cannot leave a half-written orders.json.
function saveOrders(filePath, orders) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(orders, null, 2));
  fs.renameSync(tempPath, filePath);
}

// Pass a filePath to persist orders; omit it for a purely in-memory store (used by tests).
export function createOrderStore(filePath) {
  const orders = loadOrders(filePath); // oldest first
  const keys = new Map(); // Idempotency-Key -> { order, expiresAt }

  function nextReference(createdAt) {
    const day = createdAt.slice(0, 10).replaceAll('-', '');
    const todaysCount = orders.filter((o) => o.reference.includes(`-${day}-`)).length;
    return `FX-${day}-${String(todaysCount + 1).padStart(4, '0')}`;
  }

  function findByKey(key) {
    const hit = keys.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      keys.delete(key);
      return undefined;
    }
    return hit.order;
  }

  function add(fields, key) {
    const createdAt = new Date().toISOString();
    const order = { id: crypto.randomUUID(), reference: nextReference(createdAt), ...fields, createdAt };
    orders.push(order);
    if (filePath) saveOrders(filePath, orders);
    if (key) keys.set(key, { order, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
    return order;
  }

  // Newest first; optional currency filter.
  function list(currency) {
    const matching = currency ? orders.filter((o) => o.currency === currency) : orders;
    return [...matching].reverse();
  }

  return { add, list, findByKey };
}
