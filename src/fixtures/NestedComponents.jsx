function Card({ title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="dashboard">
      <Card title="Statistics">
        <div className="stats">
          <span>Views: 1000</span>
          <span>Users: 50</span>
        </div>
      </Card>
      <Card title="Activity">
        <ul>
          <li>User logged in</li>
          <li>Data updated</li>
        </ul>
      </Card>
    </div>
  );
}
