import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { getRates, getOrders, createOrder } from './api/client.js';
import RatesTable from './components/RatesTable.jsx';
import OrderForm from './components/OrderForm.jsx';
import Confirmation from './components/Confirmation.jsx';
import OrderHistory from './components/OrderHistory.jsx';

const LOADING = { status: 'loading', data: null, error: '' };

export default function App() {
  const [rates, setRates] = useState(LOADING);
  const [orders, setOrders] = useState(LOADING);
  const [filter, setFilter] = useState('');
  const [confirmed, setConfirmed] = useState(null);
  const nameInputRef = useRef(null);

  const loadRates = useCallback(() => {
    setRates(LOADING);
    getRates()
      .then((data) => setRates({ status: 'ready', data, error: '' }))
      .catch((err) => setRates({ status: 'error', data: null, error: err.message }));
  }, []);

  const latestOrdersRequest = useRef(0);

  const loadOrders = useCallback((currency, { quiet = false } = {}) => {
    const requestId = ++latestOrdersRequest.current;
    const isStale = () => requestId !== latestOrdersRequest.current;
    if (!quiet) setOrders(LOADING);
    getOrders(currency)
      .then((data) => !isStale() && setOrders({ status: 'ready', data, error: '' }))
      .catch((err) => {
        // A failed background refresh keeps the list the customer is already looking at.
        if (isStale() || quiet) return;
        setOrders({ status: 'error', data: null, error: err.message });
      });
  }, []);

  useEffect(loadRates, [loadRates]);
  useEffect(() => loadOrders(filter), [filter, loadOrders]);

  // Throws on failure so OrderForm can show field errors and keep what was typed.
  async function placeOrder(order, idempotencyKey) {
    const created = await createOrder(order, idempotencyKey);
    setConfirmed(created);
    // Show it straight away if it belongs in the current view, then sync with the server.
    setOrders((s) =>
      s.status === 'ready' && (!filter || filter === created.currency)
        ? { ...s, data: [created, ...s.data] }
        : s,
    );
    loadOrders(filter, { quiet: true });
  }

  function placeAnother() {
    // Render the form first; its name input does not exist until the confirmation is gone.
    flushSync(() => setConfirmed(null));
    nameInputRef.current?.focus();
  }

  const currencies = rates.status === 'ready' ? rates.data.rates.map((r) => r.currency) : [];

  return (
    <main className="app">
      <h1>Forex Order Desk</h1>
      <div className="layout">
        <div className="column">
          <RatesTable state={rates} onRetry={loadRates} />
          {confirmed ? (
            <Confirmation order={confirmed} onReset={placeAnother} />
          ) : (
            <OrderForm ratesState={rates} onPlaceOrder={placeOrder} nameInputRef={nameInputRef} />
          )}
        </div>
        <div className="column">
          <OrderHistory
            state={orders}
            currencies={currencies}
            filter={filter}
            onFilterChange={setFilter}
            onRetry={() => loadOrders(filter)}
          />
        </div>
      </div>
    </main>
  );
}
