// BR (E.4) — export table data as CSV or PDF.
// Exports use the same columns and formatting as the on-screen table,
// and receive the rows *after* the user's search, filters and sort, so
// "what you see is what you export".
import { cellText } from './tableEngine.js'

// Cells starting with these characters are executed as formulas by
// Excel / Sheets ("CSV injection"), so they get a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

function csvCell(value) {
  let text = String(value ?? '')
  if (FORMULA_START.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => csvCell(cellText(row, c))).join(','))
  // ﻿ lets Excel detect UTF-8 (so "Café" doesn't turn into "CafÃ©").
  return '﻿' + [header, ...body].join('\r\n')
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(columns, rows, filename) {
  triggerDownload(new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

/**
 * Builds a PDF report. jsPDF is loaded on demand so it isn't part of
 * the initial page download for people who never export.
 * @returns {Promise<import('jspdf').jsPDF>}
 */
export async function buildPdf({ title, subtitle, columns, rows }) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' })

  doc.setProperties({ title, subject: subtitle || title, creator: 'EcoLoop' })
  doc.setFontSize(16)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(subtitle || `Generated ${new Date().toLocaleString('en-AU')} · ${rows.length} rows`, 14, 22)

  autoTable(doc, {
    startY: 27,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => cellText(row, c))),
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [31, 92, 77] },
    alternateRowStyles: { fillColor: [239, 241, 234] },
  })
  return doc
}

export async function downloadPdf(options, filename) {
  const doc = await buildPdf(options)
  doc.save(`${filename}.pdf`)
}

/** PDF as base64 (no data: prefix) — used as an email attachment (BR D.2). */
export async function pdfBase64(options) {
  const doc = await buildPdf(options)
  return doc.output('datauristring').split(',')[1]
}
