import StatusBanner from './StatusBanner.jsx';
import { formatInr } from '../utils/format.js';

export default function RatesTable({ state, onRetry }) {
  return (
    <section className="panel" aria-labelledby="rates-title">
      <h2 id="rates-title">Today's rates</h2>
      <p className="badge">Fixed sample rates for this assessment, not live market rates.</p>

      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading rates">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      )}

      {state.status === 'error' && <StatusBanner message={state.error} onRetry={onRetry} />}

      {state.status === 'ready' && (
        <table>
          <thead>
            <tr>
              <th scope="col">Currency</th>
              <th scope="col">Name</th>
              <th scope="col" className="num">₹ per 1 unit</th>
            </tr>
          </thead>
          <tbody>
            {state.data.rates.map((r) => (
              <tr key={r.currency}>
                <th scope="row">{r.currency}</th>
                <td>{r.name}</td>
                <td className="num">{formatInr(r.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
