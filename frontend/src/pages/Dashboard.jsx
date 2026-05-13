import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import {
  Search, Bell, ShoppingBag, TrendingUp, Package,
  Menu, X, AlertTriangle, Link2, RefreshCw,
  ChevronRight, BarChart2, LogOut, Activity, Clock,
  Database, History
} from 'lucide-react';

import { getStats } from '../services/api';

// Onglets
import ProductsTab    from './tabs/ProductsTab';
import StatsTab       from './tabs/StatsTab';
import ClusteringTab  from './tabs/ClusteringTab';
import AnomaliesTab   from './tabs/AnomaliesTab';
import AssociationTab from './tabs/AssociationTab';

const TABS = [
  { id: 'products',    label: 'Produits',      icon: ShoppingBag  },
  { id: 'stats',       label: 'Statistiques',  icon: TrendingUp   },
  { id: 'clustering',  label: 'Clustering',    icon: BarChart2    },
  { id: 'anomalies',   label: 'Anomalies',     icon: AlertTriangle},
  { id: 'association', label: 'Association',   icon: Link2        },
];

function Dashboard() {
  const [tab, setTab]               = useState('products');
  const [prevTab, setPrevTab]       = useState('products');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout }            = useAuth();

  // Quick stats chargées depuis l'API
  const [quickStats, setQuickStats] = useState([
    { title: 'Produits trackés',    value: '—',   icon: Package,        color: '#3b82f6' },
    { title: 'Prix médian',         value: '—',   icon: TrendingUp,     color: '#f59e0b' },
    { title: 'Marques analysées',   value: '—',   icon: ShoppingBag,    color: '#10b981' },
    { title: 'Anomalies détectées', value: '—',   icon: AlertTriangle,  color: '#8b5cf6' },
  ]);

  useEffect(() => {
    getStats()
      .then(d => {
        const s = d.stats || {};
        const brands = d.by_brand?.length || '—';
        setQuickStats([
          { title: 'Produits trackés',    value: s.count?.toLocaleString('fr-FR') || '—', icon: Package,       color: '#3b82f6' },
          { title: 'Prix médian',         value: s.median ? `${s.median.toLocaleString('fr-FR')} MAD` : '—',   icon: TrendingUp,    color: '#f59e0b' },
          { title: 'Marques analysées',   value: String(brands),                          icon: ShoppingBag,   color: '#10b981' },
          { title: 'Anomalies détectées', value: '—',                                     icon: AlertTriangle, color: '#8b5cf6' },
        ]);
      })
      .catch(() => {});
  }, []);

  // Gestion du changement d'onglet avec animation
  const handleTabChange = (newTab) => {
    if (newTab === tab) return;
    setPrevTab(tab);
    setIsTransitioning(true);
    
    // Attendre la fin de l'animation avant de changer le contenu
    setTimeout(() => {
      setTab(newTab);
      setIsTransitioning(false);
    }, 150); // Durée cohérente avec la transition CSS
  };

  const currentTabLabel = TABS.find(t => t.id === tab)?.label || '';

  // Composant pour le contenu animé des onglets
  const TabContent = ({ children, isActive }) => (
    <div
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        pointerEvents: isActive ? 'auto' : 'none',
        position: isActive ? 'relative' : 'absolute',
        width: '100%',
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="pip-layout">
      {/* Styles pour les animations et couleurs */}
      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pip-tab-content > * {
          animation: tabFadeIn 0.15s ease forwards;
        }
        .pip-nav-item {
          transition: all 0.15s ease;
          border-radius: 8px;
          margin: 4px 8px;
          padding: 10px 12px;
        }
        .pip-nav-item:hover {
          background: rgba(59, 130, 246, 0.08);
          transform: translateX(2px);
        }
        .pip-nav-item.active {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
          transition: all 0.1s ease;
        }
        .pip-quick-stat-card {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .pip-quick-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .pip-header-icon-btn {
          transition: transform 0.1s ease;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 8px;
        }
        .pip-header-icon-btn:hover {
          background: #e2e8f0;
          transform: scale(1.05);
        }
        .pip-sidebar {
          transition: width 0.2s ease, padding 0.2s ease;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
        }
        .pip-sidebar-logo {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }
        .pip-breadcrumb-home {
          color: #64748b;
        }
        .pip-breadcrumb-current {
          color: #3b82f6;
          font-weight: 600;
        }
        .pip-welcome-banner {
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
          border: 1px solid #dbeafe;
        }
        .pip-qs-value {
          color: #1e293b;
        }
        .pip-nav-section-label {
          color: #94a3b8;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 12px 16px 8px;
        }
        .pip-status-dot.active {
          background: #10b981;
        }
        .pip-status-value.active {
          color: #10b981;
        }
      `}</style>

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={`pip-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="pip-sidebar-logo">
          <div className="pip-logo-icon" style={{ background: '#3b82f6' }}>
            <ShoppingBag size={22} color="#fff" />
          </div>
          {sidebarOpen && (
            <div className="pip-logo-text">
              <span className="pip-logo-name" style={{ color: '#1e293b', fontWeight: 700 }}>PriceIntel</span>
              <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>INTEL PLATFORM</span>
            </div>
          )}
          <button 
            className="pip-sidebar-toggle" 
            onClick={() => setSidebarOpen(o => !o)}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px' }}
          >
            {sidebarOpen ? <X size={18} color="#64748b" /> : <Menu size={18} color="#64748b" />}
          </button>
        </div>

        <nav className="pip-nav">
          {sidebarOpen && <div className="pip-nav-section-label">Navigation</div>}
          {TABS.map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`pip-nav-item ${tab === item.id ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: tab === item.id ? '#3b82f6' : '#475569',
                fontWeight: tab === item.id ? 600 : 500,
              }}
            >
              <item.icon className="pip-nav-icon" size={18} color={tab === item.id ? '#3b82f6' : '#64748b'} />
              {sidebarOpen && <span className="pip-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="pip-sidebar-footer">
            <div className="pip-nav-section-label">
              <Activity size={14} color="#64748b" />
              <span style={{ marginLeft: '6px' }}>Statut système</span>
            </div>
            <div className="pip-system-status" style={{ padding: '0 12px' }}>
              <div className="pip-status-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <div className="pip-status-dot active" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                <span className="pip-status-label" style={{ fontSize: '13px', color: '#475569' }}>API Django</span>
                <span className="pip-status-value active" style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: '#10b981' }}>Actif</span>
              </div>
              <div className="pip-status-divider" style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>
              <div className="pip-status-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <Database size={14} color="#64748b" />
                <span className="pip-status-label" style={{ fontSize: '13px', color: '#475569' }}>Base MySQL</span>
                <span className="pip-status-value active" style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: '#10b981' }}>Connectée</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <div className="pip-main" style={{ background: '#f8fafc' }}>
        <header className="pip-header" style={{ 
          background: '#ffffff', 
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="pip-header-left">
            <div className="pip-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <span className="pip-breadcrumb-home">PriceIntel</span>
              <ChevronRight size={14} className="pip-breadcrumb-sep" color="#94a3b8" />
              <span className="pip-breadcrumb-current" style={{ color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase' }}>{currentTabLabel}</span>
            </div>
          </div>

          <div className="pip-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="pip-header-icon-btn"
              title="Actualiser"
              onClick={() => window.location.reload()}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
            >
              <RefreshCw size={17} color="#64748b" />
            </button>

            {user && (
              <div className="pip-user-menu" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pip-username" style={{ fontSize: '13px', color: '#475569' }}>
                  👋 {user?.first_name || user?.username || 'Admin'}
                </span>
                <button onClick={logout} className="pip-logout-btn" title="Déconnexion" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <LogOut size={16} color="#64748b" />
                </button>
              </div>
            )}

            <div className="pip-avatar" style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              background: '#3b82f6', 
              color: '#ffffff',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              {(user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase()}
            </div>
          </div>
        </header>

        <main className="pip-content" style={{ padding: '24px' }}>

          {/* ── Quick stats (onglet produits seulement) ── */}
          {tab === 'products' && !isTransitioning && (
            <>
              <div className="pip-welcome-banner" style={{ 
                background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                border: '1px solid #dbeafe',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <div className="pip-welcome-text">
                  <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#1e293b' }}>Bonjour 👋{user?.first_name ? ` ${user.first_name}` : ''}</h1>
                  <p style={{ margin: 0, color: '#64748b' }}>Bienvenue sur <strong style={{ color: '#3b82f6' }}>Price Intelligence Platform</strong></p>
                </div>
              </div>

              <div className="pip-quick-stats" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '16px',
                marginBottom: '24px'
              }}>
                {quickStats.map((stat, i) => (
                  <div key={i} className="pip-quick-stat-card" style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <div>
                      <p className="pip-qs-label" style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>{stat.title}</p>
                      <h3 className="pip-qs-value" style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: stat.color }}>
                        {stat.value}
                      </h3>
                    </div>
                    <div className="pip-qs-icon" style={{ 
                      background: `${stat.color}18`, 
                      color: stat.color,
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <stat.icon size={22} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Contenu des onglets avec animation ── */}
          <div className="pip-tab-content" style={{ position: 'relative', minHeight: '400px' }}>
            <TabContent isActive={tab === 'products' && !isTransitioning}>
              <ProductsTab />
            </TabContent>
            <TabContent isActive={tab === 'stats' && !isTransitioning}>
              <StatsTab />
            </TabContent>
            <TabContent isActive={tab === 'clustering' && !isTransitioning}>
              <ClusteringTab />
            </TabContent>
            <TabContent isActive={tab === 'anomalies' && !isTransitioning}>
              <AnomaliesTab />
            </TabContent>
            <TabContent isActive={tab === 'association' && !isTransitioning}>
              <AssociationTab />
            </TabContent>
          </div>

        </main>
      </div>

      {/* Bouton de déconnexion rapide */}
      <button 
        onClick={() => {
          localStorage.removeItem('pip_user');
          localStorage.removeItem('access_token');
          window.location.href = '/';
        }}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          padding: '10px 20px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'transform 0.1s ease, background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#dc2626';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ef4444';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        Déconnexion & Voir Landing
      </button>
    </div>
  );
}

export default Dashboard;