import { usePub, useSub } from 'minimact';

function UsePubSubTest() {
  const publish = usePub('notifications');
  const notifications = useSub('notifications', (msg) => {
    console.log('Received:', msg);
  });

  const handlePublish = () => {
    publish({ message: 'Hello World', count: 42 }, { source: 'UsePubSubTest' });
  };

  return (
    <div>
      <h1>Pub/Sub Test</h1>
      <button onClick={handlePublish}>Publish Message</button>
      <div>Last message: {notifications.value?.message}</div>
      <div>From: {notifications.source}</div>
    </div>
  );
}

export default UsePubSubTest;
