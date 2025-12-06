/**
 * Test fixture for useTemplate hook
 * useTemplate enables layout inheritance and composition
 * Child components can inject content into parent layout slots
 */

import { useTemplate, useState } from '@minimact/core';

// Page that uses a layout template
export function TestUseTemplate() {
  const [pageTitle, setPageTitle] = useState('Dashboard');

  // Use the "MainLayout" template
  // This makes the component inherit from MainLayout
  // and allows injecting content into named slots
  useTemplate('MainLayout', {
    // Props passed to the layout
    title: pageTitle,
    showSidebar: true,
    theme: 'light'
  });

  // The component's render becomes the "main" slot content
  return (
    <div className="dashboard-page">
      <h1>{pageTitle}</h1>

      <div className="dashboard-grid">
        <div className="widget">
          <h2>Statistics</h2>
          <p>Total users: 1,234</p>
          <p>Active sessions: 56</p>
        </div>

        <div className="widget">
          <h2>Recent Activity</h2>
          <ul>
            <li>User signed up</li>
            <li>Order placed</li>
            <li>Comment posted</li>
          </ul>
        </div>
      </div>

      <button onClick={() => setPageTitle('Updated Dashboard')}>
        Update Title
      </button>
    </div>
  );
}

// Another page using the same template with different props
export function SettingsPage() {
  useTemplate('MainLayout', {
    title: 'Settings',
    showSidebar: false,
    theme: 'dark'
  });

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section>
        <h2>Account</h2>
        <p>Manage your account settings</p>
      </section>

      <section>
        <h2>Preferences</h2>
        <p>Customize your experience</p>
      </section>
    </div>
  );
}

// Page using a different template
export function LandingPage() {
  useTemplate('MarketingLayout', {
    showHeader: true,
    showFooter: true,
    ctaText: 'Get Started'
  });

  return (
    <div className="landing-page">
      <section className="hero">
        <h1>Welcome to Our Platform</h1>
        <p>The best solution for your needs</p>
      </section>

      <section className="features">
        <div className="feature">
          <h2>Fast</h2>
          <p>Lightning quick performance</p>
        </div>
        <div className="feature">
          <h2>Secure</h2>
          <p>Enterprise-grade security</p>
        </div>
        <div className="feature">
          <h2>Scalable</h2>
          <p>Grows with your business</p>
        </div>
      </section>
    </div>
  );
}

// Nested templates - page uses layout, layout uses base
export function AdminPage() {
  const [section, setSection] = useState('users');

  // AdminLayout inherits from MainLayout
  useTemplate('AdminLayout', {
    title: 'Admin Panel',
    activeSection: section,
    permissions: ['read', 'write', 'delete']
  });

  return (
    <div className="admin-page">
      <nav className="admin-nav">
        <button onClick={() => setSection('users')}>Users</button>
        <button onClick={() => setSection('content')}>Content</button>
        <button onClick={() => setSection('settings')}>Settings</button>
      </nav>

      <div className="admin-content">
        {section === 'users' && (
          <div>
            <h2>User Management</h2>
            <p>Manage users here</p>
          </div>
        )}
        {section === 'content' && (
          <div>
            <h2>Content Management</h2>
            <p>Manage content here</p>
          </div>
        )}
        {section === 'settings' && (
          <div>
            <h2>System Settings</h2>
            <p>Configure system here</p>
          </div>
        )}
      </div>
    </div>
  );
}
