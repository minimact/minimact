/**
 * Feature Test: Conditional Rendering
 *
 * Tests logical AND (&&) operator for conditional JSX rendering.
 *
 * Pattern: {condition && <Component />}
 */

export function ConditionalRenderingTest() {
  const isAdmin = true;
  const isLoggedIn = false;
  const hasPermission = true;
  const showBanner = true;

  return (
    <div>
      {/* Simple conditional */}
      {isAdmin && (
        <div style={{ padding: '10px', backgroundColor: '#fef3c7' }}>
          <h3>Admin Controls</h3>
          <p>You have admin access</p>
        </div>
      )}

      {/* Conditional with false value */}
      {isLoggedIn && (
        <div>
          <p>Welcome back!</p>
        </div>
      )}

      {/* Nested conditionals */}
      {hasPermission && (
        <div>
          <h3>Protected Content</h3>
          {showBanner && (
            <div style={{ backgroundColor: '#dbeafe', padding: '5px' }}>
              <p>Important Notice</p>
            </div>
          )}
        </div>
      )}

      {/* Multiple conditionals */}
      {isAdmin && <button>Delete User</button>}
      {hasPermission && <button>Edit</button>}
      {showBanner && <div>Banner Message</div>}
    </div>
  );
}
