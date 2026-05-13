import React, { useEffect, useState } from 'react';
// ❌ SUPPRIMER CETTE LIGNE (chemin probablement incorrect) :
// import { getAnomalies } from '../../services/api';

import { AlertTriangle, TrendingDown, TrendingUp, Filter, ShieldAlert, Activity, Search, BarChart3 } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════
// ✅ HELPERS LOCAUX (remplacent l'import cassé)
// ══════════════════════════════════════════════════════════════════
const API = "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Badge méthode — DESIGN MINIMALISTE GÉOMÉTRIQUE (INCHANGÉ) ──────────────────────────
function MethodBadge({ name, count, pct, color }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? color : 'var(--surface)',
        borderRadius: '4px',
        padding: '20px',
        border: `1px solid ${hovered ? color : 'var(--border)'}`,
        transition: 'all 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Accent bar left */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '3px',
        background: color,
        opacity: hovered ? 0 : 1,
        transition: 'opacity 0.25s ease'
      }} />

      <p style={{
        fontSize: '10px',
        fontWeight: 700,
        color: hovered ? 'rgba(255,255,255,0.6)' : 'var(--text3)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        margin: '0 0 12px 8px'
      }}>
        {name}
      </p>

      <p style={{
        fontSize: '48px',
        fontWeight: 800,
        color: hovered ? '#fff' : color,
        margin: '0 0 8px 8px',
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1,
        transition: 'color 0.25s ease'
      }}>
        {count}
      </p>

      <p style={{
        fontSize: '12px',
        fontWeight: 600,
        color: hovered ? 'rgba(255,255,255,0.75)' : 'var(--text3)',
        margin: '0 0 0 8px',
        transition: 'color 0.25s ease'
      }}>
        {pct}% du dataset
      </p>
    </div>
  );
}

const METHOD_COLORS = {
  'IQR':              '#f59e0b',
  'Z-score':          '#3b82f6',
  'Isolation Forest': '#ef4444',
  'LOF':              '#8b5cf6',
};

