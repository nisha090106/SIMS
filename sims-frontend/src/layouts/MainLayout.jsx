/**
 * MainLayout — legacy compatibility shim.
 *
 * New code should use AppLayout (Outlet pattern via App.jsx routes).
 * This wrapper keeps any page that still does <MainLayout><Page /></MainLayout> working
 * by rendering children inside the same visual shell as AppLayout.
 */
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true',
  );

  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          transition: 'margin-left var(--transition-slow)',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <Topbar collapsed={collapsed} onToggle={toggle} />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 32px',
            background: 'var(--color-bg)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
