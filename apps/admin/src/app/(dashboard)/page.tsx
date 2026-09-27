'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { adminApi } from '../../api/admin';
import { Users, Film, FolderTree, PlayCircle, Eye, ArrowUpRight, TrendingUp, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';

// Mock detailed stats for SVG charts
const ANALYTICS_DATA = [
  { month: 'Jan', subscribers: 1200, revenue: 24000, views: 15000 },
  { month: 'Feb', subscribers: 1800, revenue: 36000, views: 22000 },
  { month: 'Mar', subscribers: 2400, revenue: 48000, views: 28000 },
  { month: 'Apr', subscribers: 3100, revenue: 62000, views: 40000 },
  { month: 'May', subscribers: 4500, revenue: 90000, views: 58000 },
  { month: 'Jun', subscribers: 5800, revenue: 116000, views: 75000 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'subscribers' | 'views'>('revenue');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await adminApi.dashboard()).data,
  });

  const cards = [
    {
      label: 'Total Users',
      value: stats?.users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      icon: Users,
      href: '/users'
    },
    {
      label: 'Movies & Series',
      value: stats?.content,
      color: 'text-admin-accent',
      bgColor: 'bg-admin-accent/10',
      borderColor: 'border-admin-accent/20',
      icon: Film,
      href: '/content'
    },
    {
      label: 'Browse Genres',
      value: stats?.categories,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      icon: FolderTree,
      href: '/categories'
    },
    {
      label: 'Watch Sessions',
      value: stats?.watchHistory,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      icon: PlayCircle,
      href: '/content'
    },
  ];

  // Helper values for drawing SVG chart paths
  const chartHeight = 200;
  const chartWidth = 500;
  const maxValue = activeTab === 'revenue' 
    ? 130000 
    : (activeTab === 'subscribers' ? 7000 : 85000);

  const points = ANALYTICS_DATA.map((d, i) => {
    const val = activeTab === 'revenue' 
      ? d.revenue 
      : (activeTab === 'subscribers' ? d.subscribers : d.views);
    const x = (i / (ANALYTICS_DATA.length - 1)) * chartWidth;
    const y = chartHeight - (val / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Overview</h1>
        <p className="text-gray-400">Manage, scale, and analyze your V19Plus OTT streaming platform.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`bg-[#141414] rounded-2xl p-6 border ${card.borderColor} flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 relative group`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${card.bgColor} ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <Link
                  href={card.href}
                  className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <ArrowUpRight className="w-5 h-5" />
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">
                  {isLoading ? (
                    <div className="w-16 h-8 bg-gray-800 rounded animate-pulse" />
                  ) : (
                    card.value ?? 0
                  )}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium SVG Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Column */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#222] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-admin-accent" /> Platform Analytics
              </h2>
              <p className="text-xs text-gray-400">Monthly breakdown of subscriber performance parameters.</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-[#202020] rounded-xl p-1 border border-white/5 text-xs">
              {(['revenue', 'subscribers', 'views'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                    activeTab === tab 
                      ? 'bg-admin-accent text-white shadow-md' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive SVG Rendering */}
          <div className="relative w-full h-[220px] pt-4">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
            >
              {/* Grids */}
              <line x1="0" y1="50" x2={chartWidth} y2="50" stroke="#222" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2={chartWidth} y2="100" stroke="#222" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2={chartWidth} y2="150" stroke="#222" strokeDasharray="4 4" />
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#333" />

              {/* Gradient defs */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5C00" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF5C00" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Filled area path */}
              <path
                d={`M 0,${chartHeight} L ${points} L ${chartWidth},${chartHeight} Z`}
                fill="url(#chartGradient)"
              />

              {/* Line path */}
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                d={`M ${points}`}
                fill="none"
                stroke="#FF5C00"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Dotted data endpoints */}
              {ANALYTICS_DATA.map((d, i) => {
                const val = activeTab === 'revenue' 
                  ? d.revenue 
                  : (activeTab === 'subscribers' ? d.subscribers : d.views);
                const x = (i / (ANALYTICS_DATA.length - 1)) * chartWidth;
                const y = chartHeight - (val / maxValue) * chartHeight;
                return (
                  <g key={i} className="group/dot cursor-pointer">
                    <circle cx={x} cy={y} r="5" className="fill-admin-accent stroke-[#141414] stroke-[2px] transition-all group-hover/dot:r-7" />
                    <text x={x} y={y - 12} className="text-[10px] font-bold fill-white opacity-0 group-hover/dot:opacity-100 transition-opacity text-center" textAnchor="middle">
                      {activeTab === 'revenue' ? `₹${(val / 1000).toFixed(0)}k` : val}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider pt-2">
              {ANALYTICS_DATA.map((d) => <span key={d.month}>{d.month}</span>)}
            </div>
          </div>
        </div>

        {/* System Diagnostics status panel */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> System Diagnostics
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-[#222]">
                <span className="text-gray-400">Database Server</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-[#222]">
                <span className="text-gray-400">Redis Cache</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-[#222]">
                <span className="text-gray-400">Transcode Engine</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Ready (FFmpeg)
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="text-gray-400">Storage CDN</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-[#222] mt-6">
            <p className="text-xs text-gray-500 text-center">
              V19Plus Admin Control Panel &bull; v1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links / Navigation Cards */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Quick Administrative Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/content"
            className="flex flex-col justify-between p-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#2d2d2d] rounded-xl group transition-all"
          >
            <div>
              <h3 className="font-semibold text-white group-hover:text-admin-accent transition-colors">Add New Content</h3>
              <p className="text-xs text-gray-400 mt-1">Upload files and trigger HLS transcode.</p>
            </div>
            <span className="text-xs text-admin-accent font-semibold mt-4 flex items-center gap-1">
              Go to Content Manager &rarr;
            </span>
          </Link>

          <Link
            href="/categories"
            className="flex flex-col justify-between p-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#2d2d2d] rounded-xl group transition-all"
          >
            <div>
              <h3 className="font-semibold text-white group-hover:text-admin-accent transition-colors">Manage Genres</h3>
              <p className="text-xs text-gray-400 mt-1">Create or reorder browse catalog categories.</p>
            </div>
            <span className="text-xs text-admin-accent font-semibold mt-4 flex items-center gap-1">
              Go to Genres &rarr;
            </span>
          </Link>

          <Link
            href="/users"
            className="flex flex-col justify-between p-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#2d2d2d] rounded-xl group transition-all"
          >
            <div>
              <h3 className="font-semibold text-white group-hover:text-admin-accent transition-colors">User Profiles</h3>
              <p className="text-xs text-gray-400 mt-1">Audit active user subscriptions & access permissions.</p>
            </div>
            <span className="text-xs text-admin-accent font-semibold mt-4 flex items-center gap-1">
              Go to Users &rarr;
            </span>
          </Link>

          <Link
            href="/settings"
            className="flex flex-col justify-between p-4 bg-[#1a1a1a] hover:bg-[#222] border border-[#2d2d2d] rounded-xl group transition-all"
          >
            <div>
              <h3 className="font-semibold text-white group-hover:text-admin-accent transition-colors">Brand Settings</h3>
              <p className="text-xs text-gray-400 mt-1">Configure portal styling, logos, and headers.</p>
            </div>
            <span className="text-xs text-admin-accent font-semibold mt-4 flex items-center gap-1">
              Configure Branding &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
