import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * AppLayout — main shell for admin / manager / staff roles.
 *
 * ┌──────────────┬──────────────────────────────┐
 * │  Sidebar     │  Topbar (sticky 64px)        │
 * │  (240px /    ├──────────────────────────────┤
 * │   64px       │  <Outlet /> — scrollable     │
 * │   collapsed) │                              │
 * └──────────────┴──────────────────────────────┘
 */
const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('sidebarCollapsed', String(next)); } catch {}
      return next;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Sidebar (fixed) ── */}
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />

      {/* ── Right panel: topbar + content ── */}
      <div
        style={{
          marginLeft: collapsed
            ? 'var(--sidebar-collapsed-width)'
            : 'var(--sidebar-width)',
          transition: 'margin-left var(--transition-slow)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <Topbar collapsed={collapsed} onToggle={toggleCollapsed} />

        {/* ── Scrollable content area ── */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 32px',
            height: `calc(100vh - var(--topbar-height))`,
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
