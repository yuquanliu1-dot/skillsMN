/**
 * Layout Component
 *
 * Base layout with dark theme, sidebar, and main content area
 */

import React, { ReactNode, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, sidebar, header }) => {
  // Sidebar state for future sidebar toggle functionality
  const [sidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      {header && (
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          {header}
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <aside
            className={`bg-slate-800 border-r border-slate-700 transition-all duration-300 ${
              sidebarOpen ? 'w-64' : 'w-0'
            }`}
          >
            {sidebarOpen && <div className="h-full overflow-y-auto">{sidebar}</div>}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
