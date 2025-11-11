import { useTemplate } from '@minimact/core';

function Dashboard() {
  useTemplate('SidebarLayout', { title: 'Dashboard' });

  return (
    <>
      <h1>Welcome to Dashboard</h1>
      <p>This content is wrapped in a sidebar layout template.</p>
      <div className="stats">
        <span>Users: 42</span>
        <span>Posts: 128</span>
      </div>
    </>
  );
}
