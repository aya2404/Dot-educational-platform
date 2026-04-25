import React, { useState } from 'react';
import { BsList } from 'react-icons/bs';
import BrandLogo from './BrandLogo';
import Sidebar from './Sidebar';

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`app-shell ${sidebarOpen ? 'app-shell--nav-open' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <button
        type="button"
        className={`app-shell__backdrop ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="إغلاق القائمة"
      />

      <div className="app-shell__content">
        <div className="app-shell__mobile-bar d-lg-none">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <BsList size={22} />
          </button>
          <BrandLogo compact className="app-shell__mobile-brand" />
        </div>

        <main className="app-shell__main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;