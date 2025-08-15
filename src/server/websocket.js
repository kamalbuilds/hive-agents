import { WebSocketServer } from 'ws'
import { EventEmitter } from 'events'

export class HiveMindWebSocketServer extends EventEmitter {
  constructor(port = 3001) {
    super()
    this.port = port
    this.wss = null
    this.clients = new Map()
    this.channels = {
      swarm: new Set(),
      prices: new Set(),
      tasks: new Set(),
      crosschain: new Set()
    }
  }

  start() {
    this.wss = new WebSocketServer({ port: this.port })
    console.log(`🌐 WebSocket server started on port ${this.port}`)

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId()
      const client = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        ip: req.socket.remoteAddress
      }

      this.clients.set(clientId, client)
      console.log(`✅ Client connected: ${clientId}`)

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'welcome',
        clientId,
        timestamp: Date.now()
      })

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(clientId, message)
        } catch (err) {
          console.error('Invalid message:', err)
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Invalid message format'
          })
        }
      })

      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId)
      })

      ws.on('error', (err) => {
        console.error(`Client ${clientId} error:`, err)
      })
    })

    // Start broadcasting updates
    this.startBroadcasting()
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.channels || [])
        break
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.channels || [])
        break
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() })
        break
      default:
        this.emit('message', { clientId, message })
    }
  }

  handleSubscribe(clientId, channels) {
    const client = this.clients.get(clientId)
    if (!client) return

    channels.forEach(channel => {
      if (this.channels[channel]) {
        this.channels[channel].add(clientId)
        client.subscriptions.add(channel)
      }
    })

    this.sendToClient(clientId, {
      type: 'subscribed',
      channels: Array.from(client.subscriptions)
    })
  }

  handleUnsubscribe(clientId, channels) {
    const client = this.clients.get(clientId)
    if (!client) return

    channels.forEach(channel => {
      if (this.channels[channel]) {
        this.channels[channel].delete(clientId)
        client.subscriptions.delete(channel)
      }
    })

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channels: Array.from(client.subscriptions)
    })
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Remove from all channels
    client.subscriptions.forEach(channel => {
      if (this.channels[channel]) {
        this.channels[channel].delete(clientId)
      }
    })

    this.clients.delete(clientId)
    console.log(`❌ Client disconnected: ${clientId}`)
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId)
    if (client && client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(data))
    }
  }

  broadcast(channel, data) {
    if (!this.channels[channel]) return

    const message = JSON.stringify({
      ...data,
      channel,
      timestamp: Date.now()
    })

    this.channels[channel].forEach(clientId => {
      const client = this.clients.get(clientId)
      if (client && client.ws.readyState === 1) {
        client.ws.send(message)
      }
    })
  }

  startBroadcasting() {
    // Broadcast swarm updates every 5 seconds
    setInterval(() => {
      this.broadcastSwarmUpdate()
    }, 5000)

    // Broadcast price updates every 10 seconds
    setInterval(() => {
      this.broadcastPriceUpdate()
    }, 10000)

    // Broadcast task updates every 3 seconds
    setInterval(() => {
      this.broadcastTaskUpdate()
    }, 3000)
  }

  broadcastSwarmUpdate() {
    const swarmData = {
      type: 'swarm_update',
      metrics: {
        totalAgents: 24 + Math.floor(Math.random() * 5),
        activeAgents: 18 + Math.floor(Math.random() * 5),
        idleAgents: 6,
        tasksCompleted: 142 + Math.floor(Math.random() * 10),
        tasksInProgress: 7 + Math.floor(Math.random() * 5),
        totalEarnings: 4567.89 + Math.random() * 100,
        successRate: 87 + Math.random() * 5,
        avgResponseTime: 234 + Math.floor(Math.random() * 50),
        memoryUsage: 60 + Math.random() * 20,
        cpuUsage: 40 + Math.random() * 30,
        networkLatency: 10 + Math.random() * 10,
        gasSpent: 123.45 + Math.random() * 10
      },
      agents: this.generateMockAgents()
    }

    this.broadcast('swarm', swarmData)
  }

  broadcastPriceUpdate() {
    const prices = [
      { pair: 'FLR/USD', price: 0.0234 + (Math.random() - 0.5) * 0.002, change: (Math.random() - 0.5) * 10 },
      { pair: 'XRP/USD', price: 0.5678 + (Math.random() - 0.5) * 0.05, change: (Math.random() - 0.5) * 10 },
      { pair: 'BTC/USD', price: 45678.90 + (Math.random() - 0.5) * 500, change: (Math.random() - 0.5) * 5 },
      { pair: 'ETH/USD', price: 2345.67 + (Math.random() - 0.5) * 50, change: (Math.random() - 0.5) * 5 }
    ].map(p => ({
      ...p,
      volume24h: Math.floor(Math.random() * 10000000),
      source: 'flare',
      lastUpdate: new Date(),
      confidence: 99 + Math.random()
    }))

    this.broadcast('prices', {
      type: 'price_update',
      prices
    })
  }

  broadcastTaskUpdate() {
    this.broadcast('tasks', {
      type: 'task_update',
      completed: 142 + Math.floor(Math.random() * 10),
      inProgress: 7 + Math.floor(Math.random() * 5),
      pending: 3 + Math.floor(Math.random() * 3),
      failed: Math.floor(Math.random() * 2)
    })
  }

  generateMockAgents() {
    const types = ['coordinator', 'trader', 'analyzer', 'optimizer', 'researcher']
    const statuses = ['active', 'idle', 'busy']
    
    return Array.from({ length: 10 }, (_, i) => ({
      id: `agent-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      capabilities: ['analysis', 'prediction', 'optimization'].slice(0, Math.floor(Math.random() * 3) + 1),
      tasks: Math.floor(Math.random() * 100),
      earnings: Math.random() * 1000,
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      lastSeen: new Date(),
      endpoint: `http://localhost:${3000 + i}`,
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`
    }))
  }

  generateClientId() {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  stop() {
    if (this.wss) {
      this.wss.close()
      console.log('WebSocket server stopped')
    }
  }
}

// Create and export singleton instance
export const wsServer = new HiveMindWebSocketServer()

// Start server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  wsServer.start()
}