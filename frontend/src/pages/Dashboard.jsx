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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout }            = useAuth();

  // Quick stats chargées depuis l'API
  const [quickStats, setQuickStats] = useState([
    { title: 'Produits trackés',    value: '—',   icon: Package,        color: '#3b82f6' },
    { title: 'Prix médian',         value: '—',   icon: TrendingUp,     color: '#f97316' },
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
          { title: 'Prix médian',         value: s.median ? `${s.median.toLocaleString('fr-FR')} MAD` : '—',   icon: TrendingUp,    color: '#f97316' },
          { title: 'Marques analysées',   value: String(brands),                          icon: ShoppingBag,   color: '#10b981' },
          { title: 'Anomalies détectées', value: '—',                                     icon: AlertTriangle, color: '#8b5cf6' },
        ]);
      })
      .catch(() => {}); // silencieux si l'API n'est pas encore dispo
  }, []);

  const currentTabLabel = TABS.find(t => t.id === tab)?.label || '';

  return (
    <div className="pip-layout">

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={`pip-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="pip-sidebar-logo">
          <div className="pip-logo-icon">
            <ShoppingBag size={22} color="#fff" />
          </div>
          {sidebarOpen && (
            <div className="pip-logo-text">
              <span className="pip-logo-name">PriceIntel</span>
            </div>
          )}
          <button className="pip-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="pip-nav">
          {sidebarOpen && <div className="pip-nav-section-label">Navigation</div>}
          {TABS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`pip-nav-item ${tab === item.id ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : ''}
            >
              <item.icon className="pip-nav-icon" size={18} />
              {sidebarOpen && <span className="pip-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="pip-sidebar-footer">
            <div className="pip-nav-section-label">
              <Activity size={14} />
              <span>Statut système</span>
            </div>
            <div className="pip-system-status">
              <div className="pip-status-item">
                <div className="pip-status-dot active"></div>
                <span className="pip-status-label">API Django</span>
                <span className="pip-status-value active">Actif</span>
              </div>
              <div className="pip-status-divider"></div>
              <div className="pip-status-item">
                <Database size={14} className="pip-status-icon" />
                <span className="pip-status-label">Base MySQL</span>
                <span className="pip-status-value active">Connectée</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <div className="pip-main">
        <header className="pip-header">
          <div className="pip-header-left">
            <div className="pip-breadcrumb">
              <span className="pip-breadcrumb-home">PriceIntel</span>
              <ChevronRight size={14} className="pip-breadcrumb-sep" />
              <span className="pip-breadcrumb-current">{currentTabLabel}</span>
            </div>
          </div>

          <div className="pip-header-right">
            <button
              className="pip-header-icon-btn"
              title="Actualiser"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={17} />
            </button>

            {user && (
              <div className="pip-user-menu">
                <span className="pip-username">
                  👋 {user?.first_name || user?.username || 'Admin'}
                </span>
                <button onClick={logout} className="pip-logout-btn" title="Déconnexion">
                  <LogOut size={16} />
                </button>
              </div>
            )}

            <div className="pip-avatar">
              {(user?.first_name?.[0] || user?.username?.[0] || 'A').toUpperCase()}
            </div>
          </div>
        </header>

        <main className="pip-content">

          {/* ── Quick stats (onglet produits seulement) ── */}
          {tab === 'products' && (
            <>
              <div className="pip-welcome-banner">
                <div className="pip-welcome-text">
                  <h1>Bonjour 👋{user?.first_name ? ` ${user.first_name}` : ''}</h1>
                  <p>Bienvenue sur <strong>Price Intelligence Platform</strong></p>
                </div>
              </div>

              <div className="pip-quick-stats">
                {quickStats.map((stat, i) => (
                  <div key={i} className="pip-quick-stat-card">
                    <div>
                      <p className="pip-qs-label">{stat.title}</p>
                      <h3 className="pip-qs-value">{stat.value}</h3>
                    </div>
                    <div className="pip-qs-icon" style={{ background: stat.color + '18', color: stat.color }}>
                      <stat.icon size={22} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Contenu des onglets (branché sur les vrais composants) ── */}
          <div className="pip-tab-content">
            {tab === 'products'    && <ProductsTab    />}
            {tab === 'stats'       && <StatsTab       />}
            {tab === 'clustering'  && <ClusteringTab  />}
            {tab === 'anomalies'   && <AnomaliesTab   />}
            {tab === 'association' && <AssociationTab />}
          </div>

        </main>
      </div>
    </div>
  );
}

// Dans le header de Dashboard, ajoute :
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
    fontWeight: 'bold'
  }}
>
  🚪 Déconnexion & Voir Landing
</button>

export default Dashboard;
