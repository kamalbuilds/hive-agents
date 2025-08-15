'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check, Clock, AlertCircle, Zap, DollarSign, Brain, Target, Filter, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface Task {
  id: string
  title: string
  description: string
  type: 'analysis' | 'prediction' | 'arbitrage' | 'optimization' | 'data-collection'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed'
  reward: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo?: string
  createdAt: Date
  deadline?: Date
  completedAt?: Date
  requirements: string[]
  progress?: number
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'task-001',
      title: 'Analyze FLR/USD Price Movements',
      description: 'Perform sentiment analysis and technical analysis on FLR price data',
      type: 'analysis',
      status: 'in_progress',
      reward: 0.05,
      priority: 'high',
      assignedTo: 'analyst-003',
      createdAt: new Date(Date.now() - 3600000),
      deadline: new Date(Date.now() + 7200000),
      requirements: ['data-analysis', 'pattern-recognition'],
      progress: 67
    },
    {
      id: 'task-002',
      title: 'Cross-Chain Arbitrage Opportunity',
      description: 'Identify and execute arbitrage between Base and Flare networks',
      type: 'arbitrage',
      status: 'assigned',
      reward: 0.1,
      priority: 'critical',
      assignedTo: 'trader-002',
      createdAt: new Date(Date.now() - 1800000),
      deadline: new Date(Date.now() + 3600000),
      requirements: ['arbitrage', 'cross-chain', 'fast-execution']
    },
    {
      id: 'task-003',
      title: 'Optimize Yield Farming Strategy',
      description: 'Analyze current DeFi positions and optimize for maximum yield',
      type: 'optimization',
      status: 'pending',
      reward: 0.08,
      priority: 'medium',
      createdAt: new Date(Date.now() - 7200000),
      requirements: ['yield-farming', 'portfolio-optimization']
    },
    {
      id: 'task-004',
      title: 'Predict XRP Price Movement',
      description: 'Use neural network to predict XRP price in next 24 hours',
      type: 'prediction',
      status: 'completed',
      reward: 0.03,
      priority: 'low',
      assignedTo: 'predictor-001',
      createdAt: new Date(Date.now() - 86400000),
      completedAt: new Date(Date.now() - 3600000),
      requirements: ['price-prediction', 'neural-network']
    }
  ])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'assigned':
        return <Target className="w-4 h-4" />
      case 'in_progress':
        return <Zap className="w-4 h-4" />
      case 'completed':
        return <Check className="w-4 h-4" />
      case 'failed':
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'assigned':
        return 'default'
      case 'in_progress':
        return 'warning'
      case 'completed':
        return 'success'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'warning'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterType !== 'all' && task.type !== filterType) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !task.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-yellow-400" />
            Task Management
          </h1>
          <p className="text-gray-300">Coordinate and distribute tasks across the AI agent swarm</p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap gap-4"
        >
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
          </div>
          
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800/50 border-gray-700 text-white min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </Select>

          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800/50 border-gray-700 text-white min-w-[150px]"
          >
            <option value="all">All Types</option>
            <option value="analysis">Analysis</option>
            <option value="prediction">Prediction</option>
            <option value="arbitrage">Arbitrage</option>
            <option value="optimization">Optimization</option>
            <option value="data-collection">Data Collection</option>
          </Select>

          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </motion.div>

        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Tasks</p>
                    <p className="text-2xl font-bold text-white">{tasks.length}</p>
                  </div>
                  <Brain className="w-8 h-8 text-purple-400" />
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">In Progress</p>
                    <p className="text-2xl font-bold text-white">
                      {tasks.filter(t => t.status === 'in_progress').length}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-yellow-400" />
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Completed</p>
                    <p className="text-2xl font-bold text-white">
                      {tasks.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                  <Check className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Rewards</p>
                    <p className="text-2xl font-bold text-white">
                      ${tasks.reduce((sum, t) => sum + t.reward, 0).toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="bg-gray-800/50 backdrop-blur border-gray-700 hover:border-yellow-500 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                        <Badge variant={getStatusColor(task.status)} className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-gray-300 border-gray-600">
                          {task.type}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-400 mb-3">{task.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <DollarSign className="w-4 h-4" />
                          <span>${task.reward.toFixed(2)} USDC</span>
                        </div>
                        
                        {task.assignedTo && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Target className="w-4 h-4" />
                            <span>Assigned to: {task.assignedTo}</span>
                          </div>
                        )}
                        
                        {task.deadline && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Clock className="w-4 h-4" />
                            <span>Deadline: {new Date(task.deadline).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {task.progress !== undefined && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white">{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <motion.div
                              className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-green-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {task.requirements.map((req) => (
                          <Badge key={req} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                            {req}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      {task.status === 'pending' && (
                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                          Assign
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300">
                          View Details
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <Button size="sm" variant="outline" className="border-green-600 text-green-400">
                          View Results
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}