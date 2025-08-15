'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check, Clock, AlertCircle, Zap, DollarSign, Brain, Target, Filter, Search, Loader2, Eye, Send, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useContract } from '@/lib/contract-integration'
import { toast } from '@/components/ui/toast'

interface Task {
  id: string
  description: string
  reward: string
  creator: string
  assignedTo: string | null
  isCompleted: boolean
  deadline: Date
  createdAt: Date
  completedAt: Date | null
  status: 'pending' | 'assigned' | 'in_progress' | 'completed'
  type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface Agent {
  id: string
  name: string
  specialization: string
  isActive: boolean
}

export default function DynamicTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  
  // Form state for new task
  const [newTask, setNewTask] = useState({
    description: '',
    reward: '0.1',
    deadline: 24, // hours from now
    type: 'analysis'
  })
  
  const {
    connect,
    connected,
    address,
    getAllTasks,
    getAllAgents,
    createTask,
    assignTask,
    completeTask
  } = useContract('base-sepolia')

  // Load tasks and agents from blockchain
  useEffect(() => {
    loadBlockchainData()
  }, [connected])

  const loadBlockchainData = async () => {
    setLoading(true)
    try {
      // Fetch tasks from smart contract
      const contractTasks = await getAllTasks()
      const formattedTasks: Task[] = contractTasks.map((task: any) => ({
        ...task,
        status: getTaskStatus(task),
        type: getTaskType(task.description),
        priority: getTaskPriority(task.reward)
      }))
      
      setTasks(formattedTasks)
      
      // Fetch agents
      const contractAgents = await getAllAgents()
      setAgents(contractAgents)
      
    } catch (error) {
      console.error('Failed to load blockchain data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTaskStatus = (task: any): Task['status'] => {
    if (task.isCompleted) return 'completed'
    if (task.assignedTo && task.assignedTo !== '0') return 'assigned'
    return 'pending'
  }

  const getTaskType = (description: string): string => {
    const desc = description.toLowerCase()
    if (desc.includes('analysis')) return 'analysis'
    if (desc.includes('predict')) return 'prediction'
    if (desc.includes('arbitrage')) return 'arbitrage'
    if (desc.includes('optimize')) return 'optimization'
    if (desc.includes('data')) return 'data-collection'
    return 'general'
  }

  const getTaskPriority = (reward: string): Task['priority'] => {
    const rewardNum = parseFloat(reward)
    if (rewardNum >= 1) return 'critical'
    if (rewardNum >= 0.5) return 'high'
    if (rewardNum >= 0.1) return 'medium'
    return 'low'
  }

  const handleCreateTask = async () => {
    if (!connected) {
      await connect()
    }
    
    if (!newTask.description) {
      toast({
        title: 'Error',
        description: 'Please enter a task description',
        variant: 'destructive'
      })
      return
    }
    
    setCreating(true)
    
    try {
      const deadline = Math.floor(Date.now() / 1000) + (newTask.deadline * 3600)
      
      const result = await createTask(
        newTask.description,
        parseFloat(newTask.reward),
        deadline
      )
      
      toast({
        title: 'Task Created',
        description: `Task ID: ${result.taskId}`,
        variant: 'success'
      })
      
      // Reset form
      setNewTask({
        description: '',
        reward: '0.1',
        deadline: 24,
        type: 'analysis'
      })
      
      setShowCreateModal(false)
      
      // Reload tasks
      await loadBlockchainData()
      
    } catch (error) {
      console.error('Failed to create task:', error)
      toast({
        title: 'Error',
        description: 'Failed to create task on blockchain',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleAssignTask = async (taskId: string) => {
    if (!connected) {
      await connect()
    }
    
    // Find an available agent
    const availableAgent = agents.find(a => a.isActive)
    
    if (!availableAgent) {
      toast({
        title: 'No Agents Available',
        description: 'Register an agent first',
        variant: 'warning'
      })
      return
    }
    
    setAssigning(taskId)
    
    try {
      await assignTask(taskId, availableAgent.id)
      
      toast({
        title: 'Task Assigned',
        description: `Assigned to ${availableAgent.name}`,
        variant: 'success'
      })
      
      await loadBlockchainData()
      
    } catch (error) {
      console.error('Failed to assign task:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign task',
        variant: 'destructive'
      })
    } finally {
      setAssigning(null)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    if (!connected) {
      await connect()
    }
    
    setCompleting(taskId)
    
    try {
      const result = `Task ${taskId} completed successfully with results`
      await completeTask(taskId, result)
      
      toast({
        title: 'Task Completed',
        description: 'Rewards distributed',
        variant: 'success'
      })
      
      await loadBlockchainData()
      
    } catch (error) {
      console.error('Failed to complete task:', error)
      toast({
        title: 'Error',
        description: 'Failed to complete task',
        variant: 'destructive'
      })
    } finally {
      setCompleting(null)
    }
  }

  const viewTaskDetails = (task: Task) => {
    setSelectedTask(task)
    setShowDetailsModal(true)
  }

  const viewTaskResults = (task: Task) => {
    // Open results in explorer or modal
    window.open(`https://sepolia.basescan.org/tx/${task.id}`, '_blank')
  }

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
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return 'secondary'
      case 'assigned': return 'default'
      case 'in_progress': return 'warning'
      case 'completed': return 'success'
      default: return 'secondary'
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'warning'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (searchQuery && !task.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
        <span className="ml-2 text-white">Loading tasks from blockchain...</span>
      </div>
    )
  }

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
          <p className="text-gray-300">
            Blockchain-based task coordination for AI agents
          </p>
          {connected ? (
            <Badge variant="success" className="mt-2">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </Badge>
          ) : (
            <Button onClick={connect} size="sm" className="mt-2">
              Connect Wallet
            </Button>
          )}
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
            <option value="completed">Completed</option>
          </Select>

          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
            disabled={!connected}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </motion.div>

        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

          <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Assigned</p>
                  <p className="text-2xl font-bold text-white">
                    {tasks.filter(t => t.status === 'assigned').length}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

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

          <Card className="bg-gray-800/50 backdrop-blur border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Rewards</p>
                  <p className="text-2xl font-bold text-white">
                    ${tasks.reduce((sum, t) => sum + parseFloat(t.reward), 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
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
                        <h3 className="text-lg font-semibold text-white">Task #{task.id}</h3>
                        <Badge variant={getStatusColor(task.status)} className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          {task.status}
                        </Badge>
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-400 mb-3">{task.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <DollarSign className="w-4 h-4" />
                          <span>${task.reward} USDC</span>
                        </div>
                        
                        {task.assignedTo && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Target className="w-4 h-4" />
                            <span>Agent #{task.assignedTo}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="w-4 h-4" />
                          <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      {task.status === 'pending' && (
                        <Button 
                          size="sm" 
                          className="bg-blue-500 hover:bg-blue-600"
                          onClick={() => handleAssignTask(task.id)}
                          disabled={assigning === task.id}
                        >
                          {assigning === task.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              Assign
                            </>
                          )}
                        </Button>
                      )}
                      
                      {task.status === 'assigned' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-gray-600 text-gray-300"
                            onClick={() => viewTaskDetails(task)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={completing === task.id}
                          >
                            {completing === task.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Complete
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      
                      {task.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-green-600 text-green-400"
                          onClick={() => viewTaskResults(task)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
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

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-white">Create New Task</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <textarea
                      className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      rows={3}
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      placeholder="Describe the task..."
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Reward (USDC)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newTask.reward}
                      onChange={(e) => setNewTask({...newTask, reward: e.target.value})}
                      className="bg-gray-700 text-white border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Deadline (hours from now)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({...newTask, deadline: parseInt(e.target.value)})}
                      className="bg-gray-700 text-white border-gray-600"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowCreateModal(false)}
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-300"
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTask}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                      disabled={creating || !newTask.description}
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create Task'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}