import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { Product } from "../types";
import { analyticsService } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import GooeyLoader from "./GooeyLoader";

interface ProductDetailViewProps {
  product: Product;
  competitorName: string;
  onBack: () => void;
}

const CHART_COLORS = [
  "#378ADD",
  "#1D9E75",
  "#D4537E",
  "#BA7517",
  "#7F77DD",
  "#D85A30",
  "#3B6D11",
];

// ── Helper: render quantity display based on availability + disclosure ────────
function renderQty(
  isAvailable: boolean,
  isDisclosed: boolean,
  qty: number
): string {
  if (!isAvailable) return "—";
  if (!isDisclosed) return "N/A";
  return String(qty);
}

// ── Custom Tooltip for Price History Chart ────────────────────────────────────
const StockTrendTooltip = ({
  active,
  payload,
  label,
  sizes,
  grouped,
}: TooltipProps<number, string> & {
  sizes: string[];
  grouped: Record<
    string,
    Record<
      string,
      { quantity: number; is_available: boolean; is_quantity_disclose: boolean }
    >
  >;
}) => {
  if (!active || !payload || !payload.length) return null;
  const entries = payload.filter(
    (p) => p.value !== undefined && p.value !== null
  );

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow:
          "0 12px 32px -4px rgba(0,0,0,0.13), 0 2px 8px -2px rgba(0,0,0,0.07)",
        border: "1px solid #f0f0f0",
        padding: "10px 14px",
        minWidth: 160,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {sizes.map((size, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const info = grouped[label as string]?.[size];
          const isAvailable = info?.is_available ?? false;
          const isDisclosed = info?.is_quantity_disclose ?? false;
          const qty = info?.quantity ?? 0;
          const display = renderQty(isAvailable, isDisclosed, qty);
          return (
            <div
              key={size}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Size {size}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: isAvailable ? color : "#d1d5db",
                  background: isAvailable ? `${color}15` : "#f9fafb",
                  border: `1px solid ${isAvailable ? `${color}30` : "#e5e7eb"}`,
                  borderRadius: 6,
                  padding: "1px 7px",
                  minWidth: 32,
                  textAlign: "center",
                }}
              >
                {display}
              </span>
            </div>
          );
        })}
      </div>
      {entries.length > 1 &&
        grouped[label as string] &&
        (() => {
          const disclosedTotal = sizes.reduce((sum, s) => {
            const info = grouped[label as string]?.[s];
            if (info?.is_available && info?.is_quantity_disclose) {
              return sum + (info.quantity ?? 0);
            }
            return sum;
          }, 0);
          const hasAnyDisclosed = sizes.some(
            (s) => grouped[label as string]?.[s]?.is_quantity_disclose
          );
          if (!hasAnyDisclosed) return null;
          return (
            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                }}
              >
                Total (disclosed)
              </span>
              <span
                style={{ fontSize: 11, fontWeight: 800, color: "#111827" }}
              >
                {disclosedTotal} units
              </span>
            </div>
          );
        })()}
    </div>
  );
};

// ── Stock Dot Plot Component ──────────────────────────────────────────────────
interface DotInfo {
  quantity: number;
  is_available: boolean;
  is_quantity_disclose: boolean;
}

interface StockDotPlotProps {
  sizes: string[];
  dates: string[];
  grouped: Record<string, Record<string, DotInfo>>;
  colors: string[];
}

// ── FIXED: Tooltip now shows only sizes sharing the hovered quantity ──────────
interface DotTooltipState {
  x: number;
  y: number;
  date: string;
  size: string; // ← which size dot was hovered
}

const TOOLTIP_WIDTH = 180;

