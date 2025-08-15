'use client';

import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trees, Droplets, Bug, Sprout, TrendingUp, Users, Coins } from 'lucide-react';

interface ImpactMetricsProps {
  metrics: {
    totalCarbon: number;
    totalBiodiversity: number;
    totalWater: number;
    totalSoil: number;
    communitiesSupported: number;
    creditsIssued: number;
    marketValue: number;
  };
  historicalData: any[];
}

export function ImpactMetrics({ metrics, historicalData }: ImpactMetricsProps) {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const pieData = [
    { name: 'Carbon', value: metrics.totalCarbon, color: '#10b981' },
    { name: 'Biodiversity', value: metrics.totalBiodiversity, color: '#3b82f6' },
    { name: 'Water', value: metrics.totalWater, color: '#06b6d4' },
    { name: 'Soil', value: metrics.totalSoil, color: '#f59e0b' },
  ];

  const MetricCard = ({ 
    icon, 
    label, 
    value, 
    unit, 
    trend, 
    color 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: number; 
    unit: string; 
    trend?: number; 
    color: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="w-4 h-4" />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {label} {unit}
      </p>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Trees className="w-6 h-6 text-white" />}
          label="Carbon Sequestered"
          value={metrics.totalCarbon}
          unit="tons CO₂"
          trend={12.5}
          color="bg-green-500"
        />
        <MetricCard
          icon={<Bug className="w-6 h-6 text-white" />}
          label="Biodiversity Index"
          value={metrics.totalBiodiversity}
          unit="avg score"
          trend={8.3}
          color="bg-blue-500"
        />
        <MetricCard
          icon={<Users className="w-6 h-6 text-white" />}
          label="Communities"
          value={metrics.communitiesSupported}
          unit="supported"
          trend={25}
          color="bg-purple-500"
        />
        <MetricCard
          icon={<Coins className="w-6 h-6 text-white" />}
          label="Market Value"
          value={metrics.marketValue}
          unit="HBAR"
          trend={15.7}
          color="bg-yellow-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historical Trends */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Environmental Impact Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="carbon" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="biodiversity" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="water" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Credit Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Credit Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Monthly Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Monthly Credit Generation
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="carbonCredits" fill="#10b981" />
            <Bar dataKey="biodiversityCredits" fill="#3b82f6" />
            <Bar dataKey="waterCredits" fill="#06b6d4" />
            <Bar dataKey="soilCredits" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}