// ── Petite pastille de statut animée (INCHANGÉE) ─────────────────────────────────────────
function PulseDot({ color }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 0 0 ${color}`,
      animation: 'ripple 1.8s ease-out infinite',
      flexShrink: 0
    }} />
  );
}

// ══════════════════════════════════════════════════════════════════
// ✅ COMPOSANT PRINCIPAL — NOM CORRECT + apiFetch LOCAL
// ══════════════════════════════════════════════════════════════════
export default function AnomaliesTab() {  // ✅ NOM DOIT ÊTRE EXACTEMENT "AnomaliesTab"
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all');

  // ✅ REMPLACER getAnomalies() PAR apiFetch('/anomalies/')
  useEffect(() => {
    apiFetch("/anomalies/")  // ✅ Utilise la fonction locale définie plus haut
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── États de chargement / erreur (INCHANGÉS) ── */
  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '400px', gap: 16,
      color: 'var(--text3)'
    }}>
      <div style={{
        width: 40, height: 40,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
        Analyse des anomalies…
      </p>
      <p style={{ margin: 0, fontSize: '12px' }}>Algorithmes de Machine Learning</p>
    </div>
  );

  if (error) return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '20px 24px',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderLeft: '4px solid #ef4444',
      borderRadius: '4px',
      color: '#991b1b'
    }}>
      <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px', color: '#dc2626' }}>
          Erreur de chargement
        </p>
        <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  const { summary = [], anomalies = [], total } = data;
  const filtered = filter === 'all' ? anomalies : anomalies.filter(a => a.price_category === filter);
  const categories = [...new Set(anomalies.map(a => a.price_category).filter(Boolean))];

  const CAT_COLORS = {
    'entrée_de_gamme':       '#10b981',
    'milieu_de_gamme_bas':   '#3b82f6',
    'milieu_de_gamme':       '#f59e0b',
    'haut_de_gamme':         '#8b5cf6',
    'premium':               '#ef4444'
  };

  /* ── Render principal (TOUT CONSERVÉ — DESIGN EXACT) ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

      {/* ══ BANDE SUPÉRIEURE — 3 métriques clés ══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1px',
        background: 'var(--border)',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid var(--border)'
      }}>
        {/* Anomalies uniques */}
        <div style={{
          background: 'var(--surface)',
          padding: '24px 28px',
          display: 'flex', flexDirection: 'column', gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={15} color="#ef4444" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Anomalies uniques
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '44px', fontWeight: 800, color: '#dc2626', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
            {total}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text3)' }}>
            sur <strong style={{ color: 'var(--text2)' }}>{anomalies.length}</strong> détectées
          </p>
        </div>

        {/* IQR */}
        <div style={{ background: 'var(--surface)', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={15} color="#f59e0b" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>IQR</span>
          </div>
          <p style={{ margin: 0, fontSize: '44px', fontWeight: 800, color: '#d97706', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
            {summary.find(m => m.methode === 'IQR')?.anomalies ?? 0}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text3)' }}>
            <strong style={{ color: 'var(--text2)' }}>{summary.find(m => m.methode === 'IQR')?.pourcentage ?? 0}%</strong> du dataset
          </p>
        </div>

        {/* Isolation Forest */}
        <div style={{ background: 'var(--surface)', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="#ef4444" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Isolation Forest</span>
          </div>
          <p style={{ margin: 0, fontSize: '44px', fontWeight: 800, color: '#dc2626', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
            {summary.find(m => m.methode === 'Isolation Forest')?.anomalies ?? 0}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text3)' }}>
            <strong style={{ color: 'var(--text2)' }}>{summary.find(m => m.methode === 'Isolation Forest')?.pourcentage ?? 0}%</strong> du dataset
          </p>
        </div>
      </div>

      {/* ══ RÉSUMÉ PAR MÉTHODE ══ */}
      {summary.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '24px',
          width: '100%'
        }}>
          {/* En-tête section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px' }}>
            <Filter size={16} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Comparaison des méthodes
            </h3>
          </div>

          {/* Grille méthodes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
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

          {/* Note explicative */}
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            background: 'var(--surface2)',
            borderRadius: '4px',
            borderLeft: '3px solid var(--accent2)',
            fontSize: '12.5px',
            color: 'var(--text2)',
            lineHeight: 1.7
          }}>
            <strong style={{ color: 'var(--text)' }}>Isolation Forest</strong> et <strong>LOF</strong> — méthodes <strong>multivariées</strong> (prix, RAM, stockage).
            {' '}<strong style={{ color: 'var(--text)' }}>IQR</strong> et <strong>Z-score</strong> — méthodes <strong>univariées</strong> basées sur la distribution statistique des prix.
          </div>
        </div>
      )}

      {/* ══ FILTRES PAR GAMME ══ */}
      {categories.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '16px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '14px' }}>
            <Search size={14} color="var(--text3)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Filtrer par gamme
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Bouton Tous */}
            <FilterChip
              label="Tous"
              count={anomalies.length}
              active={filter === 'all'}
              color="var(--accent)"
              onClick={() => setFilter('all')}
            />
            {categories.map((cat, i) => (
              <FilterChip
                key={i}
                label={cat.replace(/_/g, ' ')}
                count={anomalies.filter(a => a.price_category === cat).length}
                active={filter === cat}
                color={CAT_COLORS[cat] || '#64748b'}
                onClick={() => setFilter(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══ TABLE DES ANOMALIES ══ */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '24px',
        width: '100%'
      }}>
        {/* En-tête */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px', flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={16} color="#f97316" />
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Produits suspects
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text3)' }}>
                {filtered.length} anomalie{filtered.length > 1 ? 's' : ''} détectée{filtered.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Badge d'état */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px',
            background: 'var(--surface2)',
            borderRadius: '4px',
            border: '1px solid var(--border)'
          }}>
            <PulseDot color={filtered.length > 0 ? '#ef4444' : '#10b981'} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
              {filtered.length > 0 ? 'Alertes actives' : 'Aucune alerte'}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            border: '1px dashed var(--border)',
            borderRadius: '4px',
            color: 'var(--text3)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
              Aucune anomalie
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
              Tous les prix sont conformes aux normes statistiques.
            </p>
          </div>
        ) : (
          /* Table */
          <div style={{ overflowX: 'auto', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
                  {['Produit', 'Marque', 'Prix', 'Gamme', 'Alerte'].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 16px',
                      textAlign: i === 2 ? 'right' : i === 4 ? 'center' : 'left',
                      fontWeight: 700,
                      fontSize: '11px',
                      color: 'var(--text3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      whiteSpace: 'nowrap'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const isLow = a.price < 3000;
                  const alert = isLow
                    ? { bg: '#fffbeb', color: '#b45309', icon: TrendingDown, text: 'Prix bas',   border: '#fcd34d' }
                    : { bg: '#fef2f2', color: '#dc2626', icon: TrendingUp,   text: 'Prix élevé', border: '#fca5a5' };

                  return (
                    <AnomalyRow key={i} a={a} i={i} alert={alert} />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Animation keyframes (INCHANGÉ) */}
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes ripple  { 0%   { box-shadow: 0 0 0 0 currentColor; }
                             70%  { box-shadow: 0 0 0 6px transparent; }
                             100% { box-shadow: 0 0 0 0 transparent; } }
      `}</style>
    </div>
  );
}

