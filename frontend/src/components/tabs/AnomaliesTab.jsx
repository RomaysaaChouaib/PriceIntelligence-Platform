import React, { useEffect, useState } from 'react';
import { getAnomalies } from '../../services/api';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';

// ── Badge méthode ────────────────────────────────────────────────────────────
function MethodBadge({ name, count, pct, color }) {
  return (
    <div className="pip-method-card" style={{ borderTop: `3px solid ${color}` }}>
      <p className="pip-method-name">{name}</p>
      <p className="pip-method-count" style={{ color }}>{count}</p>
      <p className="pip-method-pct">anomalies ({pct}%)</p>
    </div>
  );
}

const METHOD_COLORS = {
  'IQR':              '#f59e0b',
  'Z-score':          '#3b82f6',
  'Isolation Forest': '#ef4444',
  'LOF':              '#8b5cf6',
};

export default function AnomaliesTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    getAnomalies()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="pip-loading">Détection des anomalies…</div>;
  if (error)   return <div className="pip-error">Erreur : {error}</div>;
  if (!data)   return null;

  const { summary = [], anomalies = [], total } = data;

  // Filtrage par gamme de prix
  const filtered = filter === 'all'
    ? anomalies
    : anomalies.filter(a => a.price_category === filter);

  const categories = [...new Set(anomalies.map(a => a.price_category).filter(Boolean))];

  return (
    <div className="pip-tab-inner">

      <div className="pip-tab-header">
        <div>
          <h2 className="pip-tab-title">Détection d'anomalies de prix</h2>
          <p className="pip-tab-subtitle">
            {total} prix suspects détectés via Isolation Forest
          </p>
        </div>
        <AlertTriangle size={28} color="#ef4444" />
      </div>

      {/* ── Résumé par méthode ── */}
      {summary.length > 0 && (
        <div className="pip-section">
          <h3 className="pip-section-title">Comparaison des méthodes</h3>
          <div className="pip-methods-grid">
            {summary.map((m, i) => (
              <MethodBadge
                key={i}
                name={m.methode}
                count={m.anomalies}
                pct={m.pourcentage}
                color={METHOD_COLORS[m.methode] || '#64748b'}
              />
            ))}
          </div>
          <p className="pip-methods-note">
            ℹ️ Isolation Forest et LOF sont des méthodes multivariées (prix + RAM + stockage).
            IQR et Z-score analysent uniquement le prix.
          </p>
        </div>
      )}

      {/* ── Filtres ── */}
      {categories.length > 0 && (
        <div className="pip-filter-row">
          <button
            className={`pip-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tous ({anomalies.length})
          </button>
          {categories.map((cat, i) => (
            <button
              key={i}
              className={`pip-filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Liste des anomalies ── */}
      <div className="pip-section">
        <h3 className="pip-section-title">
          Produits suspects ({filtered.length})
        </h3>

        {filtered.length === 0 ? (
          <p className="pip-empty">Aucune anomalie dans cette catégorie.</p>
        ) : (
          <div className="pip-table-wrapper">
            <table className="pip-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Marque</th>
                  <th>Prix</th>
                  <th>Gamme</th>
                  <th>Alerte</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const isLow = a.price < 3000;
                  return (
                    <tr key={i} className="pip-anomaly-row">
                      <td className="pip-anomaly-title">{a.title}</td>
                      <td>{a.brand_detected || '—'}</td>
                      <td><strong>{a.price?.toLocaleString('fr-FR')} MAD</strong></td>
                      <td>{a.price_category || '—'}</td>
                      <td>
                        {isLow
                          ? <span className="pip-alert pip-alert-low"><TrendingDown size={13} /> Prix anormalement bas</span>
                          : <span className="pip-alert pip-alert-high"><TrendingUp size={13} /> Prix anormalement élevé</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
