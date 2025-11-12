import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

interface NewDeployment {
  eventId: string
  project: {
    id: string
    name: string
    url: string
    category: string
    tags: string[]
  }
  developer: {
    username: string
    displayName?: string
    reputation: number
  }
  timestamp: string
}

export function useCommunityHub() {
  const [isConnected, setIsConnected] = useState(false)
  const [newDeployment, setNewDeployment] = useState<NewDeployment | null>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    // Create SignalR connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/community')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build()

    connectionRef.current = connection

    // Register event handlers
    connection.on('Welcome', (data) => {
      console.log('🎉 Welcome:', data.message)
    })

    connection.on('NewDeployment', (data: NewDeployment) => {
      console.log('🚀 New deployment received:', data)
      setNewDeployment(data)
    })

    connection.on('NewActivity', (data) => {
      console.log('📊 New activity:', data)
    })

    connection.on('TrendingUpdated', (data) => {
      console.log('🔥 Trending updated:', data)
    })

    // Handle connection state changes
    connection.onreconnecting(() => {
      console.log('⚠️ Reconnecting to hub...')
      setIsConnected(false)
    })

    connection.onreconnected(() => {
      console.log('✅ Reconnected to hub!')
      setIsConnected(true)
    })

    connection.onclose(() => {
      console.log('❌ Connection closed')
      setIsConnected(false)
    })

    // Start connection
    connection
      .start()
      .then(() => {
        console.log('✅ Connected to Mactic Community Hub!')
        setIsConnected(true)
      })
      .catch((err) => {
        console.error('❌ Failed to connect to hub:', err)
        setIsConnected(false)
      })

    // Cleanup on unmount
    return () => {
      if (connection) {
        connection.stop()
      }
    }
  }, [])

  return {
    isConnected,
    newDeployment,
    connection: connectionRef.current,
  }
}
