/**
 * MCP Server Implementation
 * Handles Model Context Protocol communication
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
const logger = require('./logger')

class MCPServer {
  constructor() {
    this.server = new Server({
      name: 'hive-mind-mcp',
      version: '1.0.0',
      capabilities: {
        tools: {}
      }
    })
    
    this.tools = new Map()
  }

  registerTool(name, schema, handler) {
    this.tools.set(name, { schema, handler })
    logger.info(`Registered MCP tool: ${name}`)
  }

  async start() {
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
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    
    logger.info('MCP Server started successfully')
  }

  async stop() {
    await this.server.close()
    logger.info('MCP Server stopped')
  }
}

module.exports = { MCPServer }