import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  GridOptions,
  ModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import { Download, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { productService, competitorService } from "../services/api";
import { Product, Competitor } from "../types";
import { ProductDetailView } from "../components/ProductDetailView";
import { motion, AnimatePresence } from "framer-motion";
import GooeyLoader from "../components/GooeyLoader";

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
};

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_SIZE = 20;

const Bestsellers: React.FC = () => {
  const [page, setPage] = useState(1);
  const [competitorId, setCompetitorId] = useState<number | undefined>(
    undefined,
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["competitors"],
    queryFn: competitorService.getCompetitors,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products-bs", page, competitorId, PAGE_SIZE],
    queryFn: () =>
      productService.listProducts({
        page: page,
        page_size: PAGE_SIZE,
        competitor_id: competitorId,
        is_bestseller: true,
      }),
  });

  const columnDefs: ColDef<Product>[] = [
    {
      headerName: "Rank",
      valueGetter: (params) =>
        (params.node?.rowIndex ?? 0) + 1 + (page - 1) * PAGE_SIZE,
      width: 80,
      cellClass: "font-black text-slate-400",
    },
    {
      headerName: "Product",
      field: "name",
      flex: 1,
      minWidth: 250,
      maxWidth: 480,
      cellRenderer: (params: any) => (
        <button
          onClick={() => setSelectedProduct(params.data)}
          className="flex items-center gap-4 h-full text-left w-full hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <img
            src={params.data.image_url}
            alt=""
            className="h-12 w-10 rounded-lg object-cover shadow-sm border border-slate-100"
          />
          <span className="font-bold text-slate-800 line-clamp-1">
            {params.value}
          </span>
        </button>
      ),
    },
    {
      headerName: "Competitor",
      field: "competitor_id",
      width: 150,
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
      headerName: "Current Price",
      field: "current_price",
      width: 150,
      valueFormatter: (params) =>
        params.value ? `₹${params.value.toLocaleString()}` : "—",
      cellClass: "font-black text-slate-900",
    },
    {
      headerName: "Is Active",
      field: "is_active",
      width: 110,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <span
            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm"
            style={{ 
              color: params.value ? "#10b981" : "#94a3b8", 
              backgroundColor: params.value ? "rgba(16, 185, 129, 0.08)" : "rgba(148, 163, 184, 0.08)",
              borderColor: params.value ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)"
            }}
          >
            {params.value ? "Yes" : "No"}
          </span>
        </div>
      ),
    },
    {
      headerName: "Discount",
      field: "discount_pct",
      width: 110,
      valueFormatter: (params) =>
        params.value ? `${Math.round(params.value)}% OFF` : "—",
      cellClass: "text-rose-500 font-black",
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: "rgba(192,57,43,0.08)",
                    border: "1px solid rgba(192,57,43,0.15)",
                  }}
                >
                  <Award size={24} style={{ color: "#c0392b" }} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Bestseller Analysis
                  </h1>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
                    Tracking high-velocity items across tracked brands
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={competitorId || ""}
                  onChange={(e) => {
                    setCompetitorId(
                      e.target.value ? Number(e.target.value) : undefined,
                    );
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 transition-all cursor-pointer min-w-[200px] shadow-sm"
                  style={{ ["--tw-ring-color" as any]: "rgba(192,57,43,0.1)" }}
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

            <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ag-theme-quartz bs-grid relative">
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <GooeyLoader size="sm" />
                </div>
              )}
              <AgGridReact
                theme="legacy"
                loading={isLoading}
                rowData={data?.products || []}
                columnDefs={columnDefs}
                gridOptions={gridOptions}
              />
            </div>

            <div className="flex items-center justify-between px-8 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Total Bestsellers:{" "}
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
              .bs-grid .ag-root-wrapper {
                border: none !important;
                border-radius: 24px !important;
              }
              .bs-grid .ag-header {
                background-color: rgba(192, 57, 43, 0.06) !important;
                border-bottom: 1px solid rgba(192, 57, 43, 0.12) !important;
              }
              .bs-grid .ag-header-cell-label {
                color: #c0392b !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
                font-size: 10px !important;
              }
              .bs-grid .ag-header-cell:hover {
                background-color: transparent !important;
              }
              .bs-grid .ag-cell {
                border: none !important;
                display: flex !important;
                align-items: center !important;
                color: #1e293b !important;
                font-size: 12px !important;
              }
              .bs-grid .ag-row {
                border-bottom: 1px solid rgba(192, 57, 43, 0.06) !important;
              }
              .bs-grid .ag-row-hover {
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

export default Bestsellers;
