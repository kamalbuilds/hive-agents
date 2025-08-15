'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Brain, Cpu, DollarSign, TrendingUp, Users, Zap, Shield,
  Globe, ArrowUp, ArrowDown, Wallet, Link2, Layers, CreditCard,
  CheckCircle, AlertCircle, RefreshCw, Send, Eye, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useX402 } from '@/hooks/useX402'
import { useLayerZero } from '@/hooks/useLayerZero'
import { useFlare } from '@/hooks/useFlare'
import { useCoinbaseWallet } from '@/hooks/useCoinbaseWallet'
import axios from 'axios'

// Production API endpoints
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

interface SwarmMetrics {
  totalAgents: number
  activeAgents: number
  idleAgents: number
  tasksCompleted: number
  tasksInProgress: number
  totalEarnings: number
  successRate: number
  avgResponseTime: number
  memoryUsage: number
  cpuUsage: number
  networkLatency: number
  gasSpent: number
}

interface Agent {
  id: string
  type: 'coordinator' | 'trader' | 'analyzer' | 'optimizer' | 'researcher'
  status: 'active' | 'idle' | 'busy' | 'error'
  capabilities: string[]
  tasks: number
  earnings: number
  cpu: number
  memory: number
  lastSeen: Date
  endpoint?: string
  walletAddress?: string
}

interface CrossChainTransaction {
  id: string
  sourceChain: string
  destChain: string
  amount: number
  token: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: Date
  txHash?: string
  layerZeroMessageId?: string
}

interface PriceFeed {
  pair: string
  price: number
  change: number
  volume24h: number
  source: 'flare' | 'chainlink' | 'pyth'
  lastUpdate: Date
  confidence: number
}

