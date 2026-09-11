import React from 'react'
import { cls } from '../../utils/format.js'
import { Icon } from './Icon.jsx'

export function ResponsiveTable({
  columns,
  rows,
  onRowClick,
  sort,
  onSort,
  empty,
  emptyIcon = 'inbox',
  emptyTitle = 'Nothing here yet',
  emptyDesc,
  emptyAction,
  className,
  cardTitle
}) {
  const first = columns[0]

  if (!rows.length) {
    return (
      <div className="table-card" style={{ minHeight: 220 }}>
        <EmptyStateInline icon={emptyIcon} title={emptyTitle} description={emptyDesc} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className={cls('table-card rt', className)}>
      <div className="table-wrap">
        <table className="table rt-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cls(
                    c.sortable && 'sortable',
                    c.align === 'right' && 'text-right',
                    c.hideMobile && 'hide-mobile'
                  )}
                  aria-sort={sort && sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                  onClick={() => c.sortable && onSort && onSort(c.key)}
                  style={{ textAlign: c.align === 'right' ? 'right' : undefined }}
                >
                  {c.label}
                  {c.sortable && sort && sort.key === c.key && (
                    <span className="sort-ic">
                      <Icon name={sort.dir === 1 ? 'chevron-down' : 'chevron-up'} size={13} />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={row.__key ?? ri}
                className={onRowClick ? 'clickable' : ''}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((c, ci) => (
                  <td
                    key={c.key}
                    className={cls(ci === 0 && 'cell-main', c.align === 'right' && 'text-right')}
                    style={{ textAlign: c.align === 'right' ? 'right' : undefined }}
                  >
                    {c.render ? c.render(row, ri) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="rt-cards">
        {rows.map((row, ri) => (
          <div
            key={row.__key ?? ri}
            className={cls('rt-card', onRowClick && 'clickable')}
            onClick={() => onRowClick && onRowClick(row)}
          >
            <div className="rt-card-head">
              <div className="grow" style={{ minWidth: 0 }}>
                {first.render ? first.render(row, ri) : row[first.key]}
              </div>
              {cardTitle && cardTitle(row, ri)}
            </div>
            <div className="rt-card-fields">
              {columns.slice(1).map((c) => (
                <div key={c.key} className="rt-card-field">
                  <span className="rt-card-label">{c.label}</span>
                  <span className="rt-card-value">
                    {c.render ? c.render(row, ri) : row[c.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyStateInline({ icon, title, description, action }) {
  return (
    <div className="empty-state" style={{ minHeight: 220 }}>
      <div className="empty-ic">
        <Icon name={icon} size={26} />
      </div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action && <div className="empty-actions">{action}</div>}
    </div>
  )
}