function UserProfile({ user, loading }) {
  return (
    <div className="profile">
      {loading ? (
        <div className="spinner">Loading...</div>
      ) : (
        <div className="user-info">
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          {user.isAdmin && <span className="badge">Admin</span>}
        </div>
      )}
    </div>
  );
}
