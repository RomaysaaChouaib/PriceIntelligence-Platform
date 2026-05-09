import React, { useState } from 'react';

/**
 * PCAScatterChart — Projection 2D des clusters via PCA
 * Données depuis l'API /api/pca/ → pca_scatter :
 * [{ x, y, cluster, title, price, brand }]
 *
 * Utilisation :
 *   <PCAScatterChart data={pcaData.pca_scatter} />
 */

const CLUSTER_COLORS = {
  'Entrée de gamme':      '#10b981',
  'Milieu de gamme bas':  '#3b82f6',
  'Milieu de gamme':      '#f59e0b',
  'Haut de gamme':        '#8b5cf6',
  'Premium':              '#ef4444',
  'Outlier':              '#64748b',
};

function getColor(cluster) {
  return CLUSTER_COLORS[cluster] || '#94a3b8';
}

export default function PCAScatterChart({ data = [] }) {
  const [tooltip, setTooltip]     = useState(null);
  const [activeCluster, setActive] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Données PCA non disponibles.
        Vérifiez que les features (RAM, stockage…) sont bien calculées en base.
      </div>
    );
  }

  // ── Dimensions ────────────────────────────────────────────────────────────
  const W    = 620;
  const H    = 380;
  const PAD  = 50;
  const CW   = W - PAD * 2;
  const CH   = H - PAD * 2;

  // ── Bornes ────────────────────────────────────────────────────────────────
  const xs   = data.map(d => d.x);
  const ys   = data.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const toSVGX = x => PAD + ((x - minX) / (maxX - minX || 1)) * CW;
  const toSVGY = y => PAD + CH - ((y - minY) / (maxY - minY || 1)) * CH;

  const clusters = [...new Set(data.map(d => d.cluster))];

  // Sample pour ne pas surcharger le SVG (max 600 points)
  const sample = data.length > 600
    ? data.filter((_, i) => i % Math.ceil(data.length / 600) === 0)
    : data;

  const filtered = activeCluster
    ? sample.filter(d => d.cluster === activeCluster)
    : sample;

  return (
    <div style={{ position: 'relative' }}>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
        Chaque point est un produit. Les axes PCA 1 & 2 résument les dimensions (prix, RAM, stockage).
        {data.length > 600 && ` (Affichage limité à 600 points sur ${data.length})`}
      </p>

      {/* ── Filtres cluster ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          onClick={() => setActive(null)}
          style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            background: !activeCluster ? '#0f172a' : '#f1f5f9',
            color: !activeCluster ? '#fff' : '#64748b',
            border: 'none',
          }}
        >
          Tous
        </button>
        {clusters.map((c, i) => (
          <button
            key={i}
            onClick={() => setActive(activeCluster === c ? null : c)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: activeCluster === c ? getColor(c) : '#f1f5f9',
              color: activeCluster === c ? '#fff' : '#64748b',
              border: `1px solid ${getColor(c)}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <svg
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', background: '#fafafa', borderRadius: 10 }}
      >
        {/* ── Grille ── */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <g key={i}>
            <line x1={PAD + t * CW} y1={PAD} x2={PAD + t * CW} y2={PAD + CH}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
            <line x1={PAD} y1={PAD + (1 - t) * CH} x2={PAD + CW} y2={PAD + (1 - t) * CH}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
          </g>
        ))}

        {/* ── Axes ── */}
        <line x1={PAD} y1={PAD + CH} x2={PAD + CW} y2={PAD + CH} stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + CH} stroke="#cbd5e1" strokeWidth="1.5" />

        <text x={PAD + CW / 2} y={H - 8} fontSize="11" fill="#94a3b8" textAnchor="middle">PCA Axe 1</text>
        <text x={14} y={PAD + CH / 2} fontSize="11" fill="#94a3b8" textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD + CH / 2})`}>PCA Axe 2</text>

        {/* ── Points ── */}
        {filtered.map((d, i) => (
          <circle
            key={i}
            cx={toSVGX(d.x)}
            cy={toSVGY(d.y)}
            r="4"
            fill={getColor(d.cluster)}
            fillOpacity={activeCluster && activeCluster !== d.cluster ? 0.1 : 0.65}
            stroke={tooltip?.i === i ? '#0f172a' : 'transparent'}
            strokeWidth="1.5"
            style={{ cursor: 'pointer' }}
            onMouseEnter={e => setTooltip({ d, i, svgX: toSVGX(d.x), svgY: toSVGY(d.y) })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* ── Tooltip SVG ── */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.svgX + 8, W - 200)}
              y={Math.max(tooltip.svgY - 50, 4)}
              width="195" height="62" rx="6"
              fill="#0f172a" fillOpacity="0.9"
            />
            <text x={Math.min(tooltip.svgX + 16, W - 192)} y={Math.max(tooltip.svgY - 34, 20)}
              fontSize="11" fill="#fff" fontWeight="600">
              {tooltip.d.title?.slice(0, 26) + (tooltip.d.title?.length > 26 ? '…' : '')}
            </text>
            <text x={Math.min(tooltip.svgX + 16, W - 192)} y={Math.max(tooltip.svgY - 18, 36)}
              fontSize="10" fill="#94a3b8">
              {tooltip.d.price?.toLocaleString('fr-FR')} MAD — {tooltip.d.cluster}
            </text>
            <text x={Math.min(tooltip.svgX + 16, W - 192)} y={Math.max(tooltip.svgY - 4, 52)}
              fontSize="10" fill="#64748b">
              {tooltip.d.brand || ''}
            </text>
          </g>
        )}
      </svg>

      {/* ── Légende ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
        {clusters.map((c, i) => {
          const count = data.filter(d => d.cluster === c).length;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(c), display: 'inline-block' }} />
              {c} <span style={{ color: '#94a3b8' }}>({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
