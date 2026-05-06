import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  GridOptions,
  ModuleRegistry,
  AllCommunityModule
} from 'ag-grid-community';
import { ArrowUpRight, Plus, Globe, X, Save, Loader2, Trash2, AlertCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { competitorService } from '../services/api';
import { Competitor } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import GooeyLoader from '../components/GooeyLoader';

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
};

ModuleRegistry.registerModules([AllCommunityModule]);

interface CategoryInput {
  name: string;
  url: string;
}

const CompetitorView: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    base_url: '',
    scraper_name: ''
  });
  const [categories, setCategories] = useState<CategoryInput[]>([
    { name: 'Bestsellers', url: '' },
    { name: 'New Arrivals', url: '' }
  ]);

  const { data: competitors = [], isLoading } = useQuery<Competitor[]>({
    queryKey: ['competitors'],
    queryFn: competitorService.getCompetitors
  });

  const filteredCompetitors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return competitors;
    return competitors.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.base_url?.toLowerCase().includes(q)
    );
  }, [competitors, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: any) => competitorService.createCompetitor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      setIsModalOpen(false);
      resetForm();
      toast.success('Competitor registered successfully!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail;
      if (Array.isArray(msg)) {
        toast.error(msg[0]?.msg || 'Validation failed');
      } else {
        toast.error(msg || 'Failed to register competitor');
      }
    }
  });

  const resetForm = () => {
    setFormData({ name: '', code: '', base_url: '', scraper_name: '' });
    setCategories([{ name: 'Bestsellers', url: '' }, { name: 'New Arrivals', url: '' }]);
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Brand name is required';
    if (!formData.code.trim()) {
      newErrors.code = 'System code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must be uppercase alphanumeric (e.g. BRAND_01)';
    }

    if (!formData.base_url.trim()) {
      newErrors.base_url = 'Website URL is required';
    } else if (!/^https?:\/\//.test(formData.base_url)) {
      newErrors.base_url = 'Must be a valid URL starting with http:// or https://';
    }

    categories.forEach((cat, idx) => {
      if (cat.name.trim() || cat.url.trim()) {
        if (!cat.name.trim()) newErrors[`cat_name_${idx}`] = 'Category name required';
        if (!cat.url.trim()) {
          newErrors[`cat_url_${idx}`] = 'URL required';
        } else if (!/^https?:\/\//.test(cat.url)) {
          newErrors[`cat_url_${idx}`] = 'Invalid URL';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    const validCategories = categories.filter(c => c.name.trim() && c.url.trim());
    createMutation.mutate({
      ...formData,
      scraper_name: formData.scraper_name || `${formData.name.toLowerCase().replace(/ /g, '_')}_scraper`,
      categories: validCategories
    });
  };

  const addCategory = () => {
    setCategories([...categories, { name: '', url: '' }]);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: keyof CategoryInput, value: string) => {
    const newCats = [...categories];
    newCats[index][field] = value;
    setCategories(newCats);
    if (errors[`cat_${field}_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`cat_${field}_${index}`];
      setErrors(newErrors);
    }
  };

  const columnDefs: ColDef<Competitor>[] = [
    { 
      field: 'name', 
      headerName: 'Competitor', 
      sortable: true, 
      filter: false,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-3 h-full">
          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
            {params.value?.charAt(0)}
          </div>
          <span className="font-bold text-slate-800">{params.value}</span>
        </div>
      )
    },
    { 
      field: 'base_url', 
      headerName: 'Base Website', 
      flex: 1,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <a 
            href={params.value} 
            target="_blank" 
            rel="noreferrer" 
            className="text-blue-600 hover:underline flex items-center gap-1.5 font-medium"
          >
            {params.value}
            <ArrowUpRight size={14} />
          </a>
        </div>
      )
    },
    { 
      field: 'code', 
      headerName: 'System Code', 
      width: 150,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full font-mono text-xs text-slate-500">
          {params.value}
        </div>
      )
    },
    { 
      field: 'categories' as any, 
      headerName: 'Tracking Categories', 
      width: 250,
      cellRenderer: (params: any) => (
        <div className="flex flex-wrap gap-1 items-center h-full">
          {params.value?.map((cat: any) => (
            <a 
              key={cat.id} 
              href={cat.url} 
              target="_blank" 
              rel="noreferrer"
              className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-[10px] font-bold uppercase border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer"
              title={`Visit ${cat.name} page`}
            >
              {cat.name}
            </a>
          ))}
        </div>
      )
    }
  ];

  const gridOptions: GridOptions = {
    rowHeight: 65,
    headerHeight: 50,
    animateRows: true,
    pagination: true,
    paginationPageSize: 20,
    suppressCellFocus: true,
    overlayLoadingTemplate: '<span class="ag-overlay-loading-center">Loading competitors...</span>'
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={fadeInUp}
      className="flex flex-col h-full"
    >
      <div className="max-w-[1600px] mx-auto w-full flex flex-col h-full">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
              Competitor Registry
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Manage and monitor brand scrape targets</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or website..."
                className="pl-10 pr-10 py-2.5 w-72 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Register Competitor button */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
              style={{ backgroundColor: '#c0392b', boxShadow: '0 4px 14px rgba(192,57,43,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#a93226')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#c0392b')}
            >
              <Plus size={18} strokeWidth={3} />
              Register Competitor
            </button>
          </div>
        </div>

        {/* Result count hint when searching */}
        {searchQuery && (
          <p className="text-xs text-slate-500 font-medium mb-3 -mt-5">
            {filteredCompetitors.length === 0
              ? 'No competitors match your search'
              : `Showing ${filteredCompetitors.length} of ${competitors.length} competitor${competitors.length !== 1 ? 's' : ''}`}
          </p>
        )}

        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <GooeyLoader size="md" />
            </div>
          )}
          <div className="ag-theme-quartz h-full w-full">
            <AgGridReact
              theme="legacy"
              rowData={filteredCompetitors}
              columnDefs={columnDefs}
              gridOptions={gridOptions}
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => { setIsModalOpen(false); resetForm(); }}
          />
          <div className="bg-white rounded-3xl w-full max-w-2xl relative shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-800 tracking-tighter">Register New Competitor</h2>
                <button 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Competitor Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({...formData, name: e.target.value});
                        if (errors.name) setErrors({...errors, name: ''});
                      }}
                      className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-slate-800 font-bold placeholder:text-slate-300 focus:ring-0 transition-all text-lg ${errors.name ? 'border-rose-200 bg-rose-50/30' : 'border-transparent focus:border-red-400'}`}
                      placeholder="e.g. FabIndia"
                    />
                    {errors.name && <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1 ml-1"><AlertCircle size={10} /> {errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">System Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => {
                        setFormData({...formData, code: e.target.value.toUpperCase()});
                        if (errors.code) setErrors({...errors, code: ''});
                      }}
                      className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-slate-800 font-bold placeholder:text-slate-300 focus:ring-0 transition-all uppercase ${errors.code ? 'border-rose-200 bg-rose-50/30' : 'border-transparent focus:border-red-400'}`}
                      placeholder="FAB_IND"
                    />
                    {errors.code && <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1 ml-1"><AlertCircle size={10} /> {errors.code}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Base Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input
                      type="url"
                      value={formData.base_url}
                      onChange={(e) => {
                        setFormData({...formData, base_url: e.target.value});
                        if (errors.base_url) setErrors({...errors, base_url: ''});
                      }}
                      className={`w-full pl-14 pr-5 py-4 bg-slate-50 border-2 rounded-2xl text-slate-800 font-bold placeholder:text-slate-300 focus:ring-0 transition-all ${errors.base_url ? 'border-rose-200 bg-rose-50/30' : 'border-transparent focus:border-red-400'}`}
                      placeholder="https://www.fabindia.com"
                    />
                  </div>
                  {errors.base_url && <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1 ml-1"><AlertCircle size={10} /> {errors.base_url}</p>}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tracking Categories</h3>
                    {/* Add Category text button */}
                    <button 
                      type="button"
                      onClick={addCategory}
                      className="text-xs font-black flex items-center gap-1 uppercase transition-colors"
                      style={{ color: '#c0392b' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#a93226')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#c0392b')}
                    >
                      <Plus size={14} /> Add Category
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {categories.map((cat, index) => (
                      <div key={index} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100 group transition-all relative">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => updateCategory(index, 'name', e.target.value)}
                            className={`w-full px-4 py-2 bg-white border rounded-xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 ${errors[`cat_name_${index}`] ? 'border-rose-300' : 'border-slate-200'}`}
                            placeholder="e.g. Bestsellers"
                          />
                        </div>
                        <div className="flex-[2] space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Collection URL</label>
                          <input
                            type="url"
                            value={cat.url}
                            onChange={(e) => updateCategory(index, 'url', e.target.value)}
                            className={`w-full px-4 py-2 bg-white border rounded-xl text-slate-800 font-bold text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 ${errors[`cat_url_${index}`] ? 'border-rose-300' : 'border-slate-200'}`}
                            placeholder="https://brand.com/collections/..."
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeCategory(index)}
                          className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors mt-6"
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        {(errors[`cat_name_${index}`] || errors[`cat_url_${index}`]) && (
                           <div className="absolute -bottom-5 left-4 flex gap-4">
                              {errors[`cat_name_${index}`] && <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">{errors[`cat_name_${index}`]}</span>}
                              {errors[`cat_url_${index}`] && <span className="text-[9px] text-rose-500 font-black uppercase tracking-tighter">{errors[`cat_url_${index}`]}</span>}
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 flex gap-4 border-t border-slate-100">
                {/* Cancel button */}
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>

                {/* Register Brand button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="flex-1 px-6 py-3 text-white rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#c0392b', boxShadow: '0 4px 14px rgba(192,57,43,0.35)' }}
                  onMouseEnter={e => { if (!createMutation.isPending) e.currentTarget.style.backgroundColor = '#a93226'; }}
                  onMouseLeave={e => { if (!createMutation.isPending) e.currentTarget.style.backgroundColor = '#c0392b'; }}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Register Brand
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CompetitorView;