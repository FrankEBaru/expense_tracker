/**
 * Shared configuration for Insights charts: layout, margins, typography, tooltips.
 * Use these values so trend and bar charts stay consistent and maintainable.
 */

export const CHART = {
  /** Line/trend chart dimensions */
  lineChart: {
    height: 180,
    padding: { top: 20, right: 20, bottom: 36, left: 52 },
    /** Minimum chart width so it doesn't get over-stretched on wide screens */
    minWidth: 320,
    /** Approximate width per data point (month) */
    widthPerPoint: 32,
    yTicks: 5,
    fontSize: { axis: 11, label: 10 },
  },
  /** Stacked bar chart (by month) */
  barChart: {
    barHeight: 88,
    barWidth: 56,
    gap: 4,
    /** Reserved space above bars for tooltip so hover doesn't cause layout shift */
    tooltipReserveHeight: 44,
    /** Height reserved for month labels row (below bars) */
    monthLabelHeight: 20,
    /** Height reserved for category legend row (can wrap) */
    legendRowHeight: 32,
    /** Horizontal padding inside the chart area to avoid cramped scrollbar */
    horizontalPadding: 8,
  },
  /** Section spacing */
  section: {
    titleMarginBottom: 12,
    chartMarginTop: 8,
  },
} as const

/** Single class string for all chart hover tooltips: dark background, white text. */
export const CHART_TOOLTIP_CLASS =
  'absolute z-10 px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 dark:bg-gray-900 text-white shadow-xl text-xs pointer-events-none'

/** Inner content for tooltip title (month label). */
export const CHART_TOOLTIP_TITLE_CLASS = 'font-semibold border-b border-gray-600 pb-1.5 mb-1.5'

/** Inner content for tooltip body (values list). */
export const CHART_TOOLTIP_BODY_CLASS = 'space-y-1'
