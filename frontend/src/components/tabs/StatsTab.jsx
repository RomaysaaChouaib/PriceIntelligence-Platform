import React, { useEffect, useState } from 'react';
import { getStats, exportCSV } from '../../services/api';
import { Download, TrendingUp, BarChart2, ShoppingBag, Cpu, Activity } from 'lucide-react';
import BoxplotChart from '../charts/BoxplotChart';

// ── Carte stat ────────────────────────────────────────────────────────────────
function StatItem({ label, value, unit = '', accent = false }) {
  return (
    <div className={`pip-stat-item ${accent ? 'pip-stat-item--accent' : ''}`}>
      <p className="pip-stat-item-label">{label}</p>
      <p className="pip-stat-item-value">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : (value ?? '—')}
        {unit && <span className="pip-stat-unit"> {unit}</span>}
      </p>
    </div>
  );
}

// ── Barre de distribution ────────────────────────────────────────────────────
function DistributionBar({ label, count, maxCount, color = '#3b82f6', index = 0 }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="pip-dist-row">
      <span className="pip-dist-label">{label}</span>
      <div className="pip-dist-bar-bg">
        <div
          className="pip-dist-bar-fill"
          style={{ width: `${pct}%`, background: color, animationDelay: `${index * 60}ms` }}
        />
      </div>
      <span className="pip-dist-count">{count.toLocaleString()}</span>
    </div>
  );
}

export default function StatsTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="pip-loading"><span className="pip-spinner" />Chargement des statistiques…</div>;
  if (error)   return <div className="pip-error">Erreur : {error}</div>;
  if (!data)   return null;

  const { stats, by_brand, by_category, gaming, distribution, by_source } = data;
  const maxDist  = distribution ? Math.max(...distribution.map(d => d.count)) : 1;
  const maxBrand = by_brand     ? Math.max(...by_brand.map(b => b.count))     : 1;

  return (
    <div className="pip-tab-inner">

      {/* ── En-tête ── */}
      <div className="pip-tab-header">
        <div>
          <h2 className="pip-tab-title">Statistiques descriptives</h2>
          <p className="pip-tab-subtitle">
            <span className="pip-count-badge">{stats?.count?.toLocaleString('fr-FR')}</span> produits analysés
          </p>
        </div>
        <button className="pip-btn pip-btn-outline" onClick={exportCSV}>
          <Download size={15} /> Exporter CSV
        </button>
      </div>

      {/* ── Métriques clés ── */}
      <div className="pip-section">
        <h3 className="pip-section-title"><TrendingUp size={16} /> Prix (MAD)</h3>
        <div className="pip-stats-grid">
          <StatItem label="Prix minimum"     value={stats?.min}      unit="MAD" />
          <StatItem label="Prix maximum"     value={stats?.max}      unit="MAD" />
          <StatItem label="Prix médian"      value={stats?.median}   unit="MAD" accent />
          <StatItem label="Prix moyen"       value={stats?.mean}     unit="MAD" accent />
          <StatItem label="Écart-type"       value={stats?.std}      unit="MAD" />
          <StatItem label="Coeff. variation" value={stats?.cv}       unit="%"   />
          <StatItem label="Q1 (25%)"         value={stats?.p25}      unit="MAD" />
          <StatItem label="Q3 (75%)"         value={stats?.p75}      unit="MAD" />
          <StatItem label="Asymétrie"        value={stats?.skewness} />
          <StatItem label="Kurtosis"         value={stats?.kurtosis} />
        </div>
      </div>

      {/* ── Distribution des prix ── */}
      {distribution && distribution.length > 0 && (
        <div className="pip-section">
          <h3 className="pip-section-title"><BarChart2 size={16} /> Distribution des prix</h3>
          <div className="pip-distribution">
            {distribution.map((d, i) => (
              <DistributionBar
                key={i}
                label={d.label}
                count={d.count}
                maxCount={maxDist}
                color={`hsl(${210 + i * 14}, 72%, 52%)`}
                index={i}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Boxplot ── */}
      {by_source && by_source.length > 1 && (
        <div className="pip-section">
          <h3 className="pip-section-title"><Activity size={16} /> Boxplot comparatif par plateforme</h3>
          <BoxplotChart data={by_source} />
        </div>
      )}

      {/* ── Par marque ── */}
      {by_brand && by_brand.length > 0 && (
        <div className="pip-section">
          <h3 className="pip-section-title"><ShoppingBag size={16} /> Top marques</h3>
          <div className="pip-table-wrapper">
            <table className="pip-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Marque</th>
                  <th>Nb produits</th>
                  <th>Prix moyen</th>
                  <th>Prix médian</th>
                  <th>Part</th>
                </tr>
              </thead>
              <tbody>
                {by_brand.map((b, i) => (
                  <tr key={i}>
                    <td className="pip-row-num">{i + 1}</td>
                    <td>
                      <span className="pip-brand-chip">{b.brand_detected || b.brand}</span>
                    </td>
                    <td><strong>{b.count}</strong></td>
                    <td>{b.mean?.toLocaleString('fr-FR')} MAD</td>
                    <td>{b.median?.toLocaleString('fr-FR')} MAD</td>
                    <td>
                      <div className="pip-mini-bar-bg">
                        <div className="pip-mini-bar-fill" style={{ width: `${(b.count / maxBrand) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Par catégorie ── */}
      {by_category && by_category.length > 0 && (
        <div className="pip-section">
          <h3 className="pip-section-title"><Cpu size={16} /> Par gamme de prix</h3>
          <div className="pip-table-wrapper">
            <table className="pip-table">
              <thead>
                <tr><th>Gamme</th><th>Nb</th><th>Min</th><th>Max</th><th>Médiane</th></tr>
              </thead>
              <tbody>
                {by_category.map((c, i) => (
                  <tr key={i}>
                    <td><span className="pip-category-chip">{c.price_category}</span></td>
                    <td>{c.count}</td>
                    <td>{c.min?.toLocaleString('fr-FR')} MAD</td>
                    <td>{c.max?.toLocaleString('fr-FR')} MAD</td>
                    <td><strong>{c.median?.toLocaleString('fr-FR')} MAD</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Gaming vs Non-gaming ── */}
      {gaming && (gaming.gaming || gaming.non_gaming) && (
        <div className="pip-section">
          <h3 className="pip-section-title">🎮 Gaming vs Standard</h3>
          <div className="pip-gaming-compare">
            <div className="pip-gaming-card gaming">
              <div className="pip-gc-icon">🎮</div>
              <p className="pip-gc-label">Gaming</p>
              <p className="pip-gc-count">{gaming.gaming?.count}</p>
              <p className="pip-gc-subtitle">produits</p>
              <p className="pip-gc-price">
                {gaming.gaming?.median?.toLocaleString('fr-FR')} <span>MAD médiane</span>
              </p>
            </div>
            <div className="pip-gaming-vs">VS</div>
            <div className="pip-gaming-card standard">
              <div className="pip-gc-icon">💼</div>
              <p className="pip-gc-label">Standard</p>
              <p className="pip-gc-count">{gaming.non_gaming?.count}</p>
              <p className="pip-gc-subtitle">produits</p>
              <p className="pip-gc-price">
                {gaming.non_gaming?.median?.toLocaleString('fr-FR')} <span>MAD médiane</span>
              </p>
            </div>
          </div>
          {gaming.mannwhitney && (
            <div className={`pip-pvalue ${gaming.mannwhitney.pvalue < 0.05 ? 'pip-pvalue--sig' : ''}`}>
              <strong>Test Mann-Whitney</strong> — p-value : <code>{gaming.mannwhitney.pvalue}</code>
              <span className="pip-pvalue-verdict">
                {gaming.mannwhitney.pvalue < 0.05
                  ? ' ✅ Différence significative'
                  : ' ⚠️ Différence non significative'}
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}