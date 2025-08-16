// Swarm Coordination System
import EventEmitter from 'events';
import axios from 'axios';

class SwarmCoordinator extends EventEmitter {
  constructor(config) {
    super();
    this.swarmId = config.swarmId || `swarm-${Date.now()}`;
    this.queenAddress = config.queenAddress;
    this.agents = new Map();
    this.tasks = new Map();
    this.sharedMemory = new Map();
    this.consensusThreshold = config.consensusThreshold || 0.51;
    
    this.topology = config.topology || 'hierarchical';
    this.maxAgents = config.maxAgents || 10;
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('agent-joined', (agent) => {
      console.log(`🐝 Agent ${agent.id} joined the swarm`);
      this.redistributeTasks();
    });
    
    this.on('task-completed', (taskId, result) => {
      console.log(`✅ Task ${taskId} completed`);
      this.handleTaskCompletion(taskId, result);
    });
    
    this.on('consensus-required', (topic) => {
      console.log(`🗳️ Consensus required for: ${topic}`);
      this.initiateConsensus(topic);
    });
  }

  // Register new agent in swarm
  async registerAgent(agentConfig) {
    const agent = {
      id: agentConfig.id || `agent-${Date.now()}`,
      type: agentConfig.type,
      capabilities: agentConfig.capabilities || [],
      endpoint: agentConfig.endpoint,
      status: 'active',
      tasks: [],
      earnings: 0,
      reputation: 1.0,
      joinedAt: Date.now()
    };
    
    this.agents.set(agent.id, agent);
    this.emit('agent-joined', agent);
    
    return agent;
  }

  // Create and distribute task
  async createTask(taskConfig) {
    const task = {
      id: `task-${Date.now()}`,
      type: taskConfig.type,
      description: taskConfig.description,
      requiredCapabilities: taskConfig.requiredCapabilities || [],
      priority: taskConfig.priority || 'normal',
      reward: taskConfig.reward || 0.01,
      status: 'pending',
      assignedTo: null,
      createdAt: Date.now()
    };
    
    this.tasks.set(task.id, task);
    
    // Find suitable agent
    const agent = this.findBestAgent(task);
    
    if (agent) {
      await this.assignTask(task, agent);
    } else {
      console.log(`⚠️ No suitable agent for task ${task.id}`);
      task.status = 'queued';
    }
    
    return task;
  }

  // Find best agent for task
  findBestAgent(task) {
    let bestAgent = null;
    let bestScore = 0;
    
    for (const [agentId, agent] of this.agents) {
      if (agent.status !== 'active') continue;
      
      // Check if agent has required capabilities
      const hasCapabilities = task.requiredCapabilities.every(
        cap => agent.capabilities.includes(cap)
      );
      
      if (!hasCapabilities) continue;
      
      // Calculate agent score
      const workload = agent.tasks.length;
      const score = agent.reputation / (workload + 1);
      
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }
    
    return bestAgent;
  }

  // Assign task to agent
  async assignTask(task, agent) {
    task.assignedTo = agent.id;
    task.status = 'assigned';
    agent.tasks.push(task.id);
    
    try {
      // Notify agent of new task
      await axios.post(`${agent.endpoint}/api/swarm/message`, {
        fromAgent: 'queen',
        message: {
          type: 'task-request',
          task: task
        },
        priority: task.priority
      });
      
      console.log(`📋 Task ${task.id} assigned to ${agent.id}`);
      
      // Monitor task execution
      this.monitorTask(task.id);
      
    } catch (error) {
      console.error(`Failed to assign task to ${agent.id}:`, error);
      task.status = 'failed';
      agent.tasks = agent.tasks.filter(t => t !== task.id);
    }
  }

  // Monitor task execution
  async monitorTask(taskId) {
    const checkInterval = setInterval(async () => {
      const task = this.tasks.get(taskId);
      
      if (!task || task.status === 'completed' || task.status === 'failed') {
        clearInterval(checkInterval);
        return;
      }
      
      // Check task status with assigned agent
      const agent = this.agents.get(task.assignedTo);
      if (!agent) {
        task.status = 'failed';
        clearInterval(checkInterval);
        return;
      }
      
      // Timeout after 5 minutes
      if (Date.now() - task.createdAt > 300000) {
        task.status = 'timeout';
        this.reassignTask(task);
        clearInterval(checkInterval);
      }
    }, 30000); // Check every 30 seconds
  }

  // Reassign failed task
  async reassignTask(task) {
    const previousAgent = task.assignedTo;
    task.assignedTo = null;
    task.status = 'pending';
    
    // Reduce reputation of failed agent
    if (previousAgent) {
      const agent = this.agents.get(previousAgent);
      if (agent) {
        agent.reputation *= 0.9;
        agent.tasks = agent.tasks.filter(t => t !== task.id);
      }
    }
    
    // Find new agent
    const newAgent = this.findBestAgent(task);
    if (newAgent && newAgent.id !== previousAgent) {
      await this.assignTask(task, newAgent);
    }
  }

