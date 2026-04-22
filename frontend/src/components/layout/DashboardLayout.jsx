import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

function DashboardLayout({ children, tabs, activeTab, onTabChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="pip-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={tabs}
      />
      
      <div className="pip-main">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          title={currentTab?.label}
          breadcrumbs={true}
        />
        
        <main className="pip-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;