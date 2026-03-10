'use client'

import { Download } from 'lucide-react'
import type { Transaction } from '@/types/database'

interface Props {
  transactions: Transaction[]
  fromDate: string
  toDate: string
}

export function ExportCSV({ transactions, fromDate, toDate }: Props) {
  function handleExport() {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Aircraft', 'Reference', 'Notes']
    const rows = transactions.map(t => [
      t.transaction_date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.is_income ? 'Income' : 'Expense',
      t.amount.toFixed(2),
      (t.aircraft as any)?.name || '',
      t.reference_number || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `encompass-finance-${fromDate}-to-${toDate}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button onClick={handleExport} className="btn-secondary">
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  )
}
