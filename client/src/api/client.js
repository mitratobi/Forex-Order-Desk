const BASE_URL = import.meta.env.VITE_API_URL || '';
const TIMEOUT_MS = 8000;
const UNREACHABLE = "We couldn't reach the server. Please try again.";
// A proxy or host answers 502/503/504 on behalf of a backend that is down.
const GATEWAY_ERRORS = [502, 503, 504];

// status 0 means we never got a response (server down, offline or timed out).
export class ApiError extends Error {
  constructor(message, status = 0, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, signal: controller.signal });
    if (GATEWAY_ERRORS.includes(res.status)) throw new ApiError(UNREACHABLE);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || 'Something went wrong.', res.status, data.fields);
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(UNREACHABLE);
  } finally {
    clearTimeout(timer);
  }
}

export const getRates = () => request('/api/rates');

export const getOrders = (currency) =>
  request(currency ? `/api/orders?currency=${encodeURIComponent(currency)}` : '/api/orders');

export const createOrder = (order, idempotencyKey) =>
  request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(order),
  });
