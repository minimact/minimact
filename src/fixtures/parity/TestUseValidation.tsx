/**
 * Test fixture for useValidation hook
 * useValidation creates field validation rules that are checked on submit
 * Supports required, min, max, pattern, custom validators
 */

import { useValidation, useState } from '@minimact/core';

export function TestUseValidation() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState(0);
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');

  // Basic validation rules
  const emailValidation = useValidation(email, {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  });

  // Password validation with multiple rules
  const passwordValidation = useValidation(password, {
    required: true,
    minLength: 8,
    maxLength: 100,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be 8+ chars with uppercase, lowercase, and number'
  });

  // Custom validator function
  const confirmPasswordValidation = useValidation(confirmPassword, {
    required: true,
    custom: (value) => value === password,
    message: 'Passwords do not match'
  });

  // Numeric validation
  const ageValidation = useValidation(age, {
    required: true,
    min: 18,
    max: 120,
    message: 'Age must be between 18 and 120'
  });

  // Async validation (e.g., check username availability)
  const usernameValidation = useValidation(username, {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    asyncValidator: async (value) => {
      const response = await fetch(`/api/check-username?username=${value}`);
      const { available } = await response.json();
      return available;
    },
    message: 'Username is already taken or invalid'
  });

  // Optional field with pattern
  const websiteValidation = useValidation(website, {
    required: false,
    pattern: /^https?:\/\/.+/,
    message: 'Please enter a valid URL starting with http:// or https://'
  });

  const handleSubmit = () => {
    // Check all validations
    const isValid = emailValidation.isValid &&
                   passwordValidation.isValid &&
                   confirmPasswordValidation.isValid &&
                   ageValidation.isValid &&
                   usernameValidation.isValid &&
                   websiteValidation.isValid;

    if (isValid) {
      // Submit form
      console.log('Form submitted!');
    }
  };

  return (
    <div className="validation-test">
      <h2>Form Validation Test</h2>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="field">
          <label>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={emailValidation.hasError ? 'error' : ''}
          />
          {emailValidation.hasError && (
            <span className="error-message">{emailValidation.message}</span>
          )}
        </div>

        <div className="field">
          <label>Username *</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={usernameValidation.hasError ? 'error' : ''}
          />
          {usernameValidation.isValidating && (
            <span className="validating">Checking availability...</span>
          )}
          {usernameValidation.hasError && (
            <span className="error-message">{usernameValidation.message}</span>
          )}
        </div>

        <div className="field">
          <label>Password *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={passwordValidation.hasError ? 'error' : ''}
          />
          {passwordValidation.hasError && (
            <span className="error-message">{passwordValidation.message}</span>
          )}
        </div>

        <div className="field">
          <label>Confirm Password *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={confirmPasswordValidation.hasError ? 'error' : ''}
          />
          {confirmPasswordValidation.hasError && (
            <span className="error-message">{confirmPasswordValidation.message}</span>
          )}
        </div>

        <div className="field">
          <label>Age *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 0)}
            className={ageValidation.hasError ? 'error' : ''}
          />
          {ageValidation.hasError && (
            <span className="error-message">{ageValidation.message}</span>
          )}
        </div>

        <div className="field">
          <label>Website (optional)</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={websiteValidation.hasError ? 'error' : ''}
          />
          {websiteValidation.hasError && (
            <span className="error-message">{websiteValidation.message}</span>
          )}
        </div>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
