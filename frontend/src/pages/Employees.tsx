import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Plus, Edit, Trash2, Users as UsersIcon, X, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { employeeService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import GooeyLoader from '../components/GooeyLoader';
import toast from 'react-hot-toast';

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_SIZE = 10;

const Employees: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    department: '',
    designation: '',
    joined_date: '',
    user_id: ''
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeService.getEmployees
  });

  const totalPages = Math.ceil(employees.length / PAGE_SIZE);
  const paginatedEmployees = useMemo(() => {
    return employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [employees, page]);

  const createEmployeeMutation = useMutation({
    mutationFn: employeeService.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create employee');
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => employeeService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update employee');
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: employeeService.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete employee');
    }
  });

  const resetForm = () => {
    setFormData({ employee_code: '', department: '', designation: '', joined_date: '', user_id: '' });
    setIsEditMode(false);
    setSelectedEmployeeId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      user_id: formData.user_id ? parseInt(formData.user_id) : undefined,
      joined_date: formData.joined_date || undefined
    };

    if (isEditMode && selectedEmployeeId) {
      updateEmployeeMutation.mutate({ id: selectedEmployeeId, data: payload });
    } else {
      createEmployeeMutation.mutate(payload);
    }
  };

  const handleEdit = (employee: any) => {
    setIsEditMode(true);
    setSelectedEmployeeId(employee.id);
    setFormData({
      employee_code: employee.employee_code || '',
      department: employee.department || '',
      designation: employee.designation || '',
      joined_date: employee.joined_date || '',
      user_id: employee.user_id?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const columnDefs: ColDef[] = [
    { headerName: 'ID', field: 'id', width: 80 },
    { headerName: 'Code', field: 'employee_code', width: 120 },
    { headerName: 'Department', field: 'department', flex: 1 },
    { headerName: 'Designation', field: 'designation', flex: 1 },
    { headerName: 'Joined Date', field: 'joined_date', width: 120 },
    // { headerName: 'User ID', field: 'user_id', width: 100 },
    { 
      headerName: 'Status', 
      field: 'is_active', 
      width: 100,
      cellRenderer: (params: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${params.value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {params.value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      headerName: 'Actions',
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <button 
            onClick={() => params.context.handleEdit(params.data)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => params.context.handleDelete(params.data.id)}
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#fceae7] flex items-center justify-center shadow-sm">
            <Briefcase size={24} className="text-[#7f1d1d]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Employees Management</h1>
            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
              Manage company employees
            </p>
          </div>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-[#c0392b] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#a93226] transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <GooeyLoader size="md" />
          </div>
        )}
        <div className="ag-theme-quartz h-full w-full employees-grid">
          <AgGridReact
            theme="legacy"
            rowData={paginatedEmployees}
            columnDefs={columnDefs}
            gridOptions={{
              rowHeight: 55,
              headerHeight: 45,
              pagination: false,
              context: { handleEdit, handleDelete }
            }}
          />
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm mt-4">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          Total Employees:{" "}
          <span className="font-black" style={{ color: "#c0392b" }}>
            {employees.length}
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

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h2>
                <button 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Code</label>
                  <input 
                    type="text" 
                    required
                    disabled={isEditMode}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c0392b] focus:border-transparent text-sm disabled:bg-slate-50"
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                    <input 
                      type="text" 
                      className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c0392b] focus:border-transparent text-sm"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</label>
                    <input 
                      type="text" 
                      className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c0392b] focus:border-transparent text-sm"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joined Date</label>
                  <input 
                    type="date" 
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c0392b] focus:border-transparent text-sm"
                    value={formData.joined_date}
                    onChange={(e) => setFormData({ ...formData, joined_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">User ID</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c0392b] focus:border-transparent text-sm"
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); resetForm(); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                    className="px-4 py-2.5 rounded-xl bg-[#c0392b] text-white text-sm font-bold hover:bg-[#a93226] transition-colors disabled:opacity-50"
                  >
                    {createEmployeeMutation.isPending || updateEmployeeMutation.isPending ? 'Saving...' : (isEditMode ? 'Update Employee' : 'Create Employee')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .employees-grid .ag-header,
        .employees-grid .ag-header-row,
        .employees-grid .ag-header-cell {
          background-color: #fceae7 !important;
        }
        .employees-grid .ag-header-cell-label {
          color: #7f1d1d !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 12px !important;
        }
        .employees-grid .ag-cell {
          border-right: 1px solid #000000 !important;
          border-bottom: 1px solid #000000 !important;
        }
        .employees-grid .ag-header-cell {
          border-right: 1px solid #000000 !important;
        }
      `}</style>
    </div>
  );
};

export default Employees;
