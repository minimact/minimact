/**
 * Feature Test: Block Statement Handlers
 *
 * Tests event handlers with multiple statements in block form.
 *
 * Pattern: () => { statement1; statement2; statement3; }
 */

export function BlockStatementHandlersTest() {
  const count = 0;

  function setCount(newCount: number) {
    console.log('Set count:', newCount);
  }

  return (
    <div>
      {/* Multiple statements */}
      <button onClick={() => {
        console.log('Clicked');
        setCount(count + 1);
        alert('Updated!');
      }}>
        Multi-Statement Handler
      </button>

      {/* Block with variable declaration */}
      <button onClick={() => {
        const newCount = count + 1;
        console.log('New count:', newCount);
        setCount(newCount);
      }}>
        With Variable
      </button>

      {/* Block with if statement */}
      <button onClick={() => {
        console.log('Checking count...');
        if (count < 10) {
          setCount(count + 1);
          console.log('Incremented');
        } else {
          alert('Maximum reached');
        }
      }}>
        Conditional Block
      </button>

      {/* Block with return statement */}
      <button onClick={() => {
        if (count === 0) {
          alert('Count is zero');
          return;
        }
        setCount(count - 1);
        console.log('Decremented');
      }}>
        With Return
      </button>

      {/* Nested blocks (if-else) */}
      <button onClick={() => {
        console.log('Start');
        if (count > 5) {
          console.log('High count');
          alert('Count is high');
        } else {
          console.log('Low count');
          setCount(count + 1);
        }
        console.log('End');
      }}>
        Nested Blocks
      </button>

      {/* Complex block with multiple operations */}
      <button onClick={() => {
        const oldCount = count;
        const newCount = count + 1;
        console.log(`Changing from ${oldCount} to ${newCount}`);
        setCount(newCount);
        if (newCount % 5 === 0) {
          alert(`Milestone reached: ${newCount}!`);
        }
        console.log('Done');
      }}>
        Complex Block
      </button>
    </div>
  );
}
