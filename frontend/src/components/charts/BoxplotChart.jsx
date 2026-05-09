import React from 'react';

/**
 * BoxplotChart — Boîte à moustaches (Boxplot) SVG pur
 * Données attendues depuis l'API Django /api/stats/ → by_source (ou by_platform) :
 * [{ source: "Jumia", min, q1, median, q3, max, mean, count }, ...]
 *
 * Utilisation :
 *   <BoxplotChart data={statsData.by_source} />
 */

const COLORS = {
  jumia:      { box: '#3b82f6', whisker: '#1d4ed8', fill: '#dbeafe' },
  amazon:     { box: '#f97316', whisker: '#c2410c', fill: '#ffedd5' },
  aliexpress: { box: '#10b981', whisker: '#047857', fill: '#d1fae5' },
  ebay:       { box: '#8b5cf6', whisker: '#6d28d9', fill: '#ede9fe' },
  avito:      { box: '#f59e0b', whisker: '#b45309', fill: '#fef3c7' },
  default:    { box: '#64748b', whisker: '#475569', fill: '#f1f5f9' },
};

function getColor(source = '') {
  return COLORS[source.toLowerCase()] || COLORS.default;
}

export default function BoxplotChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Données insuffisantes pour le Boxplot.
      </div>
    );
  }

  // ── Dimensions ────────────────────────────────────────────────────────────
  const W          = 680;
  const H          = 340;
  const PAD_L      = 70;  // axe Y
  const PAD_R      = 20;
  const PAD_T      = 20;
  const PAD_B      = 60;  // labels X
  const CHART_W    = W - PAD_L - PAD_R;
  const CHART_H    = H - PAD_T - PAD_B;
  const BOX_W      = Math.min(50, CHART_W / data.length - 20);

  // ── Échelle Y ─────────────────────────────────────────────────────────────
  const allValues  = data.flatMap(d => [d.min, d.max].filter(Boolean));
  const minVal     = Math.min(...allValues) * 0.95;
  const maxVal     = Math.max(...allValues) * 1.05;
  const range      = maxVal - minVal || 1;

  const toY = v => PAD_T + CHART_H - ((v - minVal) / range) * CHART_H;

  // ── Graduations axe Y ─────────────────────────────────────────────────────
  const ticks = 5;
  const tickStep = range / ticks;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => minVal + i * tickStep);

  // ── Position X par source ─────────────────────────────────────────────────
  const slotW = CHART_W / data.length;
  const centerX = i => PAD_L + slotW * i + slotW / 2;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>

        {/* ── Grille ── */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD_L} y1={toY(tick)}
              x2={W - PAD_R} y2={toY(tick)}
              stroke="#f1f5f9" strokeWidth="1"
            />
            <text
              x={PAD_L - 8} y={toY(tick) + 4}
              fontSize="10" fill="#94a3b8" textAnchor="end"
            >
              {Math.round(tick / 1000)}k
            </text>
          </g>
        ))}

        {/* ── Axe Y label ── */}
        <text
          x={14} y={PAD_T + CHART_H / 2}
          fontSize="10" fill="#64748b" textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD_T + CHART_H / 2})`}
        >
          Prix (MAD)
        </text>

        {/* ── Axe X ── */}
        <line
          x1={PAD_L} y1={PAD_T + CHART_H}
          x2={W - PAD_R} y2={PAD_T + CHART_H}
          stroke="#e2e8f0" strokeWidth="1"
        />

        {/* ── Boxplots ── */}
        {data.map((d, i) => {
          const cx       = centerX(i);
          const c        = getColor(d.source);
          const yMin     = toY(d.min);
          const yQ1      = toY(d.q1);
          const yMedian  = toY(d.median);
          const yMean    = toY(d.mean);
          const yQ3      = toY(d.q3);
          const yMax     = toY(d.max);
          const halfBox  = BOX_W / 2;
          const halfCap  = BOX_W * 0.3;

          return (
            <g key={i}>
              {/* Moustache haute (Q3 → max) */}
              <line x1={cx} y1={yMax} x2={cx} y2={yQ3} stroke={c.whisker} strokeWidth="1.5" strokeDasharray="3,2" />
              <line x1={cx - halfCap} y1={yMax} x2={cx + halfCap} y2={yMax} stroke={c.whisker} strokeWidth="1.5" />

              {/* Boîte (Q1 → Q3) */}
              <rect
                x={cx - halfBox} y={yQ3}
                width={BOX_W} height={yQ1 - yQ3}
                fill={c.fill} stroke={c.box} strokeWidth="1.5" rx="3"
              />

              {/* Médiane */}
              <line x1={cx - halfBox} y1={yMedian} x2={cx + halfBox} y2={yMedian}
                stroke={c.box} strokeWidth="2.5" />

              {/* Moyenne (losange) */}
              <polygon
                points={`${cx},${yMean - 5} ${cx + 5},${yMean} ${cx},${yMean + 5} ${cx - 5},${yMean}`}
                fill={c.box} opacity="0.7"
              />

              {/* Moustache basse (min → Q1) */}
              <line x1={cx} y1={yQ1} x2={cx} y2={yMin} stroke={c.whisker} strokeWidth="1.5" strokeDasharray="3,2" />
              <line x1={cx - halfCap} y1={yMin} x2={cx + halfCap} y2={yMin} stroke={c.whisker} strokeWidth="1.5" />

              {/* Tooltip valeur médiane */}
              <text x={cx} y={yMedian - 6} fontSize="9" fill={c.box} textAnchor="middle" fontWeight="600">
                {Math.round(d.median / 1000)}k
              </text>

              {/* Label plateforme */}
              <text
                x={cx} y={PAD_T + CHART_H + 20}
                fontSize="11" fill="#374151" textAnchor="middle" fontWeight="500"
              >
                {d.source}
              </text>
              <text
                x={cx} y={PAD_T + CHART_H + 34}
                fontSize="10" fill="#94a3b8" textAnchor="middle"
              >
                ({d.count} offres)
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Légende ── */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: '#64748b' }}>
        <span>▬ Médiane</span>
        <span>◆ Moyenne</span>
        <span style={{ color: '#94a3b8' }}>╌ Moustaches (min / max)</span>
        <span style={{ marginLeft: 'auto' }}>
          Boîte = Q1–Q3 (50% des offres)
        </span>
      </div>
    </div>
  );
}
