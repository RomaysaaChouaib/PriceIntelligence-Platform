import React from 'react';
import { X, Menu, ShoppingBag } from 'lucide-react';

function Sidebar({ isOpen, onClose, activeTab, onTabChange, tabs }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="pip-sidebar-overlay" onClick={onClose}></div>
      )}
      
      <aside className={`pip-sidebar ${isOpen ? "open" : "closed"}`}>
        {/* Logo */}
        <div className="pip-sidebar-logo">
          <div className="pip-logo-icon">
            <ShoppingBag size={22} color="#fff" />
          </div>
          {isOpen && (
            <div className="pip-logo-text">
              <span className="pip-logo-name">PriceIntel</span>
              <span className="pip-logo-subtitle">Jumia Tracker</span>
            </div>
          )}
          <button className="pip-sidebar-toggle" onClick={onClose}>
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="pip-nav">
          {isOpen && <div className="pip-nav-section-label">Navigation</div>}
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (window.innerWidth < 1024) onClose();
              }}
              className={`pip-nav-item ${activeTab === item.id ? "active" : ""}`}
              title={!isOpen ? item.label : ""}
            >
              <item.icon className="pip-nav-icon" size={18} />
              {isOpen && <span className="pip-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="pip-sidebar-footer">
            <div className="pip-nav-section-label">Pays Actifs</div>
            <div className="pip-countries">
              {['MA', 'SN', 'CI', 'NG'].map((country) => (
                <span key={country} className="pip-country-tag">{country}</span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;