/* ── Chip de filtre (INCHANGÉ) ─────────────────────────────────────────────────────────── */
function FilterChip({ label, count, active, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '7px 14px',
        borderRadius: '4px',
        border: `1px solid ${active ? color : hovered ? color : 'var(--border)'}`,
        background: active ? color : 'transparent',
        color: active ? '#fff' : hovered ? color : 'var(--text2)',
        fontSize: '12px', fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s ease',
        boxShadow: active ? `0 2px 8px ${color}30` : 'none'
      }}
    >
      {label}
      <span style={{
        padding: '1px 7px',
        borderRadius: '10px',
        background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface2)',
        color: active ? '#fff' : 'var(--text3)',
        fontSize: '11px', fontWeight: 700
      }}>
        {count}
      </span>
    </button>
  );
}

/* ── Ligne d'anomalie (INCHANGÉE) ───────────────────────────────────────────────────────── */
function AnomalyRow({ a, i, alert }) {
  const [hovered, setHovered] = useState(false);
  const Icon = alert.icon;
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--border)',
        background: hovered ? `${alert.bg}` : i % 2 === 0 ? 'transparent' : 'var(--surface2)',
        transition: 'background 0.15s ease'
      }}
    >
      <td style={{
        padding: '14px 16px', maxWidth: '280px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: 'var(--text)', fontWeight: 600
      }}>
        {a.title}
      </td>
      <td style={{ padding: '14px 16px', color: 'var(--text2)' }}>
        {a.brand_detected || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>—</span>}
      </td>
      <td style={{
        padding: '14px 16px', textAlign: 'right',
        fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
        color: 'var(--text)', whiteSpace: 'nowrap'
      }}>
        {a.price?.toLocaleString('fr-FR')}
        <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 400, marginLeft: 4 }}>MAD</span>
      </td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '4px',
          background: alert.bg,
          color: alert.color,
          fontSize: '11px', fontWeight: 700,
          border: `1px solid ${alert.border}`
        }}>
          {a.price_category?.replace(/_/g, ' ') || '—'}
        </span>
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
          borderRadius: '4px',
          background: alert.bg,
          color: alert.color,
          border: `1px solid ${alert.border}`,
          fontSize: '12px', fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          <Icon size={14} />
          {alert.text}
        </span>
      </td>
    </tr>
  );
}