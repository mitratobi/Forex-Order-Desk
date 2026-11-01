import request from 'supertest';
import { createApp } from '../src/app.js';

const validOrder = { customerName: 'Asha Rao', currency: 'USD', amount: '250.50' };

let app;
beforeEach(() => {
  app = createApp(); // fresh in-memory store per test
});

const post = (body) => request(app).post('/api/orders').send(body);

describe('GET /api/rates', () => {
  test('returns the five fixed rates', async () => {
    const res = await request(app).get('/api/rates');
    expect(res.status).toBe(200);
    expect(res.body.isSample).toBe(true);
    expect(res.body.rates.map((r) => r.currency)).toEqual(['USD', 'EUR', 'GBP', 'AED', 'SGD']);
  });
});

describe('POST /api/orders - success', () => {
  test('returns 201 with id, reference, createdAt and server-calculated totals', async () => {
    const res = await post(validOrder);
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.reference).toMatch(/^FX-\d{8}-0001$/);
    expect(res.body.createdAt).toBeTruthy();
    expect(res.body).toMatchObject({ rate: 83.2, inrSubtotal: 20841.6, serviceFee: 312.62, inrTotal: 21154.22 });
  });

  test('accepts lowercase currency and a numeric amount', async () => {
    const res = await post({ customerName: ' Asha Rao ', currency: 'eur', amount: 10 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ customerName: 'Asha Rao', currency: 'EUR', inrSubtotal: 905 });
  });

  test('ignores a client-supplied rate and total', async () => {
    const res = await post({ ...validOrder, rate: 1, inrTotal: 1 });
    expect(res.body.rate).toBe(83.2);
    expect(res.body.inrTotal).toBe(21154.22);
  });

  test('accepts the 5,000 maximum', async () => {
    expect((await post({ ...validOrder, amount: 5000 })).status).toBe(201);
  });
});

describe('POST /api/orders - validation', () => {
  test.each([
    ['whitespace-only name', { ...validOrder, customerName: '   ' }, 'customerName'],
    ['name with digits', { ...validOrder, customerName: 'R2D2' }, 'customerName'],
    ['unsupported currency', { ...validOrder, currency: 'XYZ' }, 'currency'],
    ['missing currency', { customerName: 'Asha', amount: 5 }, 'currency'],
    ['missing amount', { customerName: 'Asha', currency: 'USD' }, 'amount'],
    ['non-numeric amount', { ...validOrder, amount: '12abc' }, 'amount'],
    ['exponent amount', { ...validOrder, amount: '1e3' }, 'amount'],
    ['array amount', { ...validOrder, amount: [5] }, 'amount'],
    ['zero amount', { ...validOrder, amount: 0 }, 'amount'],
    ['negative amount', { ...validOrder, amount: -5 }, 'amount'],
    ['over the maximum', { ...validOrder, amount: 5000.01 }, 'amount'],
    ['more than 2 decimals', { ...validOrder, amount: '1.234' }, 'amount'],
  ])('%s returns 400 with a field-level message', async (_label, body, field) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.fields[field]).toEqual(expect.any(String));
  });

  test('reports every invalid field at once', async () => {
    const res = await post({ customerName: '', currency: 'XYZ', amount: 'abc' });
    expect(Object.keys(res.body.fields).sort()).toEqual(['amount', 'currency', 'customerName']);
  });

  test('malformed JSON returns 400, not an HTML error', async () => {
    const res = await request(app).post('/api/orders').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body must be valid JSON.');
  });

  test('invalid orders are never stored', async () => {
    await post({ ...validOrder, amount: 0 });
    expect((await request(app).get('/api/orders')).body).toEqual([]);
  });
});

describe('Idempotency-Key', () => {
  test('a repeated key returns the original order and creates no duplicate', async () => {
    const send = () => request(app).post('/api/orders').set('Idempotency-Key', 'abc').send(validOrder);
    const first = await send();
    const second = await send();
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect((await request(app).get('/api/orders')).body).toHaveLength(1);
  });
});

describe('GET /api/orders', () => {
  test('is empty at first', async () => {
    expect((await request(app).get('/api/orders')).body).toEqual([]);
  });

  test('lists newest first', async () => {
    await post({ ...validOrder, customerName: 'First' });
    await post({ ...validOrder, customerName: 'Second' });
    const res = await request(app).get('/api/orders');
    expect(res.body.map((o) => o.customerName)).toEqual(['Second', 'First']);
  });

  test('filters by currency and rejects an unknown one', async () => {
    await post(validOrder);
    await post({ ...validOrder, currency: 'GBP' });
    expect((await request(app).get('/api/orders?currency=gbp')).body).toHaveLength(1);
    expect((await request(app).get('/api/orders?currency=ZZZ')).status).toBe(400);
  });
});

describe('misc', () => {
  test('health check and JSON 404', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});
