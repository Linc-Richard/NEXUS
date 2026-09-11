import React from 'react'
import { cls, formatPercent } from '../../utils/format.js'
import { Icon } from '../ui/Icon.jsx'
import { Sparkline } from '../charts/charts.jsx'

const TONES = {
  primary: { color: 'var(--chart-1)', soft: 'var(--primary-soft)' },
  info: { color: 'var(--chart-5)', soft: 'var(--info-soft)' },
  warn: { color: 'var(--chart-3)', soft: 'var(--warn-soft)' },
  ok: { color: 'var(--chart-2)', soft: 'var(--ok-soft)' },
  danger: { color: 'var(--chart-4)', soft: 'var(--danger-soft)' }
}

export function StatCard({ label, value, change, compare, icon, tone = 'primary', spark, foot }) {
  const t = TONES[tone] || TONES.primary
  const trend = change == null ? null : change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'flat'
  const dirIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'minus'
  const arrowIcon = trend === 'up' ? 'arrow-up-right' : 'arrow-down-right'

  return (
    <article className="stat-card">
      <div className="stat-top">
        <span className="stat-ic" style={{ background: t.soft, color: t.color }}>
          <Icon name={icon} size={19} />
        </span>
        {spark && spark.length > 1 ? (
          <span className="stat-spark">
            <Sparkline data={spark} color={t.color} id={`${label}-${tone}`} />
          </span>
        ) : (
          <span className="faint text-xs">{compare}</span>
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ marginTop: 4 }}>{value}</div>
      <div className="stat-foot">
        {trend ? (
          <>
            <span className={cls('trend-badge', trend)}>
              <Icon name={arrowIcon} size={12} />
              {formatPercent(Math.abs(change))}
            </span>
            <span>{compare}</span>
          </>
        ) : (
          foot || <span className="faint">{compare}</span>
        )}
      </div>
    </article>
  )
}

export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-desc">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}