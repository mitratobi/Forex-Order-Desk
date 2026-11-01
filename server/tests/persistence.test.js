import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createOrderStore } from '../src/store/orderStore.js';

const order = { customerName: 'Asha Rao', currency: 'USD', amount: '10' };
let dir;
let file;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-orders-'));
  file = path.join(dir, 'orders.json');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('JSON persistence', () => {
  test('orders survive a restart (new store on the same file)', async () => {
    const first = await request(createApp(createOrderStore(file))).post('/api/orders').send(order);

    const afterRestart = await request(createApp(createOrderStore(file))).get('/api/orders');
    expect(afterRestart.body.map((o) => o.id)).toEqual([first.body.id]);
  });

  test('references keep counting after a restart', async () => {
    await request(createApp(createOrderStore(file))).post('/api/orders').send(order);
    const second = await request(createApp(createOrderStore(file))).post('/api/orders').send(order);
    expect(second.body.reference).toMatch(/-0002$/);
  });

  test('leaves no temp file behind', async () => {
    await request(createApp(createOrderStore(file))).post('/api/orders').send(order);
    expect(fs.readdirSync(dir)).toEqual(['orders.json']);
  });

  test('a corrupt file is set aside and the store starts empty', () => {
    fs.writeFileSync(file, '{not json');
    const store = createOrderStore(file);
    expect(store.list()).toEqual([]);
    expect(fs.readdirSync(dir).some((f) => f.startsWith('orders.json.corrupt-'))).toBe(true);
  });
});

describe('POST rate limit', () => {
  test('returns 429 after 30 orders a minute but still allows reads', async () => {
    const app = createApp();
    const post = () => request(app).post('/api/orders').send(order);
    for (let i = 0; i < 30; i += 1) expect((await post()).status).toBe(201);

    const blocked = await post();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many/i);
    expect((await request(app).get('/api/orders')).status).toBe(200);
  });
});
