import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Loader2, Info, TrendingUp } from 'lucide-react';
import { analyticsService, competitorService } from '../services/api';
import { Competitor, PriceHistoryPoint } from '../types';
import { motion } from 'framer-motion';
import GooeyLoader from '../components/GooeyLoader';

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const DAYS_OPTIONS = [7, 14, 30, 60];

interface CompetitorTrendChartProps {
  competitor: Competitor;
  days: number;
}

const CompetitorTrendChart: React.FC<CompetitorTrendChartProps> = ({ competitor, days }) => {
  const { data = [], isLoading } = useQuery<PriceHistoryPoint[]>({
    queryKey: ['trend', competitor.id, days],
    queryFn: () => analyticsService.getPriceTrend({ competitor_id: competitor.id, days }),
  });

  const formatted = data.map(d => ({
    ...d,
    date: format(parseISO(d.scraped_at), 'MMM d'),
    price: d.price ? Math.round(d.price) : null,
    discount_pct: d.discount_pct ? parseFloat(d.discount_pct.toFixed(1)) : null,
  }));

  return (
    <motion.div 
      variants={fadeInUp}
      className="dashboard-card border-slate-100/60 p-6 space-y-6 bg-white hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            {competitor.name.charAt(0)}
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">{competitor.name}</h3>
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Time-Series Data
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <GooeyLoader size="md" />
        </div>
      ) : formatted.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Info size={24} className="text-slate-300 mb-2" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No historical data available</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Price (₹)</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatted}>
                  <defs>
                    <linearGradient id={`grad-${competitor.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#3b82f6" fill={`url(#grad-${competitor.id})`} strokeWidth={3} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount Depth (%)</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatted}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="discount_pct" stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const Trends: React.FC = () => {
  const [days, setDays] = useState(30);
  const { data: competitors = [], isLoading } = useQuery<Competitor[]>({ 
    queryKey: ['competitors'], 
    queryFn: competitorService.getCompetitors
  });

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="flex flex-col gap-8 pb-10"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={28} />
            Trend Analysis
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Longitudinal tracking of market price and discount volatility</p>
        </div>
        <div className="flex items-center p-1 bg-white border border-slate-100 rounded-xl shadow-sm">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-6 py-2 text-xs font-black uppercase tracking-widest transition-all rounded-lg ${days === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[600px] flex items-center justify-center">
          <GooeyLoader size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {competitors.map(c => (
            <CompetitorTrendChart key={c.id} competitor={c} days={days} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Trends;
