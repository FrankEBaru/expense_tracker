import { useState, useEffect } from 'react'
import { CHART, CHART_TOOLTIP_CLASS, CHART_TOOLTIP_TITLE_CLASS } from '../constants/chartConfig'

export interface BarSegment {
  heightPct: number
  color: string
  label?: string
}

export interface VerticalBarChartProps<T extends { ym: string; label: string }> {
  data: T[]
  getSegments: (item: T) => BarSegment[]
  renderTooltip: (item: T) => React.ReactNode
  legendItems?: { id: string; name: string; color: string }[]
  emptyMessage: string
  hasData: boolean
}

const barChart = CHART.barChart

function computeChartHeight(hasLegend: boolean): number {
  return (
    barChart.tooltipReserveHeight +
    barChart.barHeight +
    barChart.monthLabelHeight +
    (hasLegend ? 8 + barChart.legendRowHeight : 0)
  )
}

export function VerticalBarChart<T extends { ym: string; label: string }>({
  data,
  getSegments,
  renderTooltip,
  legendItems = [],
  emptyMessage,
  hasData,
}: VerticalBarChartProps<T>) {
  const [hoveredYm, setHoveredYm] = useState<string | null>(null)

  useEffect(() => {
    if (!hoveredYm) return
    const onDocClick = () => {
      setHoveredYm(null)
      document.removeEventListener('click', onDocClick)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [hoveredYm])

  if (!hasData) {
    return <p className="text-xs text-gray-400 dark:text-gray-500">{emptyMessage}</p>
  }

  const chartHeight = computeChartHeight(legendItems.length > 0)
  const hasLegend = legendItems.length > 0

  return (
    <div
      className="relative min-w-0 w-full overflow-y-hidden"
      style={{
        height: chartHeight,
        marginTop: CHART.section.chartMarginTop,
        paddingLeft: barChart.horizontalPadding,
        paddingRight: barChart.horizontalPadding,
      }}
    >
      <div className="relative flex w-full flex-col">
        {hoveredYm && (() => {
          const item = data.find((d) => d.ym === hoveredYm)
          const idx = data.findIndex((d) => d.ym === hoveredYm)
          if (!item || idx < 0) return null
          const rawLeftPct = (data.length > 0 ? (idx + 0.5) / data.length : 0.5) * 100
          const leftPct = Math.max(
            barChart.tooltipMinLeftPct,
            Math.min(barChart.tooltipMaxLeftPct, rawLeftPct)
          )
          return (
            <div
              className={CHART_TOOLTIP_CLASS}
              style={{
                left: `${leftPct}%`,
                top: 0,
                transform: 'translateX(-50%)',
              }}
            >
              <p className={CHART_TOOLTIP_TITLE_CLASS}>{item.label}</p>
              {renderTooltip(item)}
            </div>
          )
        })()}
        {/* Row 1: bars only – fixed height so all bars align */}
        <div
          className="flex w-full gap-1 items-end"
          style={{
            marginTop: barChart.tooltipReserveHeight,
            height: barChart.barHeight,
            gap: barChart.gap,
          }}
        >
          {data.map((item) => {
            const segments = getSegments(item)
            const isStacked = segments.length > 1
            return (
              <div
                key={item.ym}
                className="flex min-w-0 flex-1 flex-col items-center justify-end"
                style={{ height: '100%' }}
                onMouseEnter={() => setHoveredYm(item.ym)}
                onMouseLeave={() => setHoveredYm(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  setHoveredYm(item.ym)
                }}
              >
                {isStacked ? (
                  segments.length === 0 ? (
                    <div style={{ height: barChart.barHeight, width: '100%' }} />
                  ) : (
                    <div
                      className="flex w-full flex-col gap-0.5 justify-end"
                      style={{ height: barChart.barHeight, width: '100%' }}
                    >
                      {segments.map((seg, i) => (
                        <div
                          key={i}
                          className="rounded-sm min-h-[2px] w-full"
                          style={{
                            height: `${seg.heightPct}%`,
                            backgroundColor: seg.color,
                          }}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex w-full flex-1 min-h-0 flex-col justify-end" style={{ width: '100%' }}>
                    <div
                      className="w-full rounded-t min-h-[4px] bg-blue-500 dark:bg-blue-600"
                      style={{
                        height: `${segments[0]?.heightPct ?? 0}%`,
                        ...(segments[0]?.color && { backgroundColor: segments[0].color }),
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {/* Row 2: month labels only – fixed height so legend doesn't overlap */}
        <div
          className="flex w-full gap-1 items-center"
          style={{
            height: barChart.monthLabelHeight,
            gap: barChart.gap,
          }}
        >
          {data.map((item) => (
            <span
              key={item.ym}
              className="min-w-0 flex-1 text-center text-[10px] text-gray-500 dark:text-gray-400 truncate"
              title={item.label}
            >
              {item.label}
            </span>
          ))}
        </div>
        {hasLegend && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-600 dark:text-gray-400 shrink-0 min-h-0">
            {legendItems.map((leg) => (
              <span key={leg.id} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: leg.color }}
                  aria-hidden
                />
                <span className="truncate max-w-[120px]" title={leg.name}>
                  {leg.name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
