import React from 'react';
import { Bell, RefreshCw, ChevronRight } from 'lucide-react';

function Header({ onMenuClick, title, breadcrumbs }) {
  return (
    <header className="pip-header">
      <div className="pip-header-left">
        <button className="pip-menu-btn" onClick={onMenuClick}>
          <ChevronRight size={20} />
        </button>
        {breadcrumbs && (
          <div className="pip-breadcrumb">
            <span className="pip-breadcrumb-home">PriceIntel</span>
            <ChevronRight size={14} className="pip-breadcrumb-sep" />
            <span className="pip-breadcrumb-current">{title}</span>
          </div>
        )}
      </div>
      <div className="pip-header-right">
        <button className="pip-header-icon-btn" title="Actualiser">
          <RefreshCw size={17} />
        </button>
        <button className="pip-header-icon-btn pip-bell" title="Notifications">
          <Bell size={17} />
          <span className="pip-notif-dot"></span>
        </button>
        <div className="pip-avatar">A</div>
      </div>
    </header>
  );
}

export default Header;