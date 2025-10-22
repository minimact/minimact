function InteractiveForm({ onSubmit }) {
  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          type="text"
          onChange={handleNameChange}
          onBlur={validateName}
          onFocus={clearError}
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          onChange={handleEmailChange}
          onBlur={validateEmail}
        />
      </div>
      <div className="actions">
        <button type="submit" onClick={handleClick}>
          Submit
        </button>
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
