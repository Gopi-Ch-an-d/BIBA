import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, Download, Filter } from 'lucide-react';
import { competitorService } from '../services/api';
import { Competitor } from '../types';
import { motion } from 'framer-motion';

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

const Exports: React.FC = () => {
  const { data: competitors = [] } = useQuery<Competitor[]>({ 
    queryKey: ['competitors'], 
    queryFn: competitorService.getCompetitors 
  });

  const [competitorId, setCompetitorId] = useState<string>('');
  const [isNewLaunch, setIsNewLaunch] = useState<string>('false');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

  const getExportUrl = (format: 'excel' | 'pdf') => {
    const params = new URLSearchParams();
    if (competitorId) params.append('competitor_id', competitorId);
    if (isNewLaunch) params.append('is_new_launch', isNewLaunch);
    return `${API_BASE_URL}/exports/${format}?${params.toString()}`;
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="flex flex-col gap-8 max-w-3xl pb-10"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Download className="text-blue-600" size={28} />
          Export Engine
        </h1>
        <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
          Generate professional reports and raw data extracts
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="dashboard-card border-slate-100/60 p-8 space-y-6 bg-white">
        <div className="flex items-center gap-3 mb-2">
          <Filter size={18} className="text-blue-500" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Configure Export Parameters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Brand</label>
            <select 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
              value={competitorId} 
              onChange={e => setCompetitorId(e.target.value)}
            >
              <option value="">All tracked competitors</option>
              {competitors.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Segment</label>
            <select 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10"
              value={isNewLaunch} 
              onChange={e => setIsNewLaunch(e.target.value)}
            >
              <option value="">Both (Best Sellers & New Arrivals)</option>
              <option value="false">Best Sellers</option>
              <option value="true">New Arrivals</option>
            </select>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <motion.a 
          variants={fadeInUp}
          href={getExportUrl('excel')} 
          download 
          className="dashboard-card group flex items-center gap-6 p-6 bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50 transition-all duration-300 cursor-pointer border-slate-100/60"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
            <FileSpreadsheet size={28} />
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900 text-lg tracking-tight">Microsoft Excel</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Full raw data extract (.xlsx)</p>
          </div>
          <Download size={20} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-y-1 transition-all" />
        </motion.a>

        <motion.a 
          variants={fadeInUp}
          href={getExportUrl('pdf')} 
          download 
          className="dashboard-card group flex items-center gap-6 p-6 bg-white hover:border-rose-200 hover:shadow-xl hover:shadow-rose-50 transition-all duration-300 cursor-pointer border-slate-100/60"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-inner group-hover:scale-110 transition-transform duration-300">
            <FileText size={28} />
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900 text-lg tracking-tight">PDF Document</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Formatted system report (.pdf)</p>
          </div>
          <Download size={20} className="text-slate-300 group-hover:text-rose-500 group-hover:translate-y-1 transition-all" />
        </motion.a>
      </div>

      <motion.div variants={fadeInUp} className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
          Reports are generated in real-time based on the latest successful scrape data.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Exports;
