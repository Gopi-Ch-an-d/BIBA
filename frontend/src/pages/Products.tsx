import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  GridOptions,
  ModuleRegistry,
  AllCommunityModule,
} from "ag-grid-community";
import { format, parseISO } from "date-fns";
import {
  ExternalLink,
  Search,
  Download,
  FileText,
  Filter,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
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

const Products: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);

  const [competitorId, setCompetitorId] = useState<number | undefined>(
    undefined,
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["competitors"],
    queryFn: competitorService.getCompetitors,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "products",
      { competitor_id: competitorId, search, page, page_size: PAGE_SIZE },
    ],
    queryFn: () =>
      productService.listProducts({
        competitor_id: competitorId,
        search: search || undefined,
        page: page,
        page_size: PAGE_SIZE,
      }),
  });

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `market-inventory-${format(new Date(), "yyyy-MM-dd")}.csv`,
      columnKeys: [
        "name",
        "competitor_id",
        "current_price",
        "discount_pct",
        "stock_available",
        "last_updated_at",
        "product_url",
      ],
      processCellCallback: (params) => {
        if (params.column.getColId() === "competitor_id") {
          const comp = competitors.find(
            (c) => c.id === params.node?.data?.competitor_id,
          );
          return comp?.name || "Unknown";
        }
        if (params.column.getColId() === "stock_available") {
          return params.value ? "In Stock" : "Out of Stock";
        }
        return params.value;
      },
    });
  };

  const handleBatchPDF = () => {
    setIsPrinting(true);
    // Give the grid time to disable virtualization and render all rows
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 1000);
  };

  const columnDefs: ColDef<Product>[] = [
    {
      headerName: "P.no",
      valueGetter: (params) =>
        (params.node?.rowIndex ?? 0) + 1 + (page - 1) * PAGE_SIZE,
      width: 70,
      cellClass: "font-black text-slate-400",
    },
    {
      headerName: "Image",
      field: "image_url",
      width: 90,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <img
            src={params.value}
            alt=""
            className="h-14 w-10 rounded-lg object-cover shadow-sm border border-slate-100"
          />
        </div>
      ),
      sortable: false,
      filter: false,
    },
    {
      headerName: "Product Name",
      field: "name",
      flex: 2,
      minWidth: 250,
      cellRenderer: (params: any) => (
        <button
          onClick={() => setSelectedProduct(params.data)}
          className="font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer text-left w-full h-full flex items-center"
        >
          {params.value}
        </button>
      ),
    },
    {
      headerName: "Brand",
      field: "competitor_id",
      width: 130,
      valueGetter: (params) => {
        const comp = competitors.find(
          (c) => c.id === params.data?.competitor_id,
        );
        return comp?.name || "Unknown";
      },
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <span
            className="px-2.5 py-1 rounded-lg font-black uppercase tracking-tighter text-[10px] border shadow-sm"
            style={{
              color: "#c0392b",
              backgroundColor: "rgba(192, 57, 43, 0.05)",
              borderColor: "rgba(192, 57, 43, 0.12)",
            }}
          >
            {params.value}
          </span>
        </div>
      ),
    },
    {
      headerName: "Price",
      field: "current_price",
      width: 110,
      valueFormatter: (params) =>
        params.value ? `₹${params.value.toLocaleString()}` : "-",
      cellClass: "font-black text-slate-900",
    },
    {
      headerName: "Stock Status",
      field: "stock_available",
      width: 140,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <span
            className="px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border shadow-sm"
            style={{
              color: params.value ? "#059669" : "#e11d48",
              backgroundColor: params.value
                ? "rgba(5, 150, 105, 0.08)"
                : "rgba(225, 29, 72, 0.08)",
              borderColor: params.value
                ? "rgba(5, 150, 105, 0.15)"
                : "rgba(225, 29, 72, 0.15)",
            }}
          >
            {params.value ? "● In Stock" : "○ Out of Stock"}
          </span>
        </div>
      ),
    },
    {
      headerName: "Last Check",
      field: "last_updated_at",
      width: 130,
      valueFormatter: (params) =>
        params.value ? format(parseISO(params.value), "MMM dd, HH:mm") : "-",
      cellClass: "text-slate-400 font-medium",
    },
    {
      headerName: "View",
      field: "product_url",
      width: 80,
      cellRenderer: (params: any) => (
        <a
          href={params.value}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center h-full transition-colors"
          style={{ color: "#cbd5e1" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#c0392b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
        >
          <ExternalLink size={18} />
        </a>
      ),
      filter: false,
      sortable: false,
    },
  ];

  const gridOptions: GridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: false,
    },
    rowHeight: 70,
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
            className="flex flex-col gap-6 h-full pb-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between no-print">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <Package size={28} style={{ color: "#c0392b" }} />
                  Market Inventory
                </h1>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">
                  Cross-brand product catalog with real-time price & stock
                  tracking
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={handleBatchPDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
                >
                  <FileText size={14} /> Batch PDF
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="dashboard-card flex flex-wrap items-center gap-4 py-5 px-8 bg-white border-slate-100/60 no-print">
              <div className="flex items-center gap-3 flex-1 min-w-[350px] border-r border-slate-100 pr-8">
                <Search size={18} className="text-slate-400" />
                <input
                  className="text-sm font-bold border-none bg-transparent w-full focus:ring-0 focus:outline-none outline-none placeholder:text-slate-300"
                  placeholder="Filter by Name, SKU or Attributes..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="text-slate-300 hover:text-slate-500 transition-colors px-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 px-4">
                <select
                  className="text-sm font-black border-none bg-transparent text-slate-700 focus:ring-0 focus:outline-none outline-none cursor-pointer uppercase tracking-wider"
                  value={competitorId || ""}
                  onChange={(e) => {
                    setCompetitorId(
                      e.target.value ? Number(e.target.value) : undefined,
                    );
                    setPage(1);
                  }}
                >
                  <option value="">All Competitors</option>
                  {competitors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid */}
            <div
              className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ag-theme-quartz prod-grid relative ${isPrinting ? "print-mode" : ""}`}
              style={{
                height: isPrinting ? "auto" : "calc(100vh - 320px)",
                minHeight: isPrinting ? "auto" : "450px",
              }}
            >
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <GooeyLoader size="sm" />
                </div>
              )}
              <div style={{ flex: 1, minHeight: 0, width: "100%" }}>
                <AgGridReact
                  theme="legacy"
                  ref={gridRef}
                  rowData={data?.products || []}
                  columnDefs={columnDefs}
                  gridOptions={gridOptions}
                  domLayout={isPrinting ? "print" : undefined}
                />
              </div>

              {/* Pagination inside grid card */}
              <div className="flex items-center justify-between px-8 py-4 bg-white border-t border-slate-100 no-print">
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
            </div>

            <style
              dangerouslySetInnerHTML={{
                __html: `
              .prod-grid .ag-root-wrapper {
                border: none !important;
                border-radius: 24px !important;
                height: 100% !important;
              }
              .prod-grid .ag-header {
                background-color: rgba(192, 57, 43, 0.06) !important;
                border-bottom: 1px solid rgba(192, 57, 43, 0.12) !important;
              }
              .prod-grid .ag-header-cell-label {
                color: #c0392b !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
                font-size: 10px !important;
              }
              .prod-grid .ag-header-cell:hover {
                background-color: rgba(192, 57, 43, 0.04) !important;
              }
              .prod-grid .ag-cell {
                border: none !important;
                display: flex !important;
                align-items: center !important;
                color: #1e293b !important;
              }
              .prod-grid .ag-row {
                border-bottom: 1px solid rgba(192, 57, 43, 0.06) !important;
              }
              .prod-grid .ag-row-hover {
                background-color: rgba(192, 57, 43, 0.04) !important;
              }

              @media print {
                .no-print {
                  display: none !important;
                }
                
                body {
                  background: white !important;
                }

                .prod-grid {
                  position: static !important;
                  width: 100% !important;
                  height: auto !important;
                  min-height: auto !important;
                  border: none !important;
                  box-shadow: none !important;
                  overflow: visible !important;
                }

                .ag-root-wrapper, .ag-root, .ag-body-viewport {
                  height: auto !important;
                  overflow: visible !important;
                }

                .ag-header {
                  position: static !important;
                }

                .prod-grid .ag-cell:first-child {
                  /* Keep image visible in print if needed, or hide if it causes layout issues */
                  /* display: none !important; */
                }
                
                /* Ensure animations don't interfere with print */
                * {
                  animation: none !important;
                  transition: none !important;
                }
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

export default Products;
