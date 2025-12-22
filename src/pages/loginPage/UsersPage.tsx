import { useAuth } from "../../auth/Auth";

export default function UsersPage() {
  const { user, logout } = useAuth();

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Users</h2>

      {!user ? (
        <div className="empty">Not logged in.</div>
      ) : (
        <>
          <div className="section">
            <div className="label">Current user</div>
            <div className="text">
              {user.email} — <b>{user.role}</b>
            </div>
          </div>

          <div className="section">
            <div className="label">Roles</div>
            <div className="text">
              <ul style={{ marginTop: 8 }}>
                <li>
                  <b>admin</b>: can create/update/delete/import/export
                </li>
                <li>
                  <b>viewer</b>: read-only
                </li>
              </ul>
            </div>
          </div>

          <button className="secondary-btn" type="button" onClick={logout}>
            Logout
          </button>
        </>
      )}
    </div>
  );
}
