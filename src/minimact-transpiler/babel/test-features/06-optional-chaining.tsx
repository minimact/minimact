/**
 * Feature Test: Optional Chaining
 *
 * Tests optional chaining operator (?.) for safe property access.
 *
 * Pattern: obj?.prop?.subProp
 */

export function OptionalChainingTest() {
  const viewModel = {
    userEmail: 'user@example.com',
    profile: {
      name: 'John Doe',
      settings: {
        theme: 'dark'
      }
    }
  };

  const emptyViewModel: any = null;

  return (
    <div>
      {/* Simple optional chaining */}
      <p>Email: {viewModel?.userEmail}</p>

      {/* Nested optional chaining */}
      <p>Name: {viewModel?.profile?.name}</p>
      <p>Theme: {viewModel?.profile?.settings?.theme}</p>

      {/* Optional chaining with null object */}
      <p>Null check: {emptyViewModel?.userEmail}</p>
      <p>Deep null check: {emptyViewModel?.profile?.name}</p>

      {/* Optional chaining in expressions */}
      <p>Has email: {viewModel?.userEmail ? 'Yes' : 'No'}</p>

      {/* Optional chaining with method calls */}
      <p>Uppercase: {viewModel?.userEmail?.toUpperCase()}</p>
      <p>Length: {viewModel?.profile?.name?.length}</p>
    </div>
  );
}
