'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Cpu, DollarSign, Star, Plus, Search, Filter, Loader2, CheckCircle } from 'lucide-react'
import { AgentSpawnModal } from '@/components/agents/agent-spawn-modal'
import { ServiceDiscovery } from '@/components/agents/service-discovery'
import { useX402 } from '@/hooks/useX402'
import { useContract } from '@/lib/contract-integration'
import { toast } from '@/components/ui/toast'

interface Agent {
  id: string
  name: string
  type: string
  specialization: string
  status: 'active' | 'busy' | 'idle'
  capabilities: string[]
  earnings: number
  reputation: number
  tasksCompleted: number
  walletAddress: string
  endpointAddress?: string
  pricePerCall: number
  isActive: boolean
  registeredAt: Date
}

interface Task {
  id: string
  description: string
  reward: string
  assignedTo: string | null
  isCompleted: boolean
  deadline: Date
}

export default function DynamicAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showSpawnModal, setShowSpawnModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigningTask, setAssigningTask] = useState<string | null>(null)
  
  const { discoverServices, purchaseCapability } = useX402()
  const { 
    connect, 
    connected, 
    address,
    registerAgent, 
    getAllAgents, 
    getAllTasks,
    assignTask,
    createTask 
  } = useContract('base-sepolia')

  // Load agents and tasks from blockchain
  useEffect(() => {
    loadBlockchainData()
  }, [connected])

  const loadBlockchainData = async () => {
    setLoading(true)
    try {
      // Fetch agents from smart contract
      const contractAgents = await getAllAgents()
      const formattedAgents: Agent[] = contractAgents.map((agent: any) => ({
        id: agent.id,
        name: agent.name || `Agent ${agent.id}`,
        type: getTypeFromSpecialization(agent.specialization),
        specialization: agent.specialization,
        status: agent.isActive ? 'active' : 'idle',
        capabilities: getCapabilitiesFromSpecialization(agent.specialization),
        earnings: Math.random() * 200, // Mock earnings for now
        reputation: agent.reputation || 3,
        tasksCompleted: agent.tasksCompleted || 0,
        walletAddress: agent.walletAddress,
        endpointAddress: agent.endpointAddress,
        pricePerCall: 0.002,
        isActive: agent.isActive,
        registeredAt: agent.registeredAt
      }))
      
      setAgents(formattedAgents)
      
      // Fetch tasks
      const contractTasks = await getAllTasks()
      setTasks(contractTasks)
      
    } catch (error) {
      console.error('Failed to load blockchain data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data from blockchain',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeFromSpecialization = (specialization: string): string => {
    const types: Record<string, string> = {
      'data-analysis': 'researcher',
      'trading': 'trader',
      'optimization': 'optimizer',
      'prediction': 'analyzer',
      'coordination': 'coordinator'
    }
    return types[specialization] || 'general'
  }

  const getCapabilitiesFromSpecialization = (specialization: string): string[] => {
    const capabilities: Record<string, string[]> = {
      'data-analysis': ['research', 'pattern-recognition', 'reporting'],
      'trading': ['arbitrage', 'market-making', 'risk-assessment'],
      'optimization': ['portfolio-optimization', 'yield-farming', 'gas-optimization'],
      'prediction': ['price-prediction', 'sentiment-analysis', 'trend-detection'],
      'coordination': ['task-distribution', 'consensus-voting', 'swarm-optimization']
    }
    return capabilities[specialization] || ['general-purpose']
  }

  const spawnNewAgent = async (config: any) => {
    if (!connected) {
      await connect()
    }
    
    try {
      const result = await registerAgent(
        config.name,
        config.specialization,
        config.endpoint
      )
      
      toast({
        title: 'Success',
        description: `Agent registered with ID: ${result.agentId}`,
        variant: 'success'
      })
      
      // Reload agents
      await loadBlockchainData()
      setShowSpawnModal(false)
      
    } catch (error) {
      console.error('Failed to spawn agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to register agent on blockchain',
        variant: 'destructive'
      })
    }
  }

  const handleAssignTask = async (agentId: string) => {
    if (!connected) {
      await connect()
    }
    
    // Find an unassigned task
    const unassignedTask = tasks.find(t => !t.assignedTo && !t.isCompleted)
    
    if (!unassignedTask) {
      toast({
        title: 'No Tasks Available',
        description: 'Create a new task first',
        variant: 'warning'
      })
      return
    }
    
    setAssigningTask(agentId)
    
    try {
      await assignTask(unassignedTask.id, agentId)
      
      toast({
        title: 'Task Assigned',
        description: `Task ${unassignedTask.id} assigned to Agent ${agentId}`,
        variant: 'success'
      })
      
      // Reload data
      await loadBlockchainData()
      
    } catch (error) {
      console.error('Failed to assign task:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign task',
        variant: 'destructive'
      })
    } finally {
      setAssigningTask(null)
    }
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
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
        <span className="ml-2 text-white">Loading blockchain data...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Agent Swarm</h1>
        <p className="text-gray-400">
          Real blockchain-registered autonomous AI agents
        </p>
        {connected ? (
          <Badge variant="success" className="mt-2">
            <CheckCircle className="w-4 h-4 mr-1" />
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          </Badge>
        ) : (
          <Button onClick={connect} size="sm" className="mt-2">
            Connect Wallet
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search agents by name, specialization, or capability..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
          />
        </div>
        <Button
          onClick={() => setShowSpawnModal(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          disabled={!connected}
        >
          <Plus className="mr-2" />
          Register New Agent
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
                <p className="text-sm text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold text-blue-400">
                  {agents.reduce((sum, a) => sum + a.tasksCompleted, 0)}
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
                  <CardTitle className="text-white">{agent.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    ID: {agent.id} • {agent.specialization}
                  </CardDescription>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Wallet Address */}
                <div className="text-xs text-gray-500">
                  {agent.walletAddress.slice(0, 10)}...{agent.walletAddress.slice(-8)}
                </div>
                
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
                    <p className="text-gray-400">Tasks</p>
                    <p className="text-white font-semibold">{agent.tasksCompleted}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Reputation</p>
                    <p className="text-yellow-400 font-semibold">⭐ {agent.reputation.toFixed(1)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      window.open(`https://sepolia.basescan.org/address/${agent.walletAddress}`, '_blank')
                    }}
                  >
                    View on Explorer
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black"
                    onClick={() => handleAssignTask(agent.id)}
                    disabled={!connected || assigningTask === agent.id}
                  >
                    {assigningTask === agent.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Assign Task'
                    )}
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