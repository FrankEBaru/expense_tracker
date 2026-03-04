import { useState, useRef, useEffect } from 'react'
import { CHART, CHART_TOOLTIP_CLASS, CHART_TOOLTIP_TITLE_CLASS } from '../constants/chartConfig'

export interface TrendSeries {
  id: string
  name: string
  color: string
  values: number[]
}

export interface TrendLineChartProps {
  data: { ym: string; label: string }[]
  series: TrendSeries[]
  yMin: number
  yMax: number
  formatYTick: (v: number) => string
  renderTooltip: (monthIndex: number) => React.ReactNode
  showLegend?: boolean
}

const { height, padding, minWidth, widthPerPoint, yTicks: yTicksCount, fontSize } = CHART.lineChart

export function TrendLineChart({
  data,
  series,
  yMin,
  yMax,
  formatYTick,
  renderTooltip,
  showLegend = false,
}: TrendLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const range = yMax - yMin || 1
  const width =
    containerWidth > 0
      ? Math.max(minWidth, containerWidth)
      : Math.max(minWidth, data.length * widthPerPoint)
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const tickValues: number[] = []
  for (let i = 0; i <= yTicksCount; i++) {
    tickValues.push(yMin + (i / yTicksCount) * (yMax - yMin))
  }

  const showEveryNthLabel = data.length > 10 ? 2 : 1
  const activeIndex = pinnedIndex ?? hoverIndex

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el || data.length === 0) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const fraction = rect.width > 0 ? x / rect.width : 0
    const index = Math.min(data.length - 1, Math.max(0, Math.floor(fraction * data.length)))
    setHoverIndex(index)
  }

  const handleMouseLeave = () => setHoverIndex(null)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const el = containerRef.current
    if (!el || data.length === 0) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const fraction = rect.width > 0 ? x / rect.width : 0
    const index = Math.min(data.length - 1, Math.max(0, Math.floor(fraction * data.length)))
    setPinnedIndex(index)
  }

  useEffect(() => {
    if (pinnedIndex === null) return
    const onDocClick = () => {
      setPinnedIndex(null)
      document.removeEventListener('click', onDocClick)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [pinnedIndex])

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-0"
      style={{ minHeight: height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full block"
        style={{ height, minHeight: height }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines */}
        {tickValues.slice(1, -1).map((v, i) => {
          const y = padding.top + (1 - (v - yMin) / range) * innerHeight
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          )
        })}
        {/* Vertical grid lines */}
        {data.length > 1 &&
          data.slice(1, -1).map((_, i) => {
            const x = padding.left + ((i + 1) / (data.length - 1)) * innerWidth
            return (
              <line
                key={i}
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="2,2"
                strokeWidth="1"
              />
            )
          })}
        {/* Y-axis labels */}
        {tickValues.map((v, i) => {
          const y = padding.top + (1 - (v - yMin) / range) * innerHeight
          return (
            <text
              key={i}
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={fontSize.axis}
            >
              ${formatYTick(v)}
            </text>
          )
        })}
        {/* Polylines */}
        {series.map((s) => {
          const points = s.values
            .map((val, i) => {
              const x = padding.left + (i / Math.max(1, data.length - 1)) * innerWidth
              const y = padding.top + (1 - (val - yMin) / range) * innerHeight
              return `${x},${y}`
            })
            .join(' ')
          return (
            <polyline
              key={s.id}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            >
              <title>{s.name}</title>
            </polyline>
          )
        })}
        {/* X-axis month labels */}
        {data.map((m, i) => {
          if (i % showEveryNthLabel !== 0) return null
          const x = padding.left + (i / Math.max(1, data.length - 1)) * innerWidth
          return (
            <text
              key={m.ym}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={fontSize.label}
            >
              {m.label}
            </text>
          )
        })}
      </svg>
      {/* Tooltip */}
      {activeIndex !== null && data[activeIndex] && (
        <div
          className={CHART_TOOLTIP_CLASS}
          style={{ left: '50%', top: 8, transform: 'translateX(-50%)', maxWidth: 220 }}
        >
          <p className={CHART_TOOLTIP_TITLE_CLASS}>{data[activeIndex].label}</p>
          {renderTooltip(activeIndex)}
        </div>
      )}
      {/* Legend */}
      {showLegend && series.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="truncate max-w-[120px]" title={s.name}>
                {s.name}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
