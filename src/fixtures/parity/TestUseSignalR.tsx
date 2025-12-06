/**
 * Test fixture for useSignalR hook
 * useSignalR creates a SignalR hub connection for real-time communication
 */

import { useSignalR, useState } from '@minimact/core';

interface Message {
  user: string;
  text: string;
  timestamp: string;
}

interface StockPrice {
  symbol: string;
  price: number;
  change: number;
}

export function TestUseSignalR() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stockPrices, setStockPrices] = useState<Map<string, StockPrice>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [inputMessage, setInputMessage] = useState('');
  const [currentUser, setCurrentUser] = useState('User1');

  // Chat hub connection
  const chatHub = useSignalR('/hubs/chat', {
    onConnected: () => {
      setConnectionStatus('connected');
    },
    onDisconnected: () => {
      setConnectionStatus('disconnected');
    },
    onReconnecting: () => {
      setConnectionStatus('reconnecting');
    },
    handlers: {
      // Handle incoming chat messages
      'ReceiveMessage': (user: string, text: string, timestamp: string) => {
        setMessages(prev => [...prev, { user, text, timestamp }]);
      },
      // Handle user join/leave notifications
      'UserJoined': (user: string) => {
        setMessages(prev => [...prev, {
          user: 'System',
          text: `${user} joined the chat`,
          timestamp: new Date().toISOString()
        }]);
      },
      'UserLeft': (user: string) => {
        setMessages(prev => [...prev, {
          user: 'System',
          text: `${user} left the chat`,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  });

  // Stock ticker hub connection (separate hub)
  const stockHub = useSignalR('/hubs/stocks', {
    handlers: {
      'PriceUpdate': (symbol: string, price: number, change: number) => {
        setStockPrices(prev => {
          const updated = new Map(prev);
          updated.set(symbol, { symbol, price, change });
          return updated;
        });
      },
      'MarketClosed': () => {
        console.log('Market is closed');
      }
    },
    // Auto-reconnect configuration
    reconnectPolicy: {
      maxRetries: 5,
      delayMs: 2000
    }
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      // Invoke server method
      await chatHub.invoke('SendMessage', currentUser, inputMessage);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleJoinChat = async () => {
    try {
      await chatHub.invoke('JoinChat', currentUser);
    } catch (error) {
      console.error('Failed to join chat:', error);
    }
  };

  const handleLeaveChat = async () => {
    try {
      await chatHub.invoke('LeaveChat', currentUser);
    } catch (error) {
      console.error('Failed to leave chat:', error);
    }
  };

  const handleSubscribeStock = async (symbol: string) => {
    try {
      await stockHub.invoke('SubscribeToStock', symbol);
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  const handleUnsubscribeStock = async (symbol: string) => {
    try {
      await stockHub.invoke('UnsubscribeFromStock', symbol);
      setStockPrices(prev => {
        const updated = new Map(prev);
        updated.delete(symbol);
        return updated;
      });
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  };

  return (
    <div className="signalr-test">
      <h2>SignalR Test</h2>

      <div className={`connection-status ${connectionStatus}`}>
        Status: {connectionStatus}
      </div>

      <section className="chat-section">
        <h3>Chat Hub</h3>

        <div className="user-controls">
          <input
            type="text"
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            placeholder="Your name"
          />
          <button onClick={handleJoinChat}>Join</button>
          <button onClick={handleLeaveChat}>Leave</button>
        </div>

        <div className="message-list">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.user === 'System' ? 'system' : ''}`}
            >
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
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </section>

      <section className="stocks-section">
        <h3>Stock Ticker Hub</h3>

        <div className="subscribe-controls">
          <button onClick={() => handleSubscribeStock('AAPL')}>+ AAPL</button>
          <button onClick={() => handleSubscribeStock('GOOGL')}>+ GOOGL</button>
          <button onClick={() => handleSubscribeStock('MSFT')}>+ MSFT</button>
          <button onClick={() => handleSubscribeStock('AMZN')}>+ AMZN</button>
        </div>

        <div className="stock-list">
          {Array.from(stockPrices.values()).map((stock) => (
            <div key={stock.symbol} className="stock-item">
              <span className="symbol">{stock.symbol}</span>
              <span className="price">${stock.price.toFixed(2)}</span>
              <span className={`change ${stock.change >= 0 ? 'up' : 'down'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
              </span>
              <button onClick={() => handleUnsubscribeStock(stock.symbol)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
