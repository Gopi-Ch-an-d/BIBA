import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Info, TrendingUp } from 'lucide-react';
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

const COMPETITOR_COLORS: { [key: string]: string } = {
  W: "#c0392b",
  Aurelia: "#f39c12",
  "Global Desi": "#2c3e50",
};

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

  const brandColor = COMPETITOR_COLORS[competitor.name] || "#3b82f6";

  return (
    <motion.div 
      variants={fadeInUp}
      className="border border-slate-100 rounded-2xl p-6 space-y-6 bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all duration-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            {competitor.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{competitor.name}</h3>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Time-Series Data</p>
          </div>
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Price (Rs.)</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatted} margin={{ top: 5, right: 5, left: 15, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${competitor.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={brandColor} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={brandColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} dy={5} />
                  <YAxis
                    width={70}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `Rs.${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                      fontSize: '11px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}
                  />
                  <Area type="monotone" dataKey="price" stroke={brandColor} fill={`url(#grad-${competitor.id})`} strokeWidth={2.5} dot={false} isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Discount Depth (%)</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatted} margin={{ top: 5, right: 5, left: 15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} dy={5} />
                  <YAxis
                    width={50}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                      fontSize: '11px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}
                  />
                  <Line type="monotone" dataKey="discount_pct" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={true} />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            Trend Analysis
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Longitudinal tracking of market price and discount volatility</p>
        </div>
        <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-center">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg ${days === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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