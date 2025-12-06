/**
 * Test fixture for usePub and useSub hooks
 * usePub creates a publisher channel for broadcasting events
 * useSub subscribes to a channel and receives events
 */

import { usePub, useSub, useState } from '@minimact/core';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

interface NotificationEvent {
  type: 'info' | 'warning' | 'error';
  message: string;
}

interface UserStatusEvent {
  userId: string;
  status: 'online' | 'offline' | 'away';
}

export function TestUsePubSub() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
  const [inputText, setInputText] = useState('');

  // Publishers - create channels to broadcast events
  const publishMessage = usePub<ChatMessage>('chat:messages');
  const publishNotification = usePub<NotificationEvent>('app:notifications');
  const publishUserStatus = usePub<UserStatusEvent>('users:status');

  // Subscribers - listen to channels
  useSub<ChatMessage>('chat:messages', (message) => {
    setMessages(prev => [...prev, message]);
  });

  useSub<NotificationEvent>('app:notifications', (notification) => {
    setNotifications(prev => [...prev, notification]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  });

  useSub<UserStatusEvent>('users:status', (event) => {
    setOnlineUsers(prev => {
      const updated = new Map(prev);
      if (event.status === 'offline') {
        updated.delete(event.userId);
      } else {
        updated.set(event.userId, event.status);
      }
      return updated;
    });
  });

  // Cross-component subscription (e.g., from a sidebar)
  useSub<{ theme: 'light' | 'dark' }>('settings:theme', (event) => {
    document.body.classList.toggle('dark', event.theme === 'dark');
  });

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      user: 'CurrentUser',
      text: inputText,
      timestamp: Date.now()
    };

    publishMessage(message);
    setInputText('');
  };

  const handleNotify = (type: NotificationEvent['type']) => {
    publishNotification({
      type,
      message: `This is a ${type} notification at ${new Date().toLocaleTimeString()}`
    });
  };

  const handleStatusChange = (status: UserStatusEvent['status']) => {
    publishUserStatus({
      userId: 'currentUser',
      status
    });
  };

  return (
    <div className="pubsub-test">
      <h2>Pub/Sub Test</h2>

      <section className="notifications-section">
        <h3>Notifications</h3>
        <div className="notification-buttons">
          <button onClick={() => handleNotify('info')}>Info</button>
          <button onClick={() => handleNotify('warning')}>Warning</button>
          <button onClick={() => handleNotify('error')}>Error</button>
        </div>
        <div className="notification-list">
          {notifications.map((notif, index) => (
            <div key={index} className={`notification ${notif.type}`}>
              {notif.message}
            </div>
          ))}
        </div>
      </section>

      <section className="status-section">
        <h3>User Status</h3>
        <div className="status-buttons">
          <button onClick={() => handleStatusChange('online')}>Go Online</button>
          <button onClick={() => handleStatusChange('away')}>Go Away</button>
          <button onClick={() => handleStatusChange('offline')}>Go Offline</button>
        </div>
        <div className="online-users">
          <h4>Online Users ({onlineUsers.size})</h4>
          <ul>
            {Array.from(onlineUsers.entries()).map(([userId, status]) => (
              <li key={userId}>
                {userId}: <span className={`status-${status}`}>{status}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="chat-section">
        <h3>Chat Messages</h3>
        <div className="message-list">
          {messages.map((msg) => (
            <div key={msg.id} className="message">
              <span className="user">{msg.user}</span>
              <span className="text">{msg.text}</span>
              <span className="time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
        <div className="message-input">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </section>
    </div>
  );
}
