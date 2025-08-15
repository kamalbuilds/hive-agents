// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title HiveMindCoordinator
 * @notice Coordinates AI agent swarm operations with micropayments
 * @dev Manages agent registration, task distribution, and earnings
 */
contract HiveMindCoordinator is Ownable, ReentrancyGuard {
    
    // Agent structure
    struct Agent {
        address wallet;
        string endpoint;
        string[] capabilities;
        uint256 reputation;
        uint256 earnings;
        uint256 tasksCompleted;
        bool active;
        uint256 registeredAt;
    }
    
    // Task structure
    struct Task {
        uint256 id;
        address requester;
        string taskType;
        string ipfsHash; // Task details stored on IPFS
        uint256 reward;
        address assignedAgent;
        TaskStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }
    
    enum TaskStatus {
        Pending,
        Assigned,
        InProgress,
        Completed,
        Failed,
        Disputed
    }
    
    // State variables
    IERC20 public paymentToken; // USDC or other stablecoin
    uint256 public taskCounter;
    uint256 public platformFee = 100; // 1% = 100 basis points
    uint256 public minReputation = 100;
    uint256 public totalEarnings;
    
    // Mappings
    mapping(address => Agent) public agents;
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public agentTasks;
    mapping(string => address[]) public capabilityToAgents;
    
    // Arrays for enumeration
    address[] public registeredAgents;
    
    // Events
    event AgentRegistered(address indexed agent, string endpoint);
    event AgentUpdated(address indexed agent, string[] capabilities);
    event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 reward);
    event TaskAssigned(uint256 indexed taskId, address indexed agent);
    event TaskCompleted(uint256 indexed taskId, address indexed agent, uint256 reward);
    event TaskFailed(uint256 indexed taskId, address indexed agent);
    event ReputationUpdated(address indexed agent, uint256 newReputation);
    event EarningsWithdrawn(address indexed agent, uint256 amount);
    
    constructor(address _paymentToken) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
    }
    
    /**
     * @notice Register a new agent in the swarm
     * @param endpoint Agent's API endpoint
     * @param capabilities Array of agent capabilities
     */
    function registerAgent(
        string memory endpoint,
        string[] memory capabilities
    ) external {
        require(bytes(endpoint).length > 0, "Invalid endpoint");
        require(capabilities.length > 0, "No capabilities provided");
        require(!agents[msg.sender].active, "Agent already registered");
        
        Agent storage newAgent = agents[msg.sender];
        newAgent.wallet = msg.sender;
        newAgent.endpoint = endpoint;
        newAgent.capabilities = capabilities;
        newAgent.reputation = minReputation;
        newAgent.active = true;
        newAgent.registeredAt = block.timestamp;
        
        registeredAgents.push(msg.sender);
        
        // Map capabilities to agent
        for (uint i = 0; i < capabilities.length; i++) {
            capabilityToAgents[capabilities[i]].push(msg.sender);
        }
        
        emit AgentRegistered(msg.sender, endpoint);
    }
    
    /**
     * @notice Update agent capabilities
     * @param capabilities New array of capabilities
     */
    function updateCapabilities(string[] memory capabilities) external {
        require(agents[msg.sender].active, "Agent not registered");
        require(capabilities.length > 0, "No capabilities provided");
        
        // Clear old capability mappings
        string[] memory oldCapabilities = agents[msg.sender].capabilities;
        for (uint i = 0; i < oldCapabilities.length; i++) {
            _removeFromCapabilityMapping(oldCapabilities[i], msg.sender);
        }
        
        // Update capabilities
        agents[msg.sender].capabilities = capabilities;
        
        // Update capability mappings
        for (uint i = 0; i < capabilities.length; i++) {
            capabilityToAgents[capabilities[i]].push(msg.sender);
        }
        
        emit AgentUpdated(msg.sender, capabilities);
    }
    
    /**
     * @notice Create a new task
     * @param taskType Type of task
     * @param ipfsHash IPFS hash containing task details
     * @param reward Task reward amount
     */
    function createTask(
        string memory taskType,
        string memory ipfsHash,
        uint256 reward
    ) external nonReentrant returns (uint256) {
        require(reward > 0, "Invalid reward amount");
        require(bytes(taskType).length > 0, "Invalid task type");
        require(bytes(ipfsHash).length > 0, "Invalid IPFS hash");
        
        // Transfer reward to contract
        require(
            paymentToken.transferFrom(msg.sender, address(this), reward),
            "Payment transfer failed"
        );
        
        taskCounter++;
        
        Task storage newTask = tasks[taskCounter];
        newTask.id = taskCounter;
        newTask.requester = msg.sender;
        newTask.taskType = taskType;
        newTask.ipfsHash = ipfsHash;
        newTask.reward = reward;
        newTask.status = TaskStatus.Pending;
        newTask.createdAt = block.timestamp;
        
        emit TaskCreated(taskCounter, msg.sender, reward);
        
        return taskCounter;
    }
    
    /**
     * @notice Assign task to an agent
     * @param taskId Task ID to assign
     * @param agent Agent address to assign to
     */
    function assignTask(uint256 taskId, address agent) external {
        Task storage task = tasks[taskId];
        require(task.id != 0, "Task does not exist");
        require(task.status == TaskStatus.Pending, "Task not available");
        require(agents[agent].active, "Agent not active");
        require(
            msg.sender == task.requester || msg.sender == owner(),
            "Not authorized"
        );
        
        task.assignedAgent = agent;
        task.status = TaskStatus.Assigned;
        agentTasks[agent].push(taskId);
        
        emit TaskAssigned(taskId, agent);
    }
    
    /**
     * @notice Mark task as completed and distribute rewards
     * @param taskId Task ID to complete
     */
    function completeTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.id != 0, "Task does not exist");
        require(
            task.status == TaskStatus.Assigned || 
            task.status == TaskStatus.InProgress,
            "Task not in progress"
        );
        require(
            msg.sender == task.assignedAgent || 
            msg.sender == task.requester ||
            msg.sender == owner(),
            "Not authorized"
        );
        
        task.status = TaskStatus.Completed;
        task.completedAt = block.timestamp;
        
        // Calculate platform fee
        uint256 fee = (task.reward * platformFee) / 10000;
        uint256 agentReward = task.reward - fee;
        
        // Update agent stats
        Agent storage agent = agents[task.assignedAgent];
        agent.earnings += agentReward;
        agent.tasksCompleted++;
        agent.reputation = _calculateReputation(agent);
        
        totalEarnings += fee;
        
        // Transfer reward to agent
        require(
            paymentToken.transfer(task.assignedAgent, agentReward),
            "Reward transfer failed"
        );
        
        emit TaskCompleted(taskId, task.assignedAgent, agentReward);
        emit ReputationUpdated(task.assignedAgent, agent.reputation);
    }
    
    /**
     * @notice Mark task as failed
     * @param taskId Task ID that failed
     */
    function failTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.id != 0, "Task does not exist");
        require(
            task.status == TaskStatus.Assigned || 
            task.status == TaskStatus.InProgress,
            "Task not in progress"
        );
        require(
            msg.sender == task.assignedAgent || 
            msg.sender == task.requester ||
            msg.sender == owner(),
            "Not authorized"
        );
        
        task.status = TaskStatus.Failed;
        
        // Reduce agent reputation
        Agent storage agent = agents[task.assignedAgent];
        agent.reputation = (agent.reputation * 90) / 100; // 10% reduction
        
        // Refund task requester
        require(
            paymentToken.transfer(task.requester, task.reward),
            "Refund transfer failed"
        );
        
        emit TaskFailed(taskId, task.assignedAgent);
        emit ReputationUpdated(task.assignedAgent, agent.reputation);
    }
    
    /**
     * @notice Get agents with specific capability
     * @param capability Capability to search for
     * @return Array of agent addresses
     */
    function getAgentsByCapability(string memory capability) 
        external 
        view 
        returns (address[] memory) 
    {
        return capabilityToAgents[capability];
    }
    
    /**
     * @notice Get agent details
     * @param agent Agent address
     * @return Agent struct
     */
    function getAgent(address agent) 
        external 
        view 
        returns (Agent memory) 
    {
        return agents[agent];
    }
    
    /**
     * @notice Get task details
     * @param taskId Task ID
     * @return Task struct
     */
    function getTask(uint256 taskId) 
        external 
        view 
        returns (Task memory) 
    {
        return tasks[taskId];
    }
    
    /**
     * @notice Get tasks assigned to an agent
     * @param agent Agent address
     * @return Array of task IDs
     */
    function getAgentTasks(address agent) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return agentTasks[agent];
    }
    
    /**
     * @notice Withdraw platform earnings (owner only)
     */
    function withdrawPlatformEarnings() external onlyOwner nonReentrant {
        uint256 amount = totalEarnings;
        totalEarnings = 0;
        
        require(
            paymentToken.transfer(owner(), amount),
            "Withdrawal failed"
        );
        
        emit EarningsWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Update platform fee (owner only)
     * @param newFee New fee in basis points (100 = 1%)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
    
    /**
     * @notice Calculate agent reputation based on performance
     * @param agent Agent struct
     * @return New reputation score
     */
    function _calculateReputation(Agent memory agent) 
        private 
        pure 
        returns (uint256) 
    {
        if (agent.tasksCompleted == 0) {
            return agent.reputation;
        }
        
        // Simple reputation calculation
        // Can be enhanced with more sophisticated algorithms
        uint256 baseScore = minReputation;
        uint256 performanceBonus = agent.tasksCompleted * 10;
        uint256 earningsBonus = agent.earnings / 1e18; // Per token earned
        
        return baseScore + performanceBonus + earningsBonus;
    }
    
    /**
     * @notice Remove agent from capability mapping
     * @param capability Capability string
     * @param agent Agent address to remove
     */
    function _removeFromCapabilityMapping(
        string memory capability, 
        address agent
    ) private {
        address[] storage agents = capabilityToAgents[capability];
        for (uint i = 0; i < agents.length; i++) {
            if (agents[i] == agent) {
                agents[i] = agents[agents.length - 1];
                agents.pop();
                break;
            }
        }
    }
    
    /**
     * @notice Get total number of registered agents
     * @return Number of agents
     */
    function getAgentCount() external view returns (uint256) {
        return registeredAgents.length;
    }
    
    /**
     * @notice Get total number of tasks
     * @return Number of tasks
     */
    function getTaskCount() external view returns (uint256) {
        return taskCounter;
    }
}