import React, { useEffect, useState } from 'react';
import { getAssociation, getAssociationAccessories } from '../../services/api';
import { Link2, ArrowRight, ShoppingBag, Zap, TrendingUp, Search, Filter, SlidersHorizontal, Sparkles } from 'lucide-react';

// ── Barre de confiance ───────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const color = value > 0.8 ? '#10b981' : value > 0.6 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="pip-conf-bar-bg" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      width: '120px', 
      height: '22px', 
      background: 'var(--surface2)', 
      borderRadius: '8px', 
      overflow: 'hidden', 
      position: 'relative',
      border: '1px solid var(--border)',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div
        className="pip-conf-bar-fill"
        style={{ 
          width: `${value * 100}%`, 
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          height: '100%',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: `0 0 10px ${color}40`
        }}
      />
      <span className="pip-conf-label" style={{ 
        fontSize: '10px', 
        color: 'var(--text)', 
        fontWeight: 700, 
        position: 'absolute', 
        right: '8px',
        zIndex: 2,
        textShadow: '0 1px 2px rgba(255,255,255,0.8)'
      }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function LiftBadge({ lift }) {
  const config = lift >= 2 
    ? { color: '#10b981', bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' } 
    : lift >= 1.5 
      ? { color: '#b45309', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' } 
      : { color: '#64748b', bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#94a3b8', glow: 'rgba(100, 116, 139, 0.2)' };
  
  return (
    <span className="pip-lift-badge" style={{ 
      fontSize: '11px', 
      fontWeight: 700, 
      padding: '6px 12px', 
      borderRadius: '14px', 
      border: `1px solid ${config.border}`,
      background: config.bg,
      color: config.color,
      fontFamily: "'JetBrains Mono', monospace",
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      boxShadow: `0 2px 8px ${config.glow}`,
      transition: 'transform 0.15s, box-shadow 0.15s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 4px 16px ${config.glow}`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = `0 2px 8px ${config.glow}`;
    }}
    >
      <TrendingUp size={12} />
      ×{lift?.toFixed(2)}
    </span>
  );
}

// ── Tableau de règles réutilisable ───────────────────────────────────────────
function RulesTable({ rules, sortBy, filterText }) {
  const filtered = rules
    .filter(r =>
      !filterText ||
      r.antecedent?.toLowerCase().includes(filterText.toLowerCase()) ||
      r.consequent?.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => b[sortBy] - a[sortBy]);

  if (filtered.length === 0)
    return <div className="pip-empty" style={{ 
      textAlign: 'center', 
      color: 'var(--text3)', 
      padding: '50px 24px',
      fontSize: '14px',
      background: 'var(--surface2)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border)'
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>🔍</div>
      Aucune règle trouvée pour ce filtre.
    </div>;

  return (
    <div className="pip-table-wrapper" style={{ 
      overflowX: 'auto', 
      borderRadius: 'var(--radius-lg)',
      width: '100%',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)'
    }}>
      <table className="pip-table" style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        fontSize: '13px'
      }}>
        <thead>
          <tr style={{
            background: 'linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%)',
            borderBottom: '2px solid var(--border)'
          }}>
            <th style={{ 
              padding: '14px 16px', 
              textAlign: 'left', 
              fontWeight: 700, 
              color: 'var(--text)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: 'none'
            }}>Si (antécédent)</th>
            <th style={{ 
              padding: '14px 16px', 
              textAlign: 'center', 
              fontWeight: 700, 
              color: 'var(--text)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: 'none'
            }}></th>
            <th style={{ 
              padding: '14px 16px', 
              textAlign: 'left', 
              fontWeight: 700, 
              color: 'var(--text)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: 'none'
            }}>Alors (conséquent)</th>
            <th style={{ 
              padding: '14px 16px', 
              textAlign: 'center', 
              fontWeight: 700, 
              color: 'var(--text)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: 'none'
            }}>Support</th>
            <th style={{ 
              padding: '14px 16px', 
              textAlign: 'center', 
              fontWeight: 700, 
              color: 'var(--text)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: 'none'
            }}>Confiance</th>
            <th style={{ 
              padding: '14px 16px', 
              textAlign: 'center', 
              fontWeight: 700, 
              color: 'var(--text)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: 'none'
            }}>Lift</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 50).map((r, i) => (
            <tr 
              key={i} 
              className={i % 2 === 0 ? 'pip-row-even' : ''} 
              style={{ 
                borderBottom: '1px solid var(--border)',
                background: i % 2 === 0 ? 'transparent' : 'var(--surface2)',
                transition: 'background 0.15s, transform 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface)';
                e.currentTarget.style.transform = 'scale(1.01)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--surface2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <td className="pip-rule-ant" style={{ 
                padding: '14px 16px', 
                color: 'var(--text2)',
                fontSize: '12px',
                fontWeight: 500
              }}>{r.antecedent}</td>
              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                <ArrowRight size={14} color="#94a3b8" style={{ opacity: 0.7 }} />
              </td>
              <td className="pip-rule-cons" style={{ 
                padding: '14px 16px', 
                color: 'var(--accent2)', 
                fontWeight: 600,
                fontSize: '12px'
              }}>{r.consequent}</td>
              <td style={{ 
                padding: '14px 16px', 
                textAlign: 'center',
                color: 'var(--text)',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600
              }}>{(r.support * 100).toFixed(1)}%</td>
              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                <ConfidenceBar value={r.confidence} />
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                <LiftBadge lift={r.lift} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 50 && (
        <p className="pip-more-note" style={{ 
          fontSize: '12px', 
          color: 'var(--text3)', 
          padding: '16px',
          textAlign: 'center',
          background: 'var(--surface2)',
          borderRadius: '0 0 var(--radius) var(--radius)',
          margin: 0,
          borderTop: '1px solid var(--border)'
        }}>
          Affichage limité à <strong>50 règles</strong> sur {filtered.length}. Utilisez le filtre pour affiner.
        </p>
      )}
    </div>
  );
}

export default function AssociationTab() {
  const [laptopData,  setLaptopData]  = useState(null);
  const [accData,     setAccData]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingAcc,  setLoadingAcc]  = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('laptops');
  const [sortBy,      setSortBy]      = useState('lift');
  const [filterText,  setFilterText]  = useState('');

  useEffect(() => {
    getAssociation()
      .then(setLaptopData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    getAssociationAccessories()
      .then(setAccData)
      .catch(() => setAccData(null))
      .finally(() => setLoadingAcc(false));
  }, []);

  if (loading) return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px', 
      color: 'var(--text3)',
      fontSize: '14px',
      minHeight: '300px',
      width: '100%',
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)'
    }}>
      <div style={{ 
        width: '48px',
        height: '48px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent2)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '20px',
        boxShadow: '0 0 20px var(--accent2)30'
      }} />
      <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>
        Extraction des règles d'association…
      </p>
      <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text3)' }}>
        Algorithme Apriori en cours d'exécution
      </p>
    </div>
  );
  
  if (error) return (
    <div style={{ 
      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
      border: '2px solid #fecaca',
      borderLeft: `5px solid #ef4444`,
      color: '#991b1b', 
      padding: '20px 24px', 
      borderRadius: 'var(--radius-lg)', 
      fontSize: '14px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      width: '100%',
      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15)'
    }}>
      <div style={{ 
        width: 32, 
        height: 32, 
        borderRadius: '10px', 
        background: '#fef2f2', 
        display: 'grid', 
        placeItems: 'center',
        border: '1px solid #fecaca',
        flexShrink: 0
      }}>
        ⚠️
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#dc2626' }}>
          Erreur de chargement
        </p>
        <p style={{ margin: '4px 0 0', opacity: 0.9, lineHeight: 1.5 }}>{error}</p>
      </div>
    </div>
  );

  const laptopRules = laptopData?.rules || [];
  const accRules    = accData?.rules_accessories || [];
  const crossRules  = accData?.rules_cross || [];

  return (
    <div className="pip-tab-inner" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '28px', 
      width: '100%',
      padding: '4px 0'
    }}>

      {/* ── En-tête ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, #1e293b 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        width: '100%',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--accent2), #60a5fa)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
          }}>
            <Link2 size={26} color="#fff" />
          </div>
          <div>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: 700, 
              color: '#fff',
              margin: '0 0 4px',
              letterSpacing: '-0.3px'
            }}>
              Règles d'association
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#94a3b8',
              margin: 0
            }}>
              Algorithme Apriori — Laptops & Accessoires
            </p>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}>
          <span style={{
            padding: '6px 12px',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#93c5fd'
          }}>
            support ≥ 5%
          </span>
          <span style={{
            padding: '6px 12px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#6ee7b7'
          }}>
            confiance ≥ 50%
          </span>
          <span style={{
            padding: '6px 12px',
            background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#c4b5fd'
          }}>
            lift ≥ 1.0
          </span>
        </div>
      </div>

      {/* ── Explication ── */}
      <div className="pip-section pip-info-box" style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1px solid #bfdbfe',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <p style={{ 
          fontSize: '13px', 
          color: '#1e40af', 
          lineHeight: 1.7,
          margin: 0,
          position: 'relative',
          zIndex: 1
        }}>
          Les règles d'association révèlent les liens entre caractéristiques produits et gammes de prix.<br />
          Ex : <strong style={{ color: '#1e40af' }}>marque=HP ∧ gaming=true → haut_de_gamme</strong> avec confiance 85%.
        </p>
        <div className="pip-legend-row" style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 16, 
          marginTop: '16px', 
          fontSize: '12px', 
          color: '#3b82f6',
          position: 'relative',
          zIndex: 1
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            fontWeight: 500
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
            <strong>Support</strong> = fréquence dans les données
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px',
            fontWeight: 500
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <strong>Confiance</strong> = P(conséquent | antécédent)
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '8px',
            fontWeight: 500
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
            <strong>Lift</strong> = force de la règle (&gt;1 = positive)
          </span>
        </div>
      </div>

      {/* ── Onglets internes — BOUTONS AMÉLIORÉS ── */}
      <div className="pip-section" style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 16px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        width: '100%'
      }}>
        <div className="pip-inner-tabs" style={{ 
          display: 'flex', 
          gap: 8, 
          flexWrap: 'wrap',
          width: '100%'
        }}>
          {[
            { key: 'laptops', label: `Laptops`, count: laptopRules.length, icon: Zap, color: '#3b82f6' },
            { key: 'accessories', label: `Accessoires`, count: accRules.length, icon: ShoppingBag, color: '#10b981' },
            { key: 'cross', label: `Croisées`, count: crossRules.length, icon: Link2, color: '#8b5cf6' },
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className={`pip-inner-tab${isActive ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: isActive 
                    ? `2px solid ${tab.color}` 
                    : '2px solid transparent',
                  background: isActive 
                    ? `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)` 
                    : 'var(--surface2)',
                  color: isActive ? '#fff' : 'var(--text2)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: '140px',
                  justifyContent: 'center',
                  boxShadow: isActive 
                    ? `0 4px 16px ${tab.color}40, 0 2px 8px rgba(0,0,0,0.1)` 
                    : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--surface)';
                    e.currentTarget.style.borderColor = tab.color;
                    e.currentTarget.style.color = tab.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--surface2)';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = isActive ? 'translateY(0)' : 'translateY(-2px)';
                }}
              >
                {/* Effet de brillance au hover */}
                {!isActive && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, transparent, ${tab.color}20, transparent)`,
                    transition: 'left 0.5s',
                    pointerEvents: 'none'
                  }} 
                  onMouseEnter={(e) => {
                    e.currentTarget.style.left = '100%';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.left = '-100%';
                  }}
                  />
                )}
                
                <tab.icon size={16} style={{ 
                  transition: 'transform 0.2s',
                  filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                }} />
                {tab.label}
                <span style={{
                  padding: '2px 10px',
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'background 0.2s'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contrôles ── */}
      <div className="pip-controls-row pip-section" style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        width: '100%'
      }}>
        {/* Search Input */}
        <div style={{
          flex: 1,
          minWidth: '200px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '14px', 
            color: 'var(--text3)',
            zIndex: 1
          }} />
          <input
            type="text"
            className="pip-search-input"
            placeholder="Rechercher une règle…"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              border: '2px solid var(--border)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'all 0.2s',
              background: 'var(--surface2)',
              color: 'var(--text)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent2)';
              e.target.style.background = 'var(--surface)';
              e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.background = 'var(--surface2)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        {/* Sort Select */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          background: 'var(--surface2)',
          borderRadius: '12px',
          border: '2px solid var(--border)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent2)';
          e.currentTarget.style.background = 'var(--surface)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'var(--surface2)';
        }}
        >
          <SlidersHorizontal size={16} style={{ color: 'var(--text3)' }} />
          <label className="pip-control-label" style={{ 
            fontSize: '13px', 
            color: 'var(--text2)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            Trier :
            <select
              className="pip-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '13px',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.15s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent2)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="lift">🚀 Lift ↓</option>
              <option value="confidence">🎯 Confiance ↓</option>
              <option value="support">📊 Support ↓</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Contenu selon onglet ── */}
      {activeTab === 'laptops' && (
        <div className="pip-section" style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          width: '100%',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid var(--border)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent2), #60a5fa)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <Zap size={20} color="#fff" />
            </div>
            <h3 style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0
            }}>
              Règles laptops
            </h3>
            <span style={{
              padding: '4px 12px',
              background: 'var(--accent2)',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {laptopRules.length}
            </span>
          </div>
          
          {laptopRules.length === 0
            ? <div className="pip-empty" style={{ 
                textAlign: 'center', 
                color: 'var(--text3)', 
                padding: '50px 24px',
                fontSize: '14px',
                background: 'var(--surface2)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border)'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                Aucune règle générée. Vérifiez les données en base.
              </div>
            : <RulesTable rules={laptopRules} sortBy={sortBy} filterText={filterText} />
          }
        </div>
      )}

      {activeTab === 'accessories' && (
        <div className="pip-section" style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          width: '100%',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid var(--border)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--green), #34d399)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <ShoppingBag size={20} color="#fff" />
            </div>
            <h3 style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0
            }}>
              Règles accessoires
            </h3>
            <span style={{
              padding: '4px 12px',
              background: 'var(--green)',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {accRules.length}
            </span>
          </div>
          
          <p className="pip-tab-subtitle" style={{ 
            fontSize: '13px', 
            color: 'var(--text2)',
            marginBottom: '20px',
            lineHeight: 1.6
          }}>
            Liens entre catégorie d'accessoire (souris, stand, USB), source et gamme de prix.
          </p>
          
          {loadingAcc
            ? <div className="pip-loading" style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center', 
                padding: '50px 24px', 
                color: 'var(--text3)',
                fontSize: '14px',
                background: 'var(--surface2)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border)'
              }}>
                <div style={{ 
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--green)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  marginBottom: '16px'
                }} />
                Chargement des accessoires…
              </div>
            : accRules.length === 0
              ? <div className="pip-empty" style={{ 
                  textAlign: 'center', 
                  color: 'var(--text3)', 
                  padding: '50px 24px',
                  fontSize: '14px',
                  background: 'var(--surface2)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border)'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>🎁</div>
                  Aucune règle accessoire disponible.
                </div>
              : <RulesTable rules={accRules} sortBy={sortBy} filterText={filterText} />
          }
        </div>
      )}

      {activeTab === 'cross' && (
        <div className="pip-section" style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          width: '100%',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid var(--border)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--purple), #a78bfa)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
            }}>
              <Link2 size={20} color="#fff" />
            </div>
            <h3 style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0
            }}>
              Association croisée
            </h3>
            <span style={{
              padding: '4px 12px',
              background: 'var(--purple)',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              {crossRules.length}
            </span>
          </div>
          
          <p className="pip-tab-subtitle" style={{ 
            fontSize: '13px', 
            color: 'var(--text2)',
            marginBottom: '20px',
            lineHeight: 1.6
          }}>
            Liens entre les caractéristiques d'un laptop et le type d'accessoire associé.
            Ex : <strong style={{ color: 'var(--text)' }}>laptop gaming → souris gaming AliExpress</strong>.
          </p>
          
          {loadingAcc
            ? <div className="pip-loading" style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center', 
                padding: '50px 24px', 
                color: 'var(--text3)',
                fontSize: '14px',
                background: 'var(--surface2)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border)'
              }}>
                <div style={{ 
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--border)',
                  borderTopColor: 'var(--purple)',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                  marginBottom: '16px'
                }} />
                Chargement des règles croisées…
              </div>
            : crossRules.length === 0
              ? <div className="pip-empty" style={{ 
                  textAlign: 'center', 
                  color: 'var(--text3)', 
                  padding: '50px 24px',
                  fontSize: '14px',
                  background: 'var(--surface2)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border)'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>🔗</div>
                  Aucune règle croisée disponible.
                </div>
              : <RulesTable rules={crossRules} sortBy={sortBy} filterText={filterText} />
          }
        </div>
      )}

    </div>
  );
}