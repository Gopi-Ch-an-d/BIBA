import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  GridOptions,
  ModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Activity,
  Terminal,
} from "lucide-react";
import { logService, competitorService } from "../services/api";
import { ScrapeLog, Competitor } from "../types";
import { motion } from "framer-motion";
import GooeyLoader from "../components/GooeyLoader";

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_CONFIG: Record<
  string,
  { icon: any; colorClass: string; label: string }
> = {
  success: {
    icon: CheckCircle2,
    colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
    label: "Success",
  },
  failed: {
    icon: XCircle,
    colorClass: "text-rose-600 bg-rose-50 border-rose-100",
    label: "Failed",
  },
  running: {
    icon: Loader2,
    colorClass: "text-amber-600 bg-amber-50 border-amber-100",
    label: "Processing",
  },
};

const ScrapeLogs: React.FC = () => {
  const [selectedCompId, setSelectedCompId] = useState<number | undefined>(
    undefined,
  );
  const [limit, setLimit] = useState(50);

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["competitors"],
    queryFn: competitorService.getCompetitors,
  });

  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery<ScrapeLog[]>({
    queryKey: ["scrape-logs", selectedCompId, limit],
    queryFn: () => logService.getScrapeLogs(selectedCompId, limit),
    refetchInterval: 15000,
  });

  const columnDefs: ColDef<ScrapeLog>[] = [
    {
      headerName: "Source",
      field: "competitor_id",
      valueGetter: (params) => {
        const comp = competitors.find(
          (c) => c.id === params.data?.competitor_id,
        );
        return comp?.name || `ID: ${params.data?.competitor_id}`;
      },
      cellClass: "font-bold text-blue-600",
    },
    {
      field: "status",
      headerName: "Status",
      cellRenderer: (params: any) => {
        const config = STATUS_CONFIG[params.value] || STATUS_CONFIG.running;
        const Icon = config.icon;
        return (
          <div className="flex items-center h-full">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.colorClass}`}
            >
              <Icon
                size={10}
                className={params.value === "running" ? "animate-spin" : ""}
              />
              {config.label}
            </div>
          </div>
        );
      },
    },
    {
      field: "inserted_datetime",
      headerName: "Execution Time",
      flex: 1,
      valueFormatter: (params) => {
        if (!params.value) return "-";
        return formatDistanceToNow(parseISO(params.value), { addSuffix: true });
      },
    },
    {
      field: "total_products",
      headerName: "Total",
      width: 100,
      cellClass: "font-bold",
    },
    {
      field: "new_products",
      headerName: "New",
      width: 100,
      cellClass: "text-emerald-600 font-bold",
      valueFormatter: (params) => (params.value ? `+${params.value}` : "0"),
    },
    {
      field: "updated_products",
      headerName: "Updated",
      width: 100,
      cellClass: "text-blue-500 font-bold",
    },
    {
      field: "message",
      headerName: "System Output",
      flex: 2,
      cellRenderer: (params: any) => (
        <span
          className="text-[11px] font-mono text-slate-400 truncate block"
          title={params.value}
        >
          {params.value || "No messages"}
        </span>
      ),
    },
  ];

  const gridOptions: GridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: false,
    },
    pagination: true,
    paginationPageSize: 20,
    rowHeight: 52,
    headerHeight: 48,
  };

  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerScrape = async () => {
    try {
      setIsTriggering(true);
      await competitorService.triggerScrape();
      alert("Scrape task successfully queued for all competitors.");
      refetch();
    } catch (err) {
      alert("Failed to trigger scrape. Check if Celery/Redis is running.");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="flex flex-col gap-6 h-full pb-8"
    >
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Terminal className="text-slate-900" size={28} />
            Execution Logs
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
            System audit trail and real-time scraper monitoring
          </p>
        </div>
        <div className="flex gap-3">
          <button
            disabled={isTriggering}
            onClick={handleTriggerScrape}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
          >
            {isTriggering ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Launch System Scraper
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="dashboard-card bg-white border-slate-100/60 p-6 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Filter by Brand
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
            value={selectedCompId || ""}
            onChange={(e) =>
              setSelectedCompId(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          >
            <option value="">All Competitors</option>
            {competitors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Display Limit
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={20}>Last 20</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
          </select>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ag-theme-quartz log-grid relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <GooeyLoader size="md" />
          </div>
        )}
        <AgGridReact
          theme="legacy"
          rowData={logs}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
        />
      </motion.div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .log-grid .ag-root-wrapper {
          border: none !important;
          border-radius: 24px !important;
        }
        .log-grid .ag-header {
          background-color: #f8fafc !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .log-grid .ag-header-cell-label {
          color: #94a3b8 !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          font-size: 10px !important;
        }
        .log-grid .ag-cell {
          border: none !important;
          display: flex !important;
          align-items: center !important;
          color: #1e293b !important;
          font-size: 12px !important;
        }
        .log-grid .ag-row {
          border-bottom: 1px solid #f8fafc !important;
        }
      `,
        }}
      />
    </motion.div>
  );
};

export default ScrapeLogs;
