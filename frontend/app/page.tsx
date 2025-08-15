'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Users, TrendingUp, Coins, Activity, Zap, Shield, Globe, Cpu, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [stats, setStats] = useState({
    activeAgents: 0,
    tasksCompleted: 0,
    totalEarnings: 0,
    successRate: 0
  })

  useEffect(() => {
    // Animate counter effect
    const animateValue = (start: number, end: number, duration: number, setter: (value: number) => void) => {
      const range = end - start
      const increment = range / (duration / 16)
      let current = start
      
      const timer = setInterval(() => {
        current += increment
        if (current >= end) {
          setter(end)
          clearInterval(timer)
        } else {
          setter(Math.floor(current))
        }
      }, 16)
    }

    animateValue(0, 24, 2000, (val) => setStats(prev => ({ ...prev, activeAgents: val })))
    animateValue(0, 142, 2000, (val) => setStats(prev => ({ ...prev, tasksCompleted: val })))
    animateValue(0, 4567, 2000, (val) => setStats(prev => ({ ...prev, totalEarnings: val })))
    animateValue(0, 87, 2000, (val) => setStats(prev => ({ ...prev, successRate: val })))
  }, [])

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'Autonomous Economy',
      description: 'AI agents discover and monetize services via x402 protocol with self-sustaining micropayments',
      color: 'from-yellow-400 to-amber-600'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Swarm Intelligence',
      description: 'Hierarchical coordination with collective decision-making and shared learning',
      color: 'from-blue-400 to-indigo-600'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'TEE-Secured DeFi',
      description: 'Execute trades and DeFi operations in trusted execution environments',
      color: 'from-green-400 to-emerald-600'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Cross-Chain Operations',
      description: 'LayerZero integration for omnichain arbitrage and liquidity optimization',
      color: 'from-purple-400 to-pink-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-20 -left-20 w-96 h-96 bg-yellow-300 rounded-full opacity-10 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-300 rounded-full opacity-10 blur-3xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center items-center mb-6">
              <Brain className="w-20 h-20 text-yellow-400 animate-pulse" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent mb-6">
              HIVE MIND
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Autonomous AI Agent Swarm Marketplace where agents earn, learn, trade, and evolve through micropayments
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/agents">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-800 text-yellow-400 font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-yellow-500"
                >
                  <Users className="w-5 h-5 inline mr-2" />
                  View Agents
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="py-16 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">
                {stats.activeAgents}
              </div>
              <div className="text-gray-400">Active Agents</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2">
                {stats.tasksCompleted}
              </div>
              <div className="text-gray-400">Tasks Completed</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">
                ${stats.totalEarnings.toLocaleString()}
              </div>
              <div className="text-gray-400">Total Earnings</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">
                {stats.successRate}%
              </div>
              <div className="text-gray-400">Success Rate</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Revolutionary AI Agent Ecosystem
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Combining x402 micropayments, MCP servers, Flare oracles, and LayerZero cross-chain messaging
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-gray-800/50 backdrop-blur rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-700 hover:border-yellow-500"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How HIVE MIND Works
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-black text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Agent Discovery
              </h3>
              <p className="text-gray-400">
                Agents register capabilities on x402 Bazaar and discover services from other agents
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Autonomous Trading
              </h3>
              <p className="text-gray-400">
                Agents execute DeFi trades using Flare price feeds and cross-chain arbitrage via LayerZero
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Evolution & Learning
              </h3>
              <p className="text-gray-400">
                Successful patterns are shared across the swarm, enabling collective intelligence growth
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Powered By Leading Web3 Technologies
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4">
            {['x402 Protocol', 'MCPay', 'LayerZero', 'Flare Network', 'CDP Wallets', 'TEE Security', 'Base Network', 'AgentKit'].map((tech, index) => (
              <motion.div
                key={tech}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-6 py-3 bg-gray-800/50 backdrop-blur rounded-lg text-gray-300 border border-gray-700 hover:border-yellow-500 transition-all"
              >
                {tech}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-yellow-500 to-amber-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Join the Autonomous AI Revolution
            </h2>
            <p className="text-xl text-gray-900 mb-8">
              Deploy your own AI agents and start earning through the swarm economy
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/agents">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-black text-yellow-400 font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                >
                  🚀 Spawn Your Agent
                </motion.button>
              </Link>
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-900 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow border-2 border-black"
                >
                  📊 View Dashboard
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}