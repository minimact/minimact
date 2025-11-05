/**
 * Feature Test: Event Parameter
 *
 * Tests event handlers that use the event parameter.
 *
 * Patterns:
 * - (e) => func(e.target.value)
 * - (e) => { e.preventDefault(); ... }
 * - (event) => event.stopPropagation()
 */

export function EventParameterTest() {
  function setEmail(value: string) {
    console.log('Email:', value);
  }

  function setMessage(value: string) {
    console.log('Message:', value);
  }

  function handleSubmit() {
    console.log('Form submitted');
  }

  function handleButtonClick(value: string) {
    console.log('Button clicked:', value);
  }

  return (
    <div>
      {/* e.target.value pattern */}
      <input
        type="email"
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />

      {/* Event parameter with different name */}
      <textarea
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Message"
      />

      {/* e.preventDefault() */}
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}>
        <button type="submit">Submit</button>
      </form>

      {/* Multiple event operations */}
      <button onClick={(e) => {
        e.stopPropagation();
        console.log('Click event:', e);
        handleButtonClick('test');
      }}>
        Complex Handler
      </button>

      {/* Event parameter with property access */}
      <button onClick={(e) => {
        const target = e.target as HTMLButtonElement;
        console.log('Button text:', target.textContent);
      }}>
        Get Text
      </button>

      {/* Event parameter destructuring */}
      <input
        type="text"
        onChange={({ target: { value } }) => console.log('Value:', value)}
      />
    </div>
  );
}
