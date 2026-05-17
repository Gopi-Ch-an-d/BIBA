import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  GridOptions,
  ModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import { Sparkles, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { productService, competitorService } from "../services/api";
import { Product, Competitor } from "../types";
import { ProductDetailView } from "../components/ProductDetailView";
import { motion, AnimatePresence } from "framer-motion";
import GooeyLoader from "../components/GooeyLoader";

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_SIZE = 20;

const NewArrivals: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [competitorId, setCompetitorId] = useState<number | undefined>(
    undefined,
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["competitors"],
    queryFn: competitorService.getCompetitors,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products-new", page, competitorId, PAGE_SIZE, selectedDate],
    queryFn: () =>
      productService.listProducts({
        page: page,
        page_size: PAGE_SIZE,
        competitor_id: competitorId,
        is_new_launch: true,
        date: selectedDate || undefined,
        sort_by: "first_seen_at",
        sort_dir: "desc",
      }),
    refetchInterval: 2000,
  });

  const latestDateStr = data?.products[0]?.first_seen_at?.split("T")[0];

  const columnDefs: ColDef<Product>[] = [
    {
      headerName: "P.No",
      valueGetter: (params) =>
        (params.node?.rowIndex ?? 0) + 1 + (page - 1) * PAGE_SIZE,
      width: 80,
      cellClass: "font-black text-slate-400",
    },

    {
      headerName: "Image",
      field: "image_url",
      width: 100,
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full">
          <img
            src={params.value}
            alt=""
            className="h-12 w-9 rounded-lg object-cover shadow-sm border border-slate-100"
          />
        </div>
      ),
    },
    {
      headerName: "Product Name",
      field: "name",
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: any) => (
        <button
          onClick={() => setSelectedProduct(params.data)}
          className="flex flex-col justify-center h-full text-left w-full hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <span className="font-bold text-slate-800 leading-tight truncate hover:text-blue-600 transition-colors">
            {params.value}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-1">
            {params.data.sku}
          </span>
        </button>
      ),
    },

    {
      headerName: "Status",
      valueGetter: () => "NEW",
      width: 90,
      cellRenderer: (params: any) => {
        return (
          <span
            className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm"
            style={{ backgroundColor: "#c0392b", color: "#fff" }}
          >
            New
          </span>
        );
      },
    },

    {
      headerName: "Competitor",
      field: "competitor_id",
      width: 140,
      valueGetter: (params) => {
        const comp = competitors.find(
          (c) => c.id === params.data?.competitor_id,
        );
        return comp?.name || "Unknown";
      },
      cellRenderer: (params: any) => (
        <span
          className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
          style={{
            backgroundColor: "rgba(192,57,43,0.08)",
            color: "#c0392b",
            border: "1px solid rgba(192,57,43,0.15)",
          }}
        >
          {params.value}
        </span>
      ),
    },
    {
      headerName: "Price",
      field: "current_price",
      width: 130,
      valueFormatter: (params) =>
        params.value ? `Rs.${params.value.toLocaleString()}` : "—",
      cellClass: "font-black text-slate-900",
    },
    { 
      headerName: 'IsActive', 
      field: 'is_active' as any, 
      width: 100,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full justify-center">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${params.value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {params.value ? 'YES' : 'NO'}
          </span>
        </div>
      )
    },
    {
      headerName: "Detected On",
      field: "first_seen_at",
      width: 130,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString() : "—",
      cellClass: "text-slate-400 font-medium",
    },

    {
      headerName: "View",
      field: "product_url",
      width: 100,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <a
            href={params.value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-200 transition-all group"
          >
            <svg
              className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      ),
    },
  ];

  const gridOptions: GridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: false,
    },
    rowHeight: 64,
    headerHeight: 48,
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {selectedProduct ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <ProductDetailView
              product={selectedProduct}
              competitorName={
                competitors.find((c) => c.id === selectedProduct.competitor_id)
                  ?.name || "Competitor"
              }
              onBack={() => setSelectedProduct(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6 h-full pb-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: "rgba(192,57,43,0.08)",
                    border: "1px solid rgba(192,57,43,0.15)",
                  }}
                >
                  <Sparkles size={24} style={{ color: "#c0392b" }} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    New Arrivals 
                  </h1>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
                    Tracking fresh catalog entries across competitors
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 transition-all cursor-pointer shadow-sm"
                  style={{ ["--tw-ring-color" as any]: "rgba(192,57,43,0.1)" }}
                />
                <select
                  value={competitorId || ""}
                  onChange={(e) => {
                    setCompetitorId(
                      e.target.value ? Number(e.target.value) : undefined,
                    );
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 transition-all cursor-pointer min-w-[200px] shadow-sm"
                >
                  <option value="">All Competitors</option>
                  {competitors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button className="p-2.5 rounded-xl bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                  <Download size={18} />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden ag-theme-quartz na-grid relative"
              style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}
            >
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <GooeyLoader size="sm" />
                </div>
              )}
              <div style={{ height: "100%", width: "100%" }}>
                <AgGridReact
                  theme="legacy"
                  loading={isLoading}
                  rowData={data?.products || []}
                  columnDefs={columnDefs}
                  gridOptions={gridOptions}
                />
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-8 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Total Products:{" "}
                <span className="font-black" style={{ color: "#c0392b" }}>
                  {data?.total || 0}
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
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <style
              dangerouslySetInnerHTML={{
                __html: `
              .na-grid .ag-root-wrapper {
                border: none !important;
                border-radius: 24px !important;
                height: 100% !important;
              }
              .na-grid .ag-header {
                background-color: rgba(192, 57, 43, 0.06) !important;
                border-bottom: 1px solid rgba(192, 57, 43, 0.12) !important;
              }
              .na-grid .ag-header-cell-label {
                color: #c0392b !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
                font-size: 10px !important;
              }
              .na-grid .ag-header-cell:hover {
                background-color: rgba(192, 57, 43, 0.04) !important;
              }
              .na-grid .ag-cell {
                border: none !important;
                display: flex !important;
                align-items: center !important;
                color: #1e293b !important;
                font-size: 12px !important;
              }
              .na-grid .ag-row {
                border-bottom: 1px solid rgba(192, 57, 43, 0.06) !important;
              }
              .na-grid .ag-row-hover {
                background-color: rgba(192, 57, 43, 0.04) !important;
              }
            `,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewArrivals;
