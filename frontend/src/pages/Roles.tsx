import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Plus, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { roleService } from '../services/api';
import GooeyLoader from '../components/GooeyLoader';

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_SIZE = 10;

const Roles: React.FC = () => {
  const [page, setPage] = useState(1);
  
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getRoles
  });

  const totalPages = Math.ceil(roles.length / PAGE_SIZE);
  const paginatedRoles = useMemo(() => {
    return roles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [roles, page]);

  const columnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', width: 80 },
    { headerName: 'Role Name', field: 'name', flex: 1 },
    { headerName: 'Code', field: 'code', flex: 1 },
    { headerName: 'Description', field: 'description', flex: 1 },
    { 
      headerName: 'Status', 
      field: 'is_active', 
      width: 100,
      cellRenderer: (params: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${params.value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {params.value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#fceae7] flex items-center justify-center shadow-sm">
            <Shield size={24} className="text-[#7f1d1d]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Roles Management</h1>
            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
              Manage system roles and permissions
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-[#c0392b] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#a93226] transition-colors shadow-sm">
          <Plus size={18} />
          <span>Add Role</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <GooeyLoader size="md" />
          </div>
        )}
        <div className="ag-theme-quartz h-full w-full roles-grid">
          <AgGridReact
            theme="legacy"
            rowData={paginatedRoles}
            columnDefs={columnDefs}
            gridOptions={{
              rowHeight: 55,
              headerHeight: 45,
              pagination: false
            }}
          />
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm mt-4">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          Total Roles:{" "}
          <span className="font-black" style={{ color: "#c0392b" }}>
            {roles.length}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-700 min-w-[70px] text-center">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .roles-grid .ag-header,
        .roles-grid .ag-header-row,
        .roles-grid .ag-header-cell {
          background-color: #fceae7 !important;
        }
        .roles-grid .ag-header-cell-label {
          color: #7f1d1d !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 12px !important;
        }
        .roles-grid .ag-cell {
          border-right: 1px solid #000000 !important;
          border-bottom: 1px solid #000000 !important;
        }
        .roles-grid .ag-header-cell {
          border-right: 1px solid #000000 !important;
        }
      `}</style>
    </div>
  );
};

export default Roles;