export default function Dashboard() {
  // Hooks for integrations
  const { getPaymentStats, discoverServices, callService } = useX402()
  const { bridgeTokens, getMessageStatus, estimateFees } = useLayerZero()
  const { getPrices, subscribeToPrices, getRandomNumber } = useFlare()
  const { wallet, connectWallet, getBalance, sendTransaction } = useCoinbaseWallet()

  // State management
  const [swarmMetrics, setSwarmMetrics] = useState<SwarmMetrics>({
    totalAgents: 0,
    activeAgents: 0,
    idleAgents: 0,
    tasksCompleted: 0,
    tasksInProgress: 0,
    totalEarnings: 0,
    successRate: 0,
    avgResponseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    gasSpent: 0
  })

  const [agents, setAgents] = useState<Agent[]>([])
  const [crossChainTxs, setCrossChainTxs] = useState<CrossChainTransaction[]>([])
  const [priceFeeds, setPriceFeeds] = useState<PriceFeed[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  const [selectedChain, setSelectedChain] = useState('base')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['swarm', 'prices', 'tasks'] }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setError('Connection error. Retrying...')
    }

    ws.onclose = () => {
      setIsConnected(false)
      setTimeout(() => {
        // Reconnect after 3 seconds
        window.location.reload()
      }, 3000)
    }

    setWsConnection(ws)

    return () => {
      ws.close()
    }
  }, [])

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'swarm_update':
        setSwarmMetrics(data.metrics)
        setAgents(data.agents)
        break
      case 'price_update':
        setPriceFeeds(data.prices)
        break
      case 'task_update':
        // Update task-related metrics
        setSwarmMetrics(prev => ({
          ...prev,
          tasksCompleted: data.completed,
          tasksInProgress: data.inProgress
        }))
        break
      case 'crosschain_tx':
        setCrossChainTxs(prev => [data.transaction, ...prev.slice(0, 9)])
        break
    }
  }

  // Fetch initial data
  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      
      // Fetch swarm status
      const swarmRes = await axios.get(`${API_BASE}/api/swarm/status`)
      setSwarmMetrics(swarmRes.data.metrics)
      setAgents(swarmRes.data.agents)

      // Fetch price feeds from Flare
      const prices = await getPrices(['FLR/USD', 'XRP/USD', 'BTC/USD', 'ETH/USD'])
      setPriceFeeds(prices.map((p: any) => ({
        pair: p.symbol,
        price: p.value,
        change: p.change24h || 0,
        volume24h: p.volume || 0,
        source: 'flare',
        lastUpdate: new Date(p.timestamp),
        confidence: p.confidence || 99
      })))

      // Discover x402 services
      const services = await discoverServices('ai-agent')
      console.log('Discovered services:', services)

      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch initial data:', err)
      setError('Failed to load dashboard data')
      setLoading(false)
    }
  }

  // Subscribe to Flare price updates
  useEffect(() => {
    const unsubscribe = subscribeToPrices(
      ['FLR/USD', 'XRP/USD', 'BTC/USD', 'ETH/USD'],
      (prices) => {
        setPriceFeeds(prices.map((p: any) => ({
          pair: p.symbol,
          price: p.value,
          change: p.change24h || 0,
          volume24h: p.volume || 0,
          source: 'flare',
          lastUpdate: new Date(p.timestamp),
          confidence: p.confidence || 99
        })))
      },
      10000 // Update every 10 seconds
    )

    return () => unsubscribe()
  }, [])

  // Spawn new agent
  const spawnAgent = async (type: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/agents/spawn`, {
        type,
        capabilities: getCapabilitiesByType(type),
        walletAddress: wallet?.address
      })

      const newAgent = response.data
      setAgents(prev => [...prev, newAgent])
      
      // Register with x402
      await axios.post(`${API_BASE}/api/x402/register`, {
        agentId: newAgent.id,
        endpoint: newAgent.endpoint,
        price: 0.001
      })

      return newAgent
    } catch (err) {
      console.error('Failed to spawn agent:', err)
      throw err
    }
  }

  // Bridge tokens using LayerZero
  const handleBridgeTokens = async (amount: number, destChain: string) => {
    try {
      const tx = await bridgeTokens({
        amount,
        token: 'USDC',
        sourceChain: selectedChain,
        destChain,
        recipient: wallet?.address || ''
      })

      setCrossChainTxs(prev => [{
        id: tx.messageId,
        sourceChain: selectedChain,
        destChain,
        amount,
        token: 'USDC',
        status: 'pending',
        timestamp: new Date(),
        txHash: tx.txHash,
        layerZeroMessageId: tx.messageId
      }, ...prev.slice(0, 9)])

      // Monitor status
      const interval = setInterval(async () => {
        const status = await getMessageStatus(tx.messageId)
        if (status.status === 'DELIVERED') {
          clearInterval(interval)
          setCrossChainTxs(prev => prev.map(t => 
            t.id === tx.messageId ? { ...t, status: 'confirmed' } : t
          ))
        }
      }, 5000)
    } catch (err) {
      console.error('Bridge failed:', err)
    }
  }

  // Helper function to get capabilities by agent type
  const getCapabilitiesByType = (type: string): string[] => {
    const capabilities: Record<string, string[]> = {
      trader: ['arbitrage', 'market-making', 'risk-assessment'],
      analyzer: ['sentiment-analysis', 'pattern-recognition', 'data-mining'],
      optimizer: ['portfolio-optimization', 'yield-farming', 'gas-optimization'],
      researcher: ['data-collection', 'report-generation', 'trend-analysis'],
      coordinator: ['task-distribution', 'consensus-voting', 'swarm-optimization']
    }
    return capabilities[type] || []
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-yellow-400 animate-pulse mx-auto mb-4" />
          <p className="text-white text-xl">Initializing HIVE MIND...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Wallet Connection */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Brain className="w-10 h-10 text-yellow-400" />
                HIVE MIND Control Center
              </h1>
              <p className="text-gray-300">Autonomous AI Agent Swarm Marketplace</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Network Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-gray-300 text-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Chain Selector */}
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="bg-gray-800/50 border border-gray-700 text-white px-3 py-2 rounded-lg"
              >
                <option value="base">Base</option>
                <option value="flare">Flare</option>
                <option value="ethereum">Ethereum</option>
                <option value="arbitrum">Arbitrum</option>
              </select>

              {/* Wallet Connection */}
              {wallet ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-green-400" />
                    <span className="text-white text-sm">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                    <Badge variant="success" className="ml-2">
                      ${wallet.balance?.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">{error}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setError(null)}
                className="ml-auto text-red-300 hover:text-red-200"
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Active Swarm</CardTitle>
                <Users className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {swarmMetrics.activeAgents}/{swarmMetrics.totalAgents}
                </div>
                <p className="text-xs text-gray-400">
                  {swarmMetrics.idleAgents} idle • {swarmMetrics.cpuUsage.toFixed(1)}% CPU
                </p>
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-green-400"
                    animate={{ width: `${(swarmMetrics.activeAgents / swarmMetrics.totalAgents) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  ${swarmMetrics.totalEarnings.toFixed(2)}
                </div>
                <p className="text-xs text-gray-400">
                  Gas spent: ${swarmMetrics.gasSpent.toFixed(2)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="success" className="text-xs">
                    <ArrowUp className="w-3 h-3 mr-1" />
                    +12.5%
                  </Badge>
                  <span className="text-xs text-gray-400">24h</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Task Performance</CardTitle>
                <Activity className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {swarmMetrics.tasksCompleted}
                </div>
                <p className="text-xs text-gray-400">
                  {swarmMetrics.tasksInProgress} in progress
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant="default" className="text-xs">
                    {swarmMetrics.successRate.toFixed(1)}% success
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {swarmMetrics.avgResponseTime}ms avg
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Cross-Chain Volume</CardTitle>
                <Layers className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  ${crossChainTxs.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
                </div>
                <p className="text-xs text-gray-400">
                  {crossChainTxs.filter(tx => tx.status === 'confirmed').length} confirmed
                </p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500"
                    onClick={() => handleBridgeTokens(100, 'flare')}
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Bridge Assets
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Swarm Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Agent Swarm Network</CardTitle>
                    <CardDescription className="text-gray-400">
                      Real-time agent status and x402 service discovery
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    onClick={() => spawnAgent('trader')}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Spawn Agent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  <AnimatePresence>
                    {agents.map((agent, index) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            agent.status === 'active' ? 'bg-green-400 animate-pulse' :
                            agent.status === 'busy' ? 'bg-yellow-400' :
                            agent.status === 'error' ? 'bg-red-400' :
                            'bg-gray-500'
                          }`} />
                          <div>
                            <p className="text-white font-medium">{agent.id}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                {agent.type}
                              </Badge>
                              {agent.capabilities.slice(0, 2).map(cap => (
                                <Badge key={cap} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-white text-sm">{agent.tasks} tasks</p>
                            <p className="text-green-400 text-sm">${agent.earnings.toFixed(3)}</p>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-3 h-3 text-gray-400" />
                              <div className="w-20">
                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      agent.cpu > 80 ? 'bg-red-400' :
                                      agent.cpu > 50 ? 'bg-yellow-400' :
                                      'bg-green-400'
                                    }`}
                                    style={{ width: `${agent.cpu}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">{agent.cpu}%</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Shield className="w-3 h-3 text-gray-400" />
                              <div className="w-20">
                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-blue-400"
                                    style={{ width: `${agent.memory}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">{agent.memory}%</span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={() => callService(agent.endpoint || '', { action: 'status' })}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:text-white"
                    onClick={() => fetchInitialData()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </Button>
                  <Button
                    variant="outline"
                    className="border-blue-600 text-blue-400 hover:text-blue-300"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    View on x402 Bazaar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
            {/* Flare Price Feeds */}
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  Flare FTSO Price Feeds
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Real-time oracle data with {priceFeeds[0]?.confidence || 99}% confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priceFeeds.map((feed) => (
                    <div key={feed.pair} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div>
                        <span className="text-gray-300 font-medium">{feed.pair}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-orange-600 text-orange-400">
                            {feed.source}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Vol: ${(feed.volume24h / 1000000).toFixed(1)}M
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-medium">
                          ${feed.price < 100 ? feed.price.toFixed(4) : feed.price.toFixed(2)}
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <Badge
                            variant={feed.change > 0 ? 'success' : 'destructive'}
                            className="text-xs flex items-center gap-1"
                          >
                            {feed.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(feed.change).toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full mt-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500"
                  onClick={async () => {
                    const random = await getRandomNumber()
                    console.log('Flare random number:', random)
                  }}
                >
                  Get Secure Random Number
                </Button>
              </CardContent>
            </Card>

            {/* Cross-Chain Transactions */}
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  LayerZero Bridge Activity
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Cross-chain message passing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {crossChainTxs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No recent transactions</p>
                  ) : (
                    crossChainTxs.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-sm">
                              {tx.sourceChain} → {tx.destChain}
                            </span>
                            <Badge
                              variant={
                                tx.status === 'confirmed' ? 'success' :
                                tx.status === 'failed' ? 'destructive' :
                                'warning'
                              }
                              className="text-xs"
                            >
                              {tx.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {tx.amount} {tx.token}
                          </p>
                        </div>
                        {tx.txHash && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white p-1"
                            onClick={() => window.open(`https://layerzeroscan.com/tx/${tx.layerZeroMessageId}`, '_blank')}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500"
                    onClick={async () => {
                      const fees = await estimateFees(100, 'USDC', selectedChain, 'flare')
                      console.log('Bridge fees:', fees)
                    }}
                  >
                    Estimate Fees
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500"
                    onClick={() => handleBridgeTokens(50, 'arbitrum')}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Bridge
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* x402 Payment Stats */}
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  x402 Micropayments
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Agent service monetization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-400">Total Revenue</span>
                    <span className="text-white font-medium">${swarmMetrics.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-400">Avg Price/Call</span>
                    <span className="text-white font-medium">$0.003</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-400">Settlement Time</span>
                    <span className="text-white font-medium">2 sec</span>
                  </div>
                </div>
                <Button
                  className="w-full mt-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500"
                  onClick={async () => {
                    const stats = await getPaymentStats()
                    console.log('Payment stats:', stats)
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  View Full Stats
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}