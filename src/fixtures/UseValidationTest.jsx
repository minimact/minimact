import { useValidation } from '@minimact/core';

function UserForm() {
  const email = useValidation('email', {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email'
  });

  const password = useValidation('password', {
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters'
  });

  return (
    <form className="user-form">
      <div>
        <input {...email.props} placeholder="Email" />
        {email.error && <span className="error">{email.error}</span>}
      </div>
      <div>
        <input {...password.props} type="password" placeholder="Password" />
        {password.error && <span className="error">{password.error}</span>}
      </div>
      <button disabled={!email.valid || !password.valid}>Submit</button>
    </form>
  );
}