  // Handle task completion
  async handleTaskCompletion(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'completed';
    task.result = result;
    task.completedAt = Date.now();
    
    // Reward agent
    const agent = this.agents.get(task.assignedTo);
    if (agent) {
      agent.earnings += task.reward;
      agent.reputation = Math.min(agent.reputation * 1.1, 5.0);
      agent.tasks = agent.tasks.filter(t => t !== taskId);
      
      console.log(`💰 Agent ${agent.id} earned ${task.reward} USDC`);
    }
    
    // Store result in shared memory
    this.sharedMemory.set(`task-result-${taskId}`, result);
    
    // Notify swarm of completion
    this.broadcastToSwarm({
      type: 'task-completed',
      taskId,
      result
    });
  }

  // Initiate consensus voting
  async initiateConsensus(topic, options = {}) {
    const votes = new Map();
    const proposal = {
      id: `proposal-${Date.now()}`,
      topic,
      options: options.choices || ['yes', 'no'],
      deadline: Date.now() + (options.timeout || 60000),
      requiredVotes: Math.ceil(this.agents.size * this.consensusThreshold)
    };
    
    // Request votes from all agents
    const votePromises = [];
    for (const [agentId, agent] of this.agents) {
      if (agent.status !== 'active') continue;
      
      const votePromise = axios.post(`${agent.endpoint}/api/swarm/message`, {
        fromAgent: 'queen',
        message: {
          type: 'consensus-vote',
          proposal
        },
        priority: 'high'
      }).then(response => {
        votes.set(agentId, response.data.vote);
      }).catch(error => {
        console.error(`Agent ${agentId} vote failed:`, error);
      });
      
      votePromises.push(votePromise);
    }
    
    // Wait for votes with timeout
    await Promise.race([
      Promise.all(votePromises),
      new Promise(resolve => setTimeout(resolve, options.timeout || 60000))
    ]);
    
    // Count votes
    const voteCounts = new Map();
    for (const vote of votes.values()) {
      voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
    }
    
    // Determine winner
    let winner = null;
    let maxVotes = 0;
    for (const [option, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }
    
    const result = {
      proposal: proposal.id,
      topic,
      winner,
      votes: Object.fromEntries(voteCounts),
      totalVotes: votes.size,
      consensus: maxVotes >= proposal.requiredVotes
    };
    
    console.log(`🗳️ Consensus result for ${topic}: ${winner} (${maxVotes}/${votes.size} votes)`);
    
    return result;
  }

  // Broadcast message to all agents
  async broadcastToSwarm(message) {
    const broadcasts = [];
    
    for (const [agentId, agent] of this.agents) {
      if (agent.status !== 'active') continue;
      
      const broadcast = axios.post(`${agent.endpoint}/api/swarm/message`, {
        fromAgent: 'queen',
        message,
        priority: message.priority || 'normal'
      }).catch(error => {
        console.error(`Broadcast to ${agentId} failed:`, error);
      });
      
      broadcasts.push(broadcast);
    }
    
    await Promise.all(broadcasts);
  }

  // Share knowledge across swarm
  async shareKnowledge(pattern, data) {
    const knowledge = {
      pattern,
      data,
      sharedBy: 'queen',
      timestamp: Date.now()
    };
    
    // Store in shared memory
    this.sharedMemory.set(`knowledge-${pattern}`, knowledge);
    
    // Broadcast to all agents for learning
    await this.broadcastToSwarm({
      type: 'knowledge-share',
      pattern,
      data
    });
    
    console.log(`🧠 Shared knowledge pattern: ${pattern}`);
  }

  // Redistribute tasks when agents join/leave
  async redistributeTasks() {
    const pendingTasks = [];
    
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'pending' || task.status === 'queued') {
        pendingTasks.push(task);
      }
    }
    
    for (const task of pendingTasks) {
      const agent = this.findBestAgent(task);
      if (agent) {
        await this.assignTask(task, agent);
      }
    }
  }

  // Get swarm statistics
  getStatistics() {
    const stats = {
      swarmId: this.swarmId,
      topology: this.topology,
      agents: {
        total: this.agents.size,
        active: Array.from(this.agents.values()).filter(a => a.status === 'active').length
      },
      tasks: {
        total: this.tasks.size,
        pending: Array.from(this.tasks.values()).filter(t => t.status === 'pending').length,
        assigned: Array.from(this.tasks.values()).filter(t => t.status === 'assigned').length,
        completed: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length
      },
      earnings: Array.from(this.agents.values()).reduce((sum, a) => sum + a.earnings, 0),
      sharedMemory: this.sharedMemory.size
    };
    
    return stats;
  }
}

export default SwarmCoordinator;