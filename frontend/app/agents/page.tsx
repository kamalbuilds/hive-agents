'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Cpu, DollarSign, Star, Plus, Search, Filter } from 'lucide-react'
import { AgentSpawnModal } from '@/components/agents/agent-spawn-modal'
import { ServiceDiscovery } from '@/components/agents/service-discovery'
import { useX402 } from '@/hooks/useX402'

interface Agent {
  id: string
  type: string
  status: 'active' | 'busy' | 'idle'
  capabilities: string[]
  earnings: number
  reputation: number
  tasksCompleted: number
  endpoint: string
  pricePerCall: number
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [showSpawnModal, setShowSpawnModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { discoverServices, purchaseCapability } = useX402()

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    // Mock data - replace with actual API call
    const mockAgents: Agent[] = [
      {
        id: 'agent-researcher-001',
        type: 'researcher',
        status: 'active',
        capabilities: ['data-analysis', 'pattern-recognition', 'market-research'],
        earnings: 45.67,
        reputation: 4.8,
        tasksCompleted: 234,
        endpoint: 'https://agent-001.hivemind.ai',
        pricePerCall: 0.002
      },
      {
        id: 'agent-trader-002',
        type: 'trader',
        status: 'busy',
        capabilities: ['arbitrage', 'risk-assessment', 'portfolio-optimization'],
        earnings: 123.45,
        reputation: 4.9,
        tasksCompleted: 567,
        endpoint: 'https://agent-002.hivemind.ai',
        pricePerCall: 0.005
      },
      {
        id: 'agent-analyzer-003',
        type: 'analyzer',
        status: 'active',
        capabilities: ['sentiment-analysis', 'price-prediction', 'trend-detection'],
        earnings: 67.89,
        reputation: 4.5,
        tasksCompleted: 345,
        endpoint: 'https://agent-003.hivemind.ai',
        pricePerCall: 0.003
      }
    ]
    setAgents(mockAgents)
  }

  const spawnNewAgent = async (config: any) => {
    // Implement agent spawning logic
    console.log('Spawning agent with config:', config)
    
    const newAgent: Agent = {
      id: `agent-${config.type}-${Date.now()}`,
      type: config.type,
      status: 'idle',
      capabilities: config.capabilities,
      earnings: 0,
      reputation: 3.0,
      tasksCompleted: 0,
      endpoint: `https://agent-${Date.now()}.hivemind.ai`,
      pricePerCall: config.pricePerCall || 0.001
    }
    
    setAgents([...agents, newAgent])
    setShowSpawnModal(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'idle': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Agent Swarm</h1>
        <p className="text-gray-400">Manage and monitor your autonomous AI agents</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search agents by ID, type, or capability..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
          />
        </div>
        <Button
          onClick={() => setShowSpawnModal(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
        >
          <Plus className="mr-2" />
          Spawn New Agent
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Agents</p>
                <p className="text-2xl font-bold text-white">{agents.length}</p>
              </div>
              <Brain className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Now</p>
                <p className="text-2xl font-bold text-green-400">
                  {agents.filter(a => a.status === 'active').length}
                </p>
              </div>
              <Cpu className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Earnings</p>
                <p className="text-2xl font-bold text-blue-400">
                  ${agents.reduce((sum, a) => sum + a.earnings, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Reputation</p>
                <p className="text-2xl font-bold text-purple-400">
                  {(agents.reduce((sum, a) => sum + a.reputation, 0) / agents.length || 0).toFixed(1)}
                </p>
              </div>
              <Star className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map(agent => (
          <Card key={agent.id} className="bg-gray-800 border-gray-700 hover:border-yellow-500 transition">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">{agent.id}</CardTitle>
                  <CardDescription className="text-gray-400">
                    Type: {agent.type}
                  </CardDescription>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Capabilities */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">Capabilities:</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map(cap => (
                      <Badge key={cap} variant="secondary" className="bg-gray-700 text-gray-300">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Earnings</p>
                    <p className="text-white font-semibold">${agent.earnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tasks</p>
                    <p className="text-white font-semibold">{agent.tasksCompleted}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Reputation</p>
                    <p className="text-yellow-400 font-semibold">⭐ {agent.reputation.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Price/Call</p>
                    <p className="text-white font-semibold">${agent.pricePerCall}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black">
                    Assign Task
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Discovery Section */}
      <div className="mt-12">
        <ServiceDiscovery />
      </div>

      {/* Agent Spawn Modal */}
      {showSpawnModal && (
        <AgentSpawnModal
          onClose={() => setShowSpawnModal(false)}
          onSpawn={spawnNewAgent}
        />
      )}
    </div>
  )
}