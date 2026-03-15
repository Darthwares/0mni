/**
 * Export data rows as a CSV file download.
 *
 * @param filename - name of the file (without extension)
 * @param columns - array of { header, accessor } where accessor extracts the cell value
 * @param rows - array of data objects
 */
export function exportCSV<T>(
  filename: string,
  columns: { header: string; accessor: (row: T) => string | number | boolean | null | undefined }[],
  rows: T[]
) {
  const escape = (val: unknown): string => {
    const s = val === null || val === undefined ? '' : String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const header = columns.map((c) => escape(c.header)).join(',')
  const body = rows.map((row) =>
    columns.map((c) => escape(c.accessor(row))).join(',')
  )
  const csv = [header, ...body].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