const StockDotPlot: React.FC<StockDotPlotProps> = ({
  sizes,
  dates,
  grouped,
  colors,
}) => {
  const [tooltip, setTooltip] = useState<DotTooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // ── Measure container width responsively ──────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Layout
  const Y_LEVELS = [1, 2, 3, 4, 5];
  const Y_MIN = 1;
  const Y_MAX = 5;
  const LABEL_WIDTH = 32;
  const RIGHT_PAD = 16;
  const TOP_PAD = 14;
  const BOTTOM_PAD = 36;
  const ROW_HEIGHT = 40;
  const CHART_HEIGHT = (Y_MAX - Y_MIN) * ROW_HEIGHT + TOP_PAD + BOTTOM_PAD;

  // ── Key fix: derive DATE_COL_WIDTH from actual container width ────────────
  const availableWidth = containerWidth > 0 ? containerWidth : 400;
  const DATE_COL_WIDTH =
    dates.length > 0
      ? Math.floor((availableWidth - LABEL_WIDTH - RIGHT_PAD) / dates.length)
      : 56;
  const CHART_WIDTH = availableWidth;

  const qtyToY = useCallback(
    (qty: number) => TOP_PAD + (Y_MAX - qty) * ROW_HEIGHT,
    []
  );

  const dateToX = useCallback(
    (idx: number) => LABEL_WIDTH + idx * DATE_COL_WIDTH + DATE_COL_WIDTH / 2,
    [DATE_COL_WIDTH, LABEL_WIDTH]
  );

  // ── FIXED: pass size along with date so tooltip can filter by quantity ──────
  const handleMouseEnter = (
    e: React.MouseEvent<SVGCircleElement | SVGLineElement>,
    date: string,
    size: string
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date,
      size,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  // ── Boundary-aware tooltip position ──────────────────────────────────────
  const getTooltipStyle = (): React.CSSProperties => {
    if (!tooltip) return {};
    const containerWidth = containerRef.current?.offsetWidth ?? 0;
    const wouldOverflowRight = tooltip.x + 14 + TOOLTIP_WIDTH > containerWidth;
    return {
      position: "absolute",
      left: wouldOverflowRight ? tooltip.x - TOOLTIP_WIDTH - 10 : tooltip.x + 14,
      top: Math.max(0, tooltip.y - 14),
      background: "#fff",
      borderRadius: 12,
      boxShadow:
        "0 8px 28px -4px rgba(0,0,0,0.14), 0 2px 8px -2px rgba(0,0,0,0.08)",
      border: "1px solid #f0f0f0",
      padding: "10px 13px",
      pointerEvents: "none",
      zIndex: 50,
      minWidth: TOOLTIP_WIDTH,
    };
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", overflowX: "auto" }}
    >
      <svg
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Horizontal grid lines + Y-axis labels */}
        {Y_LEVELS.map((lvl) => {
          const y = qtyToY(lvl);
          return (
            <g key={lvl}>
              <line
                x1={LABEL_WIDTH}
                x2={CHART_WIDTH - RIGHT_PAD}
                y1={y}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={LABEL_WIDTH - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fontWeight={700}
                fill="#9ca3af"
                fontFamily="system-ui, sans-serif"
              >
                {lvl}
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={9}
          y={TOP_PAD + ((Y_MAX - Y_MIN) * ROW_HEIGHT) / 2}
          textAnchor="middle"
          fontSize={8}
          fontWeight={700}
          fill="#c4c9d4"
          fontFamily="system-ui, sans-serif"
          transform={`rotate(-90, 9, ${TOP_PAD + ((Y_MAX - Y_MIN) * ROW_HEIGHT) / 2})`}
        >
          QUANTITY
        </text>

        {/* X-axis base line */}
        <line
          x1={LABEL_WIDTH}
          x2={CHART_WIDTH - RIGHT_PAD}
          y1={qtyToY(Y_MIN)}
          y2={qtyToY(Y_MIN)}
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        {/* Date labels */}
        {dates.map((date, di) => (
          <text
            key={date}
            x={dateToX(di)}
            y={qtyToY(Y_MIN) + 20}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill="#9ca3af"
            fontFamily="system-ui, sans-serif"
          >
            {date}
          </text>
        ))}

        {/* Column hover bands */}
        {dates.map((date, di) => (
          <rect
            key={di}
            x={LABEL_WIDTH + di * DATE_COL_WIDTH + 4}
            y={TOP_PAD}
            width={DATE_COL_WIDTH - 8}
            height={qtyToY(Y_MIN) - TOP_PAD}
            fill="#f9fafb"
            rx={4}
          />
        ))}

        {/* Lines connecting dots per size */}
        {sizes.map((size, si) => {
          const color = colors[si % colors.length];
          const points: { x: number; y: number }[] = [];

          dates.forEach((date, di) => {
            const info = grouped[date]?.[size];
            if (
              info?.is_available &&
              info?.is_quantity_disclose &&
              info.quantity >= 1 &&
              info.quantity <= 5
            ) {
              points.push({ x: dateToX(di), y: qtyToY(info.quantity) });
            }
          });

          if (points.length < 2) return null;

          const d = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <path
              key={`line-${size}`}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.35}
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Dots */}
        {sizes.map((size, si) => {
          const color = colors[si % colors.length];

          return dates.map((date, di) => {
            const info = grouped[date]?.[size];
            if (!info) return null;

            const { quantity, is_available, is_quantity_disclose } = info;

            if (
              is_available &&
              is_quantity_disclose &&
              quantity >= 1 &&
              quantity <= 5
            ) {
              const cx = dateToX(di);
              const cy = qtyToY(quantity);
              const isLow = quantity <= 2;

              return (
                <g key={`dot-${size}-${date}`}>
                  {isLow && (
                    <circle cx={cx} cy={cy} r={11} fill={color} opacity={0.1} />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseEnter(e, date, size)}
                    onMouseLeave={handleMouseLeave}
                  />
                </g>
              );
            } else if (is_available && !is_quantity_disclose) {
              // In stock but undisclosed — dashed ring near bottom
              const cx = dateToX(di);
              const cy = qtyToY(Y_MIN) - 8;
              return (
                <circle
                  key={`dot-na-${size}-${date}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  opacity={0.6}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleMouseEnter(e, date, size)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            } else {
              // Out of stock — small gray dash
              const cx = dateToX(di);
              return (
                <line
                  key={`oos-${size}-${date}`}
                  x1={cx - 4}
                  x2={cx + 4}
                  y1={qtyToY(Y_MIN) + 6}
                  y2={qtyToY(Y_MIN) + 6}
                  stroke="#e5e7eb"
                  strokeWidth={2}
                  strokeLinecap="round"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleMouseEnter(e, date, size)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            }
          });
        })}
      </svg>

      {/* ── FIXED Tooltip: shows only sizes sharing the hovered quantity ──────── */}
      {tooltip && (() => {
        const snapshot = grouped[tooltip.date] ?? {};
        const hoveredInfo = snapshot[tooltip.size];

        // Determine the "bucket" of the hovered dot
        const isHoveredDisclosed =
          hoveredInfo?.is_available && hoveredInfo?.is_quantity_disclose;
        const isHoveredUndisclosed =
          hoveredInfo?.is_available && !hoveredInfo?.is_quantity_disclose;
        const hoveredQty = isHoveredDisclosed ? hoveredInfo.quantity : null;

        // Filter to only sizes in the same bucket
        const filteredSizes = sizes.filter((s) => {
          const info = snapshot[s];
          if (isHoveredDisclosed) {
            // Same disclosed quantity level
            return (
              info?.is_available &&
              info?.is_quantity_disclose &&
              info.quantity === hoveredQty
            );
          } else if (isHoveredUndisclosed) {
            // All undisclosed-but-available sizes
            return info?.is_available && !info?.is_quantity_disclose;
          } else {
            // All OOS sizes
            return !info?.is_available;
          }
        });

        return (
          <div style={getTooltipStyle()}>
            {/* Date header */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              {tooltip.date}
            </div>

            {/* Only sizes sharing this quantity level */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {filteredSizes.map((size) => {
                const globalIdx = sizes.indexOf(size);
                const color = colors[globalIdx % colors.length];
                const info = snapshot[size];
                const isAvailable = info?.is_available ?? false;
                const isDisclosed = info?.is_quantity_disclose ?? false;
                const qty = info?.quantity ?? 0;
                const display = renderQty(isAvailable, isDisclosed, qty);

                return (
                  <div
                    key={size}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#374151",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {size}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: isAvailable
                          ? isDisclosed
                            ? color
                            : "#BA7517"
                          : "#d1d5db",
                        background: isAvailable
                          ? isDisclosed
                            ? `${color}15`
                            : "#fffbeb"
                          : "#f9fafb",
                        border: `1px solid ${
                          isAvailable
                            ? isDisclosed
                              ? `${color}30`
                              : "#fde68a"
                            : "#e5e7eb"
                        }`,
                        borderRadius: 6,
                        padding: "1px 7px",
                        minWidth: 32,
                        textAlign: "center",
                      }}
                    >
                      {display}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  competitorName,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"price_history" | "analytics">(
    "price_history"
  );
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["product-history", product.sku],
    queryFn: () => analyticsService.getProductHistory(product.sku),
    enabled: activeTab === "price_history",
  });

  const { data: sizeHistory = [], isLoading: isSizeLoading } = useQuery({
    queryKey: ["size-history", product.id, product.sku],
    queryFn: () =>
      analyticsService.getProductSizeHistory(
        product.is_new_launch ? "new_arrival" : "bestseller",
        product.id
      ),
    enabled: activeTab === "analytics",
  });

  const { chartData, tableRows } = useMemo(() => {
    const desc = [...history].sort(
      (a, b) =>
        new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
    );
    return {
      chartData: [...desc].reverse().map((h) => ({
        date: format(parseISO(h.scraped_at), "MMM dd"),
        price: h.price,
      })),
      tableRows: desc.map((row, i) => {
        const prev = desc[i + 1];
        const change = prev ? row.price - prev.price : 0;
        const changePct = prev?.price > 0 ? (change / prev.price) * 100 : 0;
        return { ...row, change, changePct };
      }),
    };
  }, [history]);

  const analyticsData = useMemo(() => {
    if (!sizeHistory.length) return null;

    const sorted = [...sizeHistory].sort(
      (a, b) =>
        new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
    );

    const grouped = sorted.reduce((acc: any, curr: any) => {
      const dateStr = format(parseISO(curr.captured_at), "MMM dd");
      if (!acc[dateStr]) acc[dateStr] = {};
      acc[dateStr][curr.size] = {
        quantity: curr.quantity,
        is_available: curr.is_available,
        is_quantity_disclose: curr.is_quantity_disclose,
      };
      return acc;
    }, {});

    const dates = Object.keys(grouped);
    const sizes = Array.from(
      new Set(sorted.map((s: any) => s.size))
    ).sort() as string[];

    const chart = dates.map((date) => {
      const row: any = { date };
      sizes.forEach((s) => {
        const info = grouped[date][s];
        if (!info || !info.is_available) {
          row[s] = 0;
        } else if (info.is_quantity_disclose) {
          row[s] = info.quantity;
        } else {
          row[s] = null;
        }
      });
      return row;
    });

    return { chart, dates, sizes, grouped };
  }, [sizeHistory]);

  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE);
  const paginatedRows = tableRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const lowestPrice = history.length
    ? Math.min(...history.map((h) => h.price))
    : product.current_price;
  const highestPrice = history.length
    ? Math.max(...history.map((h) => h.price))
    : product.current_price;
  const avgPrice = history.length
    ? Math.round(history.reduce((a, c) => a + c.price, 0) / history.length)
    : product.current_price;

  const latestDate = analyticsData?.dates[analyticsData.dates.length - 1];

  const stockSummary = useMemo(() => {
    if (!analyticsData || !latestDate) return null;
    const snapshot = analyticsData.grouped[latestDate];
    const available = analyticsData.sizes.filter(
      (s) => snapshot[s]?.is_available
    );
    const total = analyticsData.sizes.reduce(
      (sum, s) =>
        sum +
        (snapshot[s]?.is_quantity_disclose ? snapshot[s]?.quantity ?? 0 : 0),
      0
    );
    const low = analyticsData.sizes.filter((s) => {
      const info = snapshot[s];
      return (
        info?.is_available && info?.is_quantity_disclose && info?.quantity <= 5
      );
    });
    return {
      available: available.length,
      total,
      low: low.length,
      totalSizes: analyticsData.sizes.length,
      hasUndisclosed: analyticsData.sizes.some(
        (s) => snapshot[s]?.is_available && !snapshot[s]?.is_quantity_disclose
      ),
    };
  }, [analyticsData, latestDate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            product.is_new_launch
              ? "bg-purple-50 text-purple-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {product.is_new_launch ? "New Arrival" : "Bestseller"}
        </span>
      </div>

      {/* Product Summary */}
      <div className="px-6 py-6 border-b border-gray-100 flex items-start gap-6 bg-gradient-to-r from-gray-50/50 to-white">
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-2 shrink-0">
          <img
            src={product.image_url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
            {product.name}
          </h2>
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-400 uppercase tracking-tight">
                SKU:
              </span>
              <span className="font-medium text-gray-700">{product.sku}</span>
            </div>
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
              >
                View on {competitorName} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-black text-gray-900 tracking-tight">
            ₹{product.current_price?.toLocaleString()}
          </div>
          {product.original_price > product.current_price && (
            <div className="mt-1">
              <span className="text-sm font-bold text-red-500 mr-2">
                -{Math.round(product.discount_pct)}%
              </span>
              <span className="text-xs text-gray-400 line-through">
                ₹{product.original_price.toLocaleString()}
              </span>
            </div>
          )}
          <div
            className={`mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              product.stock_available
                ? "bg-green-50 text-green-600 border border-green-100"
                : "bg-red-50 text-red-600 border border-red-100"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                product.stock_available ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {product.stock_available ? "In Stock" : "Out of Stock"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-gray-100 flex gap-8 bg-white">
        {[
          { id: "price_history", label: "Price History", icon: "💰" },
          { id: "analytics", label: "Size Analytics", icon: "📊" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setPage(1);
            }}
            className={`py-4 text-sm font-bold border-b-2 transition-all relative flex items-center gap-2 ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-500"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              />
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5">
        <AnimatePresence mode="wait">
          {/* ── PRICE HISTORY ── */}
          {activeTab === "price_history" && (
            <motion.div
              key="price_history"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-medium">
                  Filter Range:
                </span>
                <span className="text-gray-400 ml-2">From</span>
                <input
                  type="date"
                  className="border border-gray-200 rounded px-2 py-1 text-xs"
                />
                <span className="text-gray-400">To</span>
                <input
                  type="date"
                  className="border border-gray-200 rounded px-2 py-1 text-xs"
                />
                <button className="text-gray-400 hover:text-gray-600 underline">
                  Reset
                </button>
              </div>

              {isHistoryLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <GooeyLoader size="sm" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    {[
                      {
                        label: "Lowest",
                        value: `₹${lowestPrice.toLocaleString()}`,
                        color: "text-green-600",
                      },
                      {
                        label: "Highest",
                        value: `₹${highestPrice.toLocaleString()}`,
                        color: "text-red-500",
                      },
                      {
                        label: "Average",
                        value: `₹${avgPrice.toLocaleString()}`,
                        color: "text-gray-800",
                      },
                      {
                        label: "Total change",
                        value: "—",
                        color: "text-gray-400",
                      },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">
                          {s.label}
                        </div>
                        <div className={`font-bold ${s.color}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="h-48 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f0f0f0"
                        />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                          itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{
                            r: 3,
                            fill: "#3b82f6",
                            strokeWidth: 1,
                            stroke: "#fff",
                          }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider">
                          <th className="px-4 py-2 border-b border-gray-100">
                            Date
                          </th>
                          <th className="px-4 py-2 border-b border-gray-100">
                            Price
                          </th>
                          <th className="px-4 py-2 border-b border-gray-100 text-right">
                            Change
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                          >
                            <td className="px-4 py-2 font-medium text-gray-600">
                              {format(parseISO(row.scraped_at), "MMM dd, yyyy")}
                            </td>
                            <td className="px-4 py-2 font-bold text-gray-800">
                              ₹{row.price.toLocaleString()}
                            </td>
                            <td
                              className={`px-4 py-2 text-right font-bold ${
                                row.change < 0
                                  ? "text-green-600"
                                  : row.change > 0
                                  ? "text-red-500"
                                  : "text-gray-400"
                              }`}
                            >
                              {row.change === 0
                                ? "—"
                                : `${row.change > 0 ? "+" : ""}${row.change} (${row.changePct.toFixed(1)}%)`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] text-gray-400 font-medium">
                        Page {page} of {totalPages}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={page === totalPages}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── SIZE ANALYTICS ── */}
          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {isSizeLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <GooeyLoader size="sm" />
                </div>
              ) : !analyticsData ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl mb-3 opacity-40">📦</div>
                  <p className="text-sm font-semibold text-gray-600">
                    {product.is_new_launch
                      ? "History collecting after next scrape"
                      : "Size tracking only enabled for New Arrivals"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Check back soon</p>
                </div>
              ) : (
                <>
                  {/* ── Section 1: Current Stock ── */}
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Current Stock
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                        Live
                      </span>
                    </div>

                    {stockSummary && (
                      <div className="flex gap-2 px-4 pt-3 pb-1">
                        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-[10px] text-gray-400 mb-0.5">
                            Available sizes
                          </div>
                          <div className="text-sm font-bold text-green-700">
                            {stockSummary.available} / {stockSummary.totalSizes}
                          </div>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-[10px] text-gray-400 mb-0.5">
                            {stockSummary.hasUndisclosed
                              ? "Known units"
                              : "Total units"}
                          </div>
                          <div className="text-sm font-bold text-gray-800">
                            {stockSummary.total}
                            {stockSummary.hasUndisclosed && (
                              <span className="text-[9px] text-gray-400 font-normal ml-1">
                                (partial)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                          <div className="text-[10px] text-gray-400 mb-0.5">
                            Low stock
                          </div>
                          <div
                            className={`text-sm font-bold ${
                              stockSummary.low > 0
                                ? "text-amber-600"
                                : "text-gray-400"
                            }`}
                          >
                            {stockSummary.low > 0
                              ? `${stockSummary.low} sizes`
                              : "—"}
                          </div>
                        </div>
                      </div>
                    )}

                    {stockSummary?.hasUndisclosed && (
                      <div className="px-4 pt-2 pb-0">
                        <span className="text-[10px] text-gray-400 italic">
                          N/A = In stock, exact quantity not disclosed by
                          retailer
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 p-4">
                      {analyticsData.sizes.map((size) => {
                        const info = latestDate
                          ? analyticsData.grouped[latestDate]?.[size]
                          : null;
                        const qty = info?.quantity ?? 0;
                        const inStock = info?.is_available ?? false;
                        const isDisclosed = info?.is_quantity_disclose ?? false;
                        const isLow = inStock && isDisclosed && qty <= 5;

                        let chipCls = "bg-gray-50 border-gray-100";
                        let labelCls = "text-gray-400";
                        let qtyCls = "text-gray-300";

                        if (inStock && isLow) {
                          chipCls = "bg-amber-50 border-amber-200";
                          labelCls = "text-amber-800";
                          qtyCls = "text-amber-600";
                        } else if (inStock) {
                          chipCls = "bg-green-50 border-green-200";
                          labelCls = "text-green-800";
                          qtyCls = "text-green-600";
                        }

                        return (
                          <div
                            key={size}
                            className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border ${chipCls}`}
                          >
                            <span
                              className={`text-[11px] font-bold ${labelCls}`}
                            >
                              {size}
                            </span>
                            <span
                              className={`text-[10px] font-semibold mt-0.5 ${qtyCls}`}
                            >
                              {renderQty(inStock, isDisclosed, qty)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Section 2: Stock Trend Dot Plot ── */}
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Stock Trend
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {analyticsData.dates[0]} –{" "}
                        {analyticsData.dates[analyticsData.dates.length - 1]}
                      </span>
                    </div>

                    <div className="px-4 pt-4 pb-2">
                      <StockDotPlot
                        sizes={analyticsData.sizes}
                        dates={analyticsData.dates}
                        grouped={analyticsData.grouped}
                        colors={CHART_COLORS}
                      />
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 px-4 pb-4 pt-1">
                      {analyticsData.sizes.map((size, idx) => (
                        <div
                          key={size}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                CHART_COLORS[idx % CHART_COLORS.length],
                            }}
                          />
                          <span className="text-[10px] font-bold text-gray-500 uppercase">
                            {size}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Legend hint */}
                    <div className="px-4 pb-3 flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <svg width={14} height={14}>
                          <circle
                            cx={7}
                            cy={7}
                            r={5}
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth={1.5}
                            strokeDasharray="3 2"
                          />
                        </svg>
                        <span className="text-[9px] text-gray-400">
                          In stock, qty hidden
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width={14} height={6}>
                          <line
                            x1={1}
                            x2={13}
                            y1={3}
                            y2={3}
                            stroke="#d1d5db"
                            strokeWidth={2}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-[9px] text-gray-400">
                          Out of stock
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 3: Inventory History Table ── */}
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Inventory History
                      </span>
                      <span className="text-[10px] text-gray-400 italic">
                        N/A = in stock, qty undisclosed
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50">
                              Size
                            </th>
                            {analyticsData.dates.map((date) => (
                              <th
                                key={date}
                                className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                              >
                                {date}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.sizes.map((size) => (
                            <tr
                              key={size}
                              className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors"
                            >
                              <td className="px-5 py-3 font-bold text-gray-800 sticky left-0 bg-white">
                                {size}
                              </td>
                              {analyticsData.dates.map((date) => {
                                const info =
                                  analyticsData.grouped[date]?.[size];
                                const qty = info?.quantity ?? 0;
                                const inStock = info?.is_available ?? false;
                                const isDisclosed =
                                  info?.is_quantity_disclose ?? false;
                                const display = renderQty(
                                  inStock,
                                  isDisclosed,
                                  qty
                                );

                                return (
                                  <td
                                    key={date}
                                    className="px-4 py-3 text-center"
                                  >
                                    <span
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-bold ${
                                        inStock
                                          ? "bg-green-50 text-green-700"
                                          : "bg-gray-50 text-gray-300"
                                      }`}
                                    >
                                      {display}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};