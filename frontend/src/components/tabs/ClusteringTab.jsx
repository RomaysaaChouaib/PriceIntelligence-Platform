import React, { useEffect, useState } from 'react';
import { getClustering, getPCA } from '../../services/api';
import { BarChart2, Settings, RefreshCw } from 'lucide-react';
import RadarChart      from '../charts/RadarChart';
import PCAScatterChart from '../charts/PCAScatterChart';

const CLUSTER_COLORS = {
  'Entrée de gamme':      '#10b981',
  'Milieu de gamme bas':  '#3b82f6',
  'Milieu de gamme':      '#f59e0b',
  'Haut de gamme':        '#8b5cf6',
  'Premium':              '#ef4444',
  'Outlier':              '#6b7280',
};

function getColor(cluster) {
  return CLUSTER_COLORS[cluster] || '#64748b';
}

// ── Scatter plot SVG ─────────────────────────────────────────────────────────
function ScatterPlot({ data }) {
  if (!data || data.length === 0) return null;

  const W = 560, H = 300, PAD = 40;
  const prices = data.map(d => d.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);

  const clusters = [...new Set(data.map(d => d.cluster))];
  const clusterIndex = {};
  clusters.forEach((c, i) => { clusterIndex[c] = i; });

  const toX = p => PAD + ((p - minP) / (maxP - minP || 1)) * (W - PAD * 2);
  const toY = (cluster, i) => {
    const base = PAD + (clusterIndex[cluster] / (clusters.length)) * (H - PAD * 2);
    return base + (Math.sin(i * 2.3) * 12);
  };

  const sample = data.slice(0, 400);

  return (
    <div className="pip-scatter-wrapper">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          {clusters.map(c => (
            <radialGradient key={c} id={`grd-${c.replace(/\s/g, '')}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={getColor(c)} stopOpacity="0.9" />
              <stop offset="100%" stopColor={getColor(c)} stopOpacity="0.3" />
            </radialGradient>
          ))}
        </defs>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e2e8f0" strokeWidth="1" />
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1={PAD + t * (W - PAD * 2)} y1={PAD} x2={PAD + t * (W - PAD * 2)} y2={H - PAD}
            stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
        ))}
        <text x={PAD} y={H - 10} fontSize="10" fill="#94a3b8">{Math.round(minP).toLocaleString()} MAD</text>
        <text x={W - PAD} y={H - 10} fontSize="10" fill="#94a3b8" textAnchor="end">{Math.round(maxP).toLocaleString()} MAD</text>
        <text x={W / 2} y={H - 2} fontSize="10" fill="#94a3b8" textAnchor="middle">Prix (MAD)</text>

        {sample.map((d, i) => (
          <circle
            key={i}
            cx={toX(d.price)}
            cy={toY(d.cluster, i)}
            r="5"
            fill={`url(#grd-${d.cluster.replace(/\s/g, '')})`}
            stroke={getColor(d.cluster)}
            strokeWidth="0.5"
            strokeOpacity="0.4"
          >
            <title>{d.title} — {d.price?.toLocaleString()} MAD ({d.cluster})</title>
          </circle>
        ))}
      </svg>

      <div className="pip-scatter-legend">
        {clusters.map((c, i) => (
          <div key={i} className="pip-legend-item">
            <span className="pip-legend-dot" style={{ background: getColor(c), boxShadow: `0 0 6px ${getColor(c)}60` }} />
            <span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClusteringTab() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [algo, setAlgo]             = useState('kmeans');
  const [eps, setEps]               = useState(2.0);
  const [minSamples, setMinSamples] = useState(30);
  const [pcaData, setPcaData]       = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getClustering(algo, eps, minSamples)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    getPCA()
      .then(d => setPcaData(d.pca_scatter || []))
      .catch(() => setPcaData([]));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="pip-tab-inner">

      {/* ── En-tête ── */}
      <div className="pip-tab-header">
        <div>
          <h2 className="pip-tab-title">Clustering des offres</h2>
          <p className="pip-tab-subtitle">Segmentation intelligente par gamme de prix</p>
        </div>
        <div className="pip-header-icon pip-header-icon--purple">
          <BarChart2 size={20} />
        </div>
      </div>

      {/* ── Contrôles algo ── */}
      <div className="pip-section pip-controls-row">
        <label className="pip-control-label">
          Algorithme :
          <select
            className="pip-select"
            value={algo}
            onChange={e => setAlgo(e.target.value)}
          >
            <option value="kmeans">K-Means</option>
            <option value="dbscan">DBSCAN</option>
          </select>
        </label>

        {algo === 'dbscan' && (
          <>
            <label className="pip-control-label">
              Epsilon :
              <input
                type="number" step="0.5" min="0.5" max="10"
                className="pip-input-small"
                value={eps}
                onChange={e => setEps(parseFloat(e.target.value))}
              />
            </label>
            <label className="pip-control-label">
              Min samples :
              <input
                type="number" step="5" min="5" max="100"
                className="pip-input-small"
                value={minSamples}
                onChange={e => setMinSamples(parseInt(e.target.value))}
              />
            </label>
          </>
        )}

        <button className="pip-btn pip-btn-primary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'pip-spin' : ''} />
          {loading ? 'En cours…' : 'Relancer'}
        </button>
      </div>

      {loading && <div className="pip-loading"><span className="pip-spinner" />Clustering en cours…</div>}
      {error   && <div className="pip-error">Erreur : {error}</div>}

      {data && !loading && (
        <>
          {/* ── Info algo ── */}
          <div className="pip-algo-info">
            <span className="pip-badge pip-badge-blue">{data.algo?.toUpperCase()}</span>
            {data.best_k   && <span className="pip-badge pip-badge-green">k optimal = {data.best_k}</span>}
            {data.n_clusters && <span className="pip-badge pip-badge-purple">{data.n_clusters} clusters</span>}
          </div>

          {/* ── Résumé clusters ── */}
          {data.summary && data.summary.length > 0 && (
            <div className="pip-section">
              <h3 className="pip-section-title"><BarChart2 size={16} /> Résumé par cluster</h3>
              <div className="pip-cluster-cards">
                {data.summary.map((s, i) => (
                  <div key={i} className="pip-cluster-card" style={{ '--ccolor': getColor(s.cluster) }}>
                    <div className="pip-cluster-card-bar" style={{ background: getColor(s.cluster) }} />
                    <div className="pip-cluster-card-body">
                      <p className="pip-cluster-name">{s.cluster}</p>
                      <p className="pip-cluster-count">{s.count} produits</p>
                      <div className="pip-cluster-prices">
                        <div className="pip-cluster-price-item">
                          <span className="pip-cprice-label">Médiane</span>
                          <span className="pip-cprice-val" style={{ color: getColor(s.cluster) }}>
                            {s.median?.toLocaleString('fr-FR')} MAD
                          </span>
                        </div>
                        <div className="pip-cluster-price-item">
                          <span className="pip-cprice-label">Moy</span>
                          <span className="pip-cprice-val">{s.mean?.toLocaleString('fr-FR')} MAD</span>
                        </div>
                        <div className="pip-cluster-price-item">
                          <span className="pip-cprice-label">Min</span>
                          <span className="pip-cprice-val">{s.min?.toLocaleString('fr-FR')} MAD</span>
                        </div>
                        <div className="pip-cluster-price-item">
                          <span className="pip-cprice-label">Max</span>
                          <span className="pip-cprice-val">{s.max?.toLocaleString('fr-FR')} MAD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Scatter plot ── */}
          {data.scatter && data.scatter.length > 0 && (
            <div className="pip-section">
              <h3 className="pip-section-title">Distribution des prix par cluster</h3>
              <ScatterPlot data={data.scatter} />
            </div>
          )}

          {/* ── Radar ── */}
          {data.summary && data.summary.length > 0 && (
            <div className="pip-section">
              <h3 className="pip-section-title">🕸️ Radar — Profil des clusters</h3>
              <RadarChart data={data.summary} />
            </div>
          )}

          {/* ── PCA 2D ── */}
          {pcaData && pcaData.length > 0 && (
            <div className="pip-section">
              <h3 className="pip-section-title">🔬 PCA — Clusters projetés en 2D</h3>
              <PCAScatterChart data={pcaData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}