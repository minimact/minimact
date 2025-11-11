import { useState, usePub, useSub } from '@minimact/core';

function UsePubSubTest() {
  const [lastMessage, setLastMessage] = useState('');

  const publish = usePub('notifications');
  const notifications = useSub('notifications', (msg) => {
    console.log('Received:', msg);
    setLastMessage(msg.message || '');
  });

  const handlePublish = () => {
    publish({ message: 'Hello World', count: 42 });
  };

  return (
    <div>
      <h1>Pub/Sub Test</h1>
      <button onClick={handlePublish}>Publish Message</button>
      <div>Last message: {lastMessage}</div>
    </div>
  );
}

export default UsePubSubTest;
