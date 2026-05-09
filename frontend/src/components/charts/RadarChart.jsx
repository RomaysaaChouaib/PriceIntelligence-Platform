import React, { useState } from 'react';

/**
 * RadarChart — Graphique radar SVG pur
 * Affiche le profil de chaque cluster sur plusieurs axes (prix, RAM, stockage…)
 *
 * Données attendues depuis l'API /api/clustering/ → summary :
 * [{ cluster: "Haut de gamme", median, mean, ram_gb, storage_gb, count, ... }]
 *
 * Utilisation :
 *   <RadarChart data={clusteringData.summary} />
 */

const CLUSTER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4',
];

// ── Axes du radar ──────────────────────────────────────────────────────────
const AXES = [
  { key: 'median',      label: 'Prix médian',   unit: 'MAD'  },
  { key: 'ram_gb',      label: 'RAM',           unit: 'Go'   },
  { key: 'storage_gb',  label: 'Stockage',      unit: 'Go'   },
  { key: 'count',       label: 'Nb offres',     unit: ''     },
  { key: 'mean',        label: 'Prix moyen',    unit: 'MAD'  },
];

// ── Coordonnées polaires → cartésiennes ──────────────────────────────────
function polarToXY(cx, cy, r, angleRad) {
  return {
    x: cx + r * Math.cos(angleRad - Math.PI / 2),
    y: cy + r * Math.sin(angleRad - Math.PI / 2),
  };
}

// ── Normalise une valeur entre 0 et 1 sur l'axe ──────────────────────────
function normalize(value, min, max) {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export default function RadarChart({ data = [] }) {
  const [hoveredCluster, setHoveredCluster] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Aucune donnée de clustering disponible pour le radar.
      </div>
    );
  }

  // Filtrer les axes pour lesquels on a des données réelles
  const activeAxes = AXES.filter(a =>
    data.some(d => d[a.key] != null && d[a.key] > 0)
  );
  const N = activeAxes.length;
  if (N < 3) return <div style={{ color: '#94a3b8', padding: 20, fontSize: 13 }}>Pas assez d'axes pour le radar (minimum 3).</div>;

  // Min / max par axe pour normalisation
  const ranges = {};
  activeAxes.forEach(a => {
    const vals = data.map(d => d[a.key] || 0);
    ranges[a.key] = { min: Math.min(...vals), max: Math.max(...vals) };
  });

  // ── Dimensions SVG ──────────────────────────────────────────────────────
  const W      = 500;
  const H      = 420;
  const CX     = W / 2;
  const CY     = 200;
  const R      = 140;
  const LEVELS = 5;

  // ── Angles des axes ──────────────────────────────────────────────────────
  const angles = activeAxes.map((_, i) => (2 * Math.PI * i) / N);

  // ── Points d'un cluster normalisé ────────────────────────────────────────
  function clusterPoints(d) {
    return activeAxes.map((a, i) => {
      const norm = normalize(d[a.key] || 0, ranges[a.key].min, ranges[a.key].max);
      return polarToXY(CX, CY, norm * R, angles[i]);
    });
  }

  function pointsToPath(pts) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
  }

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>

        {/* ── Niveaux de grille ── */}
        {Array.from({ length: LEVELS }, (_, lvl) => {
          const r = (R * (lvl + 1)) / LEVELS;
          const pts = activeAxes.map((_, i) => polarToXY(CX, CY, r, angles[i]));
          const path = pointsToPath(pts);
          return (
            <path key={lvl} d={path} fill="none" stroke="#e2e8f0" strokeWidth="1" />
          );
        })}

        {/* ── Axes ── */}
        {activeAxes.map((a, i) => {
          const outer = polarToXY(CX, CY, R + 16, angles[i]);
          const end   = polarToXY(CX, CY, R, angles[i]);
          const label = polarToXY(CX, CY, R + 34, angles[i]);

          return (
            <g key={i}>
              <line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#cbd5e1" strokeWidth="1" />
              <text
                x={label.x} y={label.y + 4}
                fontSize="10" fill="#475569" textAnchor="middle" fontWeight="500"
              >
                {a.label}
              </text>
            </g>
          );
        })}

        {/* ── Polygones des clusters ── */}
        {data.map((d, i) => {
          const pts      = clusterPoints(d);
          const path     = pointsToPath(pts);
          const color    = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
          const isHover  = hoveredCluster === d.cluster;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredCluster(d.cluster)}
              onMouseLeave={() => setHoveredCluster(null)}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={path}
                fill={color}
                fillOpacity={isHover ? 0.35 : 0.12}
                stroke={color}
                strokeWidth={isHover ? 2.5 : 1.5}
              />
              {/* Points aux sommets */}
              {pts.map((p, j) => (
                <circle key={j} cx={p.x} cy={p.y} r={isHover ? 4 : 3}
                  fill={color} fillOpacity={0.9} />
              ))}
            </g>
          );
        })}

        {/* ── Centre ── */}
        <circle cx={CX} cy={CY} r="3" fill="#e2e8f0" />

        {/* ── Légende ── */}
        {data.map((d, i) => {
          const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
          const y = H - 20 - (data.length - i - 1) * 22;
          const isHover = hoveredCluster === d.cluster;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredCluster(d.cluster)}
              onMouseLeave={() => setHoveredCluster(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect x={20} y={y - 11} width={14} height={14} rx="3" fill={color} fillOpacity={isHover ? 1 : 0.7} />
              <text x={40} y={y} fontSize="11" fill={isHover ? '#0f172a' : '#475569'} fontWeight={isHover ? '600' : '400'}>
                {d.cluster} — {d.count} offres — médiane {d.median?.toLocaleString('fr-FR')} MAD
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
