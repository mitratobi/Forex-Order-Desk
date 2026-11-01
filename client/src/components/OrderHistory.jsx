import StatusBanner from './StatusBanner.jsx';
import { formatInr, formatUnits, formatDateTime } from '../utils/format.js';

export default function OrderHistory({ state, currencies, filter, onFilterChange, onRetry }) {
  return (
    <section className="panel" aria-labelledby="history-title">
      <div className="panel-head">
        <h2 id="history-title">Order history</h2>
        <label className="filter">
          Filter
          <select value={filter} onChange={(e) => onFilterChange(e.target.value)}>
            <option value="">All currencies</option>
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {state.status === 'loading' && <p role="status">Loading orders…</p>}
      {state.status === 'error' && <StatusBanner message={state.error} onRetry={onRetry} />}
      {state.status === 'ready' && state.data.length === 0 && (
        <p>No orders yet. Your placed orders will appear here.</p>
      )}

      {state.status === 'ready' && state.data.length > 0 && (
        <table className="history">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Customer</th>
              <th scope="col" className="num">Amount</th>
              <th scope="col" className="num">Total (INR)</th>
              <th scope="col">Placed</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((o) => (
              <tr key={o.id}>
                <th scope="row" data-label="Reference">{o.reference}</th>
                <td data-label="Customer">{o.customerName}</td>
                <td className="num" data-label="Amount">{formatUnits(o.amount)} {o.currency}</td>
                <td className="num" data-label="Total">{formatInr(o.inrTotal)}</td>
                <td data-label="Placed">{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
