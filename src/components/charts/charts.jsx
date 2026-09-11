import React, { useCallback, useEffect, useId, useRef, useState } from 'react'

export function useMeasure() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width)
    })
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

export function niceMax(value) {
  if (value <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return nice * pow
}

const { max, min } = Math

export function linePath(points) {
  if (!points.length) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(' ')
}

/* ================= Line / area chart ================= */
export function LineChart({
  data,
  series,
  height = 280,
  yFormat = (v) => `TZS ${v < 1000 ? v : ''}${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : ''}`,
  y2Format = (v) => `${v}`,
  leftLabel = '',
  rightLabel = '',
  xTickEvery,
  className
}) {
  const uid = useId().replace(/:/g, '')
  const [ref, width] = useMeasure()
  const [hover, setHover] = useState(null)

  const hasRight = series.some((s) => s.axis === 'right')
  const pad = { l: 54, r: hasRight ? 54 : 14, t: 14, b: 34 }
  const iw = Math.max(width - pad.l - pad.r, 10)
  const ih = height - pad.t - pad.b

  const leftVals = data.flatMap((d) => series.filter((s) => s.axis !== 'right').map((s) => d[s.key] ?? 0))
  const rightVals = data.flatMap((d) => series.filter((s) => s.axis === 'right').map((s) => d[s.key] ?? 0))
  const leftMax = niceMax(max(1, ...leftVals))
  const rightMax = niceMax(max(1, ...rightVals))
  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (leftMax / ticks) * i)
  const y2Ticks = Array.from({ length: ticks + 1 }, (_, i) => (rightMax / ticks) * i)

  const xAt = (i) => pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const yAt = (v) => pad.t + ih - (v / leftMax) * ih
  const y2At = (v) => pad.t + ih - (v / rightMax) * ih

  const buildPath = (key, area, axis) => {
    const yFn = axis === 'right' ? y2At : yAt
    const pts = data.map((d, i) => [xAt(i), yFn(d[key] ?? 0)])
    let d = linePath(pts)
    if (area) {
      const last = pts[pts.length - 1]
      const first = pts[0]
      d += ` L ${last[0]} ${pad.t + ih} L ${first[0]} ${pad.t + ih} Z`
    }
    return d
  }

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const idx = Math.round(((mx - pad.l) / iw) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, idx)))
  }

  const labelStep = xTickEvery || (data.length > 24 ? Math.ceil(data.length / 6) : data.length > 12 ? 2 : 1)

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={ref} style={{ width: '100%' }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Analytics chart">
            {yTicks.map((t, i) => {
              const y = yAt(t)
              return (
                <g key={i}>
                  <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke="var(--border)" strokeWidth="1" />
                  <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize="10.5" fill="var(--text-3)" fontFamily="var(--font-mono)">
                    {i === 0 ? '' : yFormat(t)}
                  </text>
                </g>
              )
            })}
            {hasRight &&
              y2Ticks.map((t, i) => {
                const y = y2At(t)
                return (
                  <text key={'r' + i} x={width - pad.r + 10} y={y + 4} textAnchor="start" fontSize="10.5" fill="var(--text-3)" fontFamily="var(--font-mono)">
                    {i === 0 ? '' : y2Format(t)}
                  </text>
                )
              })}
            {leftLabel && (
              <text x={12} y={pad.t - 2} fontSize="10.5" fill="var(--text-3)" fontWeight="600" textAnchor="middle" transform={`rotate(-90 12 ${height / 2})`}>
                {leftLabel}
              </text>
            )}
            {rightLabel && hasRight && (
              <text x={width - 10} y={pad.t - 2} fontSize="10.5" fill="var(--text-3)" fontWeight="600" textAnchor="middle" transform={`rotate(90 ${width - 10} ${height / 2})`}>
                {rightLabel}
              </text>
            )}
            {data.map((d, i) => {
              if (i % labelStep !== 0) return null
              return (
                <text
                  key={i}
                  x={xAt(i)}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--text-3)"
                  fontFamily="var(--font-sans)"
                >
                  {d.label}
                </text>
              )
            })}
            {series.map((s) => (
              <path
                key={s.key}
                d={buildPath(s.key, !!s.area, s.axis)}
                fill={s.area ? `url(#grad-${uid}-${s.key})` : 'none'}
                stroke={s.color}
                strokeWidth={s.area ? 2.2 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {hover != null && (
              <g>
                <line x1={xAt(hover)} y1={pad.t} x2={xAt(hover)} y2={pad.t + ih} stroke="var(--text-3)" strokeWidth="1" strokeDasharray="3 3" />
                {series.map((s) => {
                  const yFn = s.axis === 'right' ? y2At : yAt
                  return (
                    <circle key={s.key} cx={xAt(hover)} cy={yFn(data[hover][s.key] ?? 0)} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
                  )
                })}
              </g>
            )}
            <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          </svg>
        )}
      </div>
      {series.map((s) => (
        <defs key={s.key}>
          <linearGradient id={`grad-${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
      ))}
      {hover != null && data[hover] && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(xAt(hover) + 12, width - 210),
            top: 6,
            zIndex: 5,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            padding: '10px 12px',
            minWidth: 190,
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{data[hover].label}</div>
          {series.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, padding: '1.5px 0', color: 'var(--text-2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: s.color, flex: '0 0 auto' }} />
              <span className="grow">{s.label}</span>
              <b className="tabular" style={{ color: 'var(--text)' }}>
                {s.axis === 'right' ? y2Format(data[hover][s.key] ?? 0) : yFormat(data[hover][s.key] ?? 0)}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================= Bar chart ================= */
export function BarChart({ data, series, height = 260, yFormat = (v) => `${v}`, xTickEvery }) {
  const [ref, width] = useMeasure()
  const [hover, setHover] = useState(null)
  const pad = { l: 50, r: 12, t: 14, b: 34 }
  const iw = Math.max(width - pad.l - pad.r, 10)
  const ih = height - pad.t - pad.b

  const maxVal = niceMax(max(1, ...data.flatMap((d) => series.map((s) => d[s.key] ?? 0))))
  const ticks = 4

  const groupW = iw / data.length
  const barW = Math.max(2, Math.min(26, (groupW / (series.length + 1)) * 0.8))

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    setHover(Math.max(0, Math.min(data.length - 1, Math.floor(((mx - pad.l) / iw) * data.length))))
  }

  const labelStep = xTickEvery || (data.length > 24 ? Math.ceil(data.length / 6) : data.length > 12 ? 2 : 1)
  const firstRef = data[hover]

  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Bar chart">
            {Array.from({ length: ticks + 1 }, (_, i) => {
              const y = pad.t + ih - (maxVal / ticks / maxVal) * ih * i
              const v = (maxVal / ticks) * i
              return (
                <g key={i}>
                  <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke="var(--border)" strokeWidth="1" />
                  <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize="10.5" fill="var(--text-3)" fontFamily="var(--font-mono)">
                    {i === 0 ? '' : yFormat(v)}
                  </text>
                </g>
              )
            })}
            {data.map((d, i) => {
              const cx = pad.l + groupW * i + groupW / 2
              const start = cx - (barW * series.length + (series.length - 1) * 3) / 2
              return (
                <g key={i}>
                  {i % labelStep === 0 && (
                    <text x={cx} y={height - 12} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill="var(--text-3)">
                      {d.label}
                    </text>
                  )}
                  {series.map((s, si) => {
                    const v = d[s.key] ?? 0
                    const h = (v / maxVal) * ih
                    const x = start + si * (barW + 3)
                    return (
                      <rect
                        key={s.key}
                        x={x}
                        y={pad.t + ih - h}
                        width={barW}
                        height={h}
                        rx={4}
                        fill={s.color}
                        opacity={hover == null || hover === i ? 1 : 0.45}
                      />
                    )
                  })}
                </g>
              )
            })}
            <rect x={pad.l} y={pad.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          </svg>
        )}
      </div>
      {firstRef && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(pad.l + (hover / data.length) * iw + groupW / 2 + 12, width - 200),
            top: 6,
            zIndex: 5,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            padding: '10px 12px',
            minWidth: 180,
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{firstRef.label}</div>
          {series.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, padding: '1.5px 0', color: 'var(--text-2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: s.color, flex: '0 0 auto' }} />
              <span className="grow">{s.label}</span>
              <b className="tabular" style={{ color: 'var(--text)' }}>{yFormat(firstRef[s.key] ?? 0)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================= Donut chart ================= */
export function DonutChart({ data, size = 200, thickness = 26, centerTop = 'Total', centerBottom, format = (v) => String(v) }) {
  const [active, setActive] = useState(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2
  const c = size / 2
  const CIRC = 2 * Math.PI * r

  let offset = 0
  const segs = data.map((d) => {
    const frac = total ? d.value / total : 0
    const seg = { ...d, frac, dash: frac * CIRC, offset: offset * CIRC }
    offset += frac
    return seg
  })

  const activeSeg = active != null ? segs[active] : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {segs.map((s, i) => (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={active === i ? thickness + 4 : thickness}
            strokeDasharray={`${Math.max(s.dash - 2.5, 0.5)} ${CIRC}`}
            strokeDashoffset={-s.offset - 1.2}
            transform={`rotate(-90 ${c} ${c})`}
            strokeLinecap="butt"
            opacity={active == null || active === i ? 1 : 0.4}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            tabIndex="0"
            style={{ outline: 'none', cursor: 'pointer' }}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {activeSeg ? activeSeg.label : centerTop}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
          {activeSeg ? format(activeSeg.value) : centerBottom}
        </div>
        {activeSeg && (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>{Math.round(activeSeg.frac * 100)}%</div>
        )}
      </div>
    </div>
  )
}

/* ================= Sparkline ================= */
export function Sparkline({ data, color = 'var(--primary)', width = 86, height = 34, id }) {
  const gid = id || useId().replace(/:/g, '')
  if (!data || data.length < 2) return null
  const minD = min(...data)
  const maxD = max(...data)
  const span = maxD - minD || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 4 - ((v - minD) / span) * (height - 8)
  ])
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}