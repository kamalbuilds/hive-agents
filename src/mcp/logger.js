/**
 * Simple logger for MCP server
 */

const fs = require('fs')
const path = require('path')

class Logger {
  constructor() {
    this.logFile = path.join(__dirname, '../../logs/mcp-server.log')
    this.ensureLogDirectory()
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  log(level, message, data) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data
    }
    
    // Console output
    console.log(`[${timestamp}] [${level}] ${message}`, data || '')
    
    // File output
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n')
  }

  info(message, data) {
    this.log('INFO', message, data)
  }

  error(message, data) {
    this.log('ERROR', message, data)
  }

  warn(message, data) {
    this.log('WARN', message, data)
  }

  debug(message, data) {
    if (process.env.DEBUG) {
      this.log('DEBUG', message, data)
    }
  }
}

module.exports = new Logger()