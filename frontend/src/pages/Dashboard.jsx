import React, { useState } from 'react';
import { useAuth } from '../App';
import { 
  Search, Bell, ShoppingBag, TrendingUp, Package, 
  Menu, X, AlertTriangle, Link2, RefreshCw, 
  ChevronRight, BarChart2, LogOut, Activity, Clock, Database
} from 'lucide-react';

const TABS = [
  { id: "products",    label: "Produits",     icon: ShoppingBag},
  { id: "stats",       label: "Statistiques", icon: TrendingUp},
  { id: "clustering",  label: "Clustering",   icon: BarChart2},
  { id: "anomalies",   label: "Anomalies",    icon: AlertTriangle},
  { id: "association", label: "Association",  icon: Link2},
];

function Dashboard() {
  const [tab, setTab] = useState("products");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scraperActive] = useState(true);
  const { user, logout } = useAuth();
  
  const onLogout = () => {
    logout();
  };

  const quickStats = [
    { title: "Produits trackés",    value: "1 234",   icon: Package,       color: "#3b82f6" },
    { title: "Prix moyen",          value: "3 450 MAD", icon: TrendingUp,  color: "#f97316" },
    { title: "Marques analysées",   value: "42",       icon: ShoppingBag,  color: "#10b981" },
    { title: "Anomalies détectées", value: "18",       icon: AlertTriangle, color: "#8b5cf6" },
  ];

  const currentTabLabel = TABS.find(t => t.id === tab)?.label || "";

  return (
    <div className="pip-layout">
      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={`pip-sidebar ${sidebarOpen ? "open" : "closed"}`}>
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
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`pip-nav-item ${tab === item.id ? "active" : ""}`}
              title={!sidebarOpen ? item.label : ""}
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
              <span>Statut du système</span>
            </div>
            <div className="pip-system-status">
              <div className="pip-status-item">
                <div className={`pip-status-dot ${scraperActive ? 'active' : 'inactive'}`}></div>
                <span className="pip-status-label">Scraper</span>
                <span className={`pip-status-value ${scraperActive ? 'active' : ''}`}>
                  {scraperActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="pip-status-divider"></div>
              <div className="pip-status-item">
                <Clock size={14} className="pip-status-icon" />
                <span className="pip-status-label">Dernier scrape</span>
                <span className="pip-status-time">Il y a 2h</span>
              </div>
              <div className="pip-status-divider"></div>
              <div className="pip-status-item">
                <Database size={14} className="pip-status-icon" />
                <span className="pip-status-label">Produits en DB</span>
                <span className="pip-status-value">1,234</span>
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
            <button className="pip-header-icon-btn" title="Actualiser">
              <RefreshCw size={17} />
            </button>
            <button className="pip-header-icon-btn pip-bell" title="Notifications">
              <Bell size={17} />
              <span className="pip-notif-dot"></span>
            </button>
            
            {user && (
              <div className="pip-user-menu">
                <span className="pip-username">
                  👋 {user?.first_name || user?.username || "Admin"}
                </span>
                <button onClick={onLogout} className="pip-logout-btn" title="Déconnexion">
                  <LogOut size={16} />
                </button>
              </div>
            )}
            
            <div className="pip-avatar">
              {(user?.first_name?.[0] || user?.username?.[0] || "A").toUpperCase()}
            </div>
          </div>
        </header>

        <main className="pip-content">
          {tab === "products" && (
            <div className="pip-welcome-banner">
              <div className="pip-welcome-text">
                <h1>Bonjour 👋 {user?.first_name ? `, ${user.first_name}` : ''}</h1>
                <p>Bienvenue sur <strong>Price Intelligence Platform</strong></p>
              </div>
            </div>
          )}

          {tab === "products" && (
            <div className="pip-quick-stats">
              {quickStats.map((stat, i) => (
                <div key={i} className="pip-quick-stat-card">
                  <div>
                    <p className="pip-qs-label">{stat.title}</p>
                    <h3 className="pip-qs-value">{stat.value}</h3>
                  </div>
                  <div className="pip-qs-icon" style={{ background: stat.color + "18", color: stat.color }}>
                    <stat.icon size={22} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pip-tab-content">
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
              Sélectionnez un onglet dans le menu pour commencer
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;