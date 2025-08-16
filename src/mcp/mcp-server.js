/**
 * MCP Server Implementation
 * Handles Model Context Protocol communication
 */

const logger = require('./logger')

class MCPServer {
  constructor() {
    this.server = null
    this.StdioServerTransport = null
    this.tools = new Map()
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return
    
    // Dynamic import for ES modules
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js')
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
    
    this.StdioServerTransport = StdioServerTransport
    this.server = new Server({
      name: 'hive-mind-mcp',
      version: '1.0.0',
      capabilities: {
        tools: {}
      }
    })
    
    this.initialized = true
    logger.info('MCP Server initialized')
  }

  registerTool(name, schema, handler) {
    this.tools.set(name, { schema, handler })
    logger.info(`Registered MCP tool: ${name}`)
  }

  async start() {
    await this.initialize()
    
    // Register all tools with the server
    for (const [name, { schema, handler }] of this.tools) {
      this.server.setRequestHandler(`tools/${name}`, async (request) => {
        try {
          logger.info(`MCP tool called: ${name}`, request.params)
          const result = await handler(request.params)
          return result
        } catch (error) {
          logger.error(`MCP tool error: ${name}`, error)
          throw error
        }
      })
    }

    // Set up tools list handler
    this.server.setRequestHandler('tools/list', async () => {
      const toolsList = Array.from(this.tools.entries()).map(([name, { schema }]) => ({
        name,
        ...schema
      }))
      return { tools: toolsList }
    })

    // Start the server with stdio transport
    const transport = new this.StdioServerTransport()
    await this.server.connect(transport)
    
    logger.info('MCP Server started successfully')
  }

  async stop() {
    if (this.server) {
      await this.server.close()
      logger.info('MCP Server stopped')
    }
  }
}

module.exports = { MCPServer }