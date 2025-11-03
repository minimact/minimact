// Simple SignalR connection test script
const signalR = require('@microsoft/signalr');

const url = process.argv[2] || 'http://localhost:5000/minimact';

console.log(`Testing SignalR connection to: ${url}`);
console.log('=====================================\n');

async function testConnection() {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(url, {
      transport: signalR.HttpTransportType.WebSockets
    })
    .configureLogging(signalR.LogLevel.Debug)
    .build();

  try {
    console.log('Attempting to connect...');
    await connection.start();
    console.log('\n✅ SUCCESS! SignalR connected');

    // Try calling GetComponentTree
    console.log('\nCalling GetComponentTree()...');
    const tree = await connection.invoke('GetComponentTree');
    console.log('Result:', JSON.stringify(tree, null, 2));

    await connection.stop();
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED to connect');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testConnection();
