import { useState, useSignalR } from '@minimact/core';

function UseSignalRTest() {
  const [messages, setMessages] = useState([]);

  const signalR = useSignalR('/hubs/chat', (message) => {
    console.log('Received message:', message);
    setMessages([...messages, message]);
  });

  const handleSend = () => {
    signalR.send('SendMessage', { text: 'Hello from client', user: 'TestUser' });
  };

  return (
    <div>
      <h1>SignalR Test</h1>
      <button onClick={handleSend}>Send Message</button>
      <div>Connected: {signalR.state.connected ? 'Yes' : 'No'}</div>
      <div>Connection ID: {signalR.state.connectionId}</div>
      <div>Messages: {messages.length}</div>
      {signalR.state.error && <div>Error: {signalR.state.error}</div>}
    </div>
  );
}

export default UseSignalRTest;
