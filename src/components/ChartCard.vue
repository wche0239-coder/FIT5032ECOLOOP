<script setup>
// Interactive bar chart card (F.1 admin dashboard), built on Chart.js.
//  * hover/tap any bar for a tooltip; click a legend item to hide a series
//  * "Show as table" swaps the chart for the same numbers in a real table,
//    so nothing depends on seeing the canvas or using a mouse (BR E.3)
//  * the canvas has a text summary for screen readers
import { ref, computed, watch, onMounted, onBeforeUnmount, useId, nextTick } from 'vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

import { currentTheme, reduceMotion } from '../composables/useA11yPrefs'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  labels: { type: Array, required: true },
  // [{ label, data: number[], color }]. color is a CSS colour, or
  // { pattern: 'hatch' | 'outline', color } for texture (high contrast theme)
  datasets: { type: Array, required: true },
  unit: { type: String, default: '' }, // shown after values, e.g. 'kg'
  stacked: { type: Boolean, default: false },
  horizontal: { type: Boolean, default: false },
  height: { type: Number, default: 260 },
})

const uid = useId()
const canvas = ref(null)
const showTable = ref(false)
let chart = null

// Axis, text and surface colours come from the active theme's tokens,
// so charts follow the Accessibility settings (F.1).
function themeColors() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  return {
    ink: v('--ink', '#17211C'),
    inkSoft: v('--ink-soft', '#4B5750'),
    grid: v('--line', '#E3E7DF'),
    surface: v('--panel', '#FFFFFF'),
  }
}

/** Diagonal hatching for a second series that must not rely on colour. */
function hatch(color) {
  const c = document.createElement('canvas')
  c.width = c.height = 8
  const g = c.getContext('2d')
  g.fillStyle = '#FFFFFF'
  g.fillRect(0, 0, 8, 8)
  g.strokeStyle = color
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(0, 8); g.lineTo(8, 0)
  g.moveTo(-2, 2); g.lineTo(2, -2)
  g.moveTo(6, 10); g.lineTo(10, 6)
  g.stroke()
  return g.createPattern(c, 'repeat')
}

function fillFor(color) {
  if (typeof color === 'string') return { fill: color, hover: color + 'CC', edge: null }
  if (color.pattern === 'hatch') return { fill: hatch(color.color), hover: hatch(color.color), edge: color.color }
  return { fill: '#FFFFFF', hover: '#EEEEEE', edge: color.color } // 'outline'
}

const fmt = (v) => `${Number(v).toLocaleString('en-AU')}${props.unit ? ` ${props.unit}` : ''}`

const isEmpty = computed(() => !props.labels.length || props.datasets.every((d) => d.data.every((v) => !v)))

// One-sentence summary read by screen readers in place of the canvas.
const summary = computed(() => {
  if (isEmpty.value) return `${props.title}: no data for the selected filters.`
  const parts = props.datasets.map((d) => {
    const total = d.data.reduce((a, b) => a + b, 0)
    const max = Math.max(...d.data)
    const at = props.labels[d.data.indexOf(max)]
    return props.datasets.length > 1
      ? `${d.label} total ${fmt(Math.round(total * 10) / 10)}`
      : `highest ${fmt(max)} in ${at}, total ${fmt(Math.round(total * 10) / 10)}`
  })
  return `${props.title}, bar chart: ${parts.join('; ')}. Use “Show as table” for every value.`
})

function buildDatasets() {
  const last = props.datasets.length - 1
  const { surface } = themeColors()
  return props.datasets.map((d, i) => {
    const f = fillFor(d.color)
    return {
    label: d.label,
    data: d.data,
    backgroundColor: f.fill,
    hoverBackgroundColor: f.hover,
    // 2px surface gap between stacked segments and neighbouring bars;
    // textured series get a solid edge instead so their shape is clear.
    borderColor: f.edge || surface,
    borderWidth: f.edge ? 2 : props.stacked ? { top: 2, right: 0, bottom: 0, left: 0 } : 0,
    // rounded data-end only (top of the stack / end of the bar)
    borderRadius: !props.stacked || i === last ? 4 : 0,
    borderSkipped: f.edge ? false : 'start',
    maxBarThickness: 36,
    }
  })
}

function options() {
  const { ink: INK, inkSoft: INK_SOFT, grid: GRID } = themeColors()
  const noMotion = reduceMotion.value || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const valueAxis = {
    beginAtZero: true,
    stacked: props.stacked,
    grid: { color: GRID, drawTicks: false },
    border: { display: false },
    ticks: { color: INK_SOFT, padding: 6, precision: 0, font: { size: 12 } },
  }
  const categoryAxis = {
    stacked: props.stacked,
    grid: { display: false },
    border: { color: GRID },
    ticks: { color: INK_SOFT, font: { size: 12 } },
  }
  return {
    indexAxis: props.horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    animation: noMotion ? false : { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    scales: props.horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
    plugins: {
      legend: {
        display: props.datasets.length > 1,
        position: 'top',
        align: 'start',
        labels: { color: INK, boxWidth: 12, boxHeight: 12, useBorderRadius: true, borderRadius: 2, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: INK,
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        padding: 10,
        boxWidth: 10,
        boxHeight: 3,
        callbacks: {
          label: (ctx) => ` ${fmt(ctx.parsed[props.horizontal ? 'x' : 'y'])}  ${props.datasets.length > 1 ? ctx.dataset.label : ''}`,
        },
      },
    },
  }
}

function render() {
  if (!canvas.value) return
  chart?.destroy()
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: { labels: props.labels, datasets: buildDatasets() },
    options: options(),
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())

// Filters change the data: update in place so the chart animates instead of flashing.
watch(
  () => [props.labels, props.datasets],
  () => {
    if (!chart) return render()
    chart.data.labels = props.labels
    chart.data.datasets = buildDatasets()
    chart.update()
  },
  { deep: true }
)

// Redraw with the new colours when the person changes theme.
watch(currentTheme, async () => {
  await nextTick()
  if (chart) render()
})

watch(showTable, async (table) => {
  if (!table) {
    await nextTick()
    render()
  }
})
</script>

<template>
  <section class="crate-card p-3 chart-card" :aria-labelledby="`${uid}-title`">
    <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
      <div class="min-w-0">
        <h3 :id="`${uid}-title`" class="h6 mb-0">{{ title }}</h3>
        <p v-if="description" class="small text-soft mb-0">{{ description }}</p>
      </div>
      <button
        type="button"
        class="btn btn-ghost btn-sm text-nowrap"
        :aria-pressed="showTable"
        :aria-controls="`${uid}-body`"
        @click="showTable = !showTable"
      >
        <i :class="['bi', showTable ? 'bi-bar-chart' : 'bi-table', 'me-1']" aria-hidden="true"></i>
        {{ showTable ? 'Show as chart' : 'Show as table' }}
      </button>
    </div>

    <div :id="`${uid}-body`">
      <p v-if="isEmpty" class="text-soft small py-4 text-center mb-0">No data for the selected filters.</p>

      <div v-else-if="!showTable" class="chart-wrap" :style="{ height: `${height}px` }">
        <canvas ref="canvas" role="img" :aria-label="summary"></canvas>
      </div>

      <div v-else class="table-responsive" tabindex="0" role="region" :aria-labelledby="`${uid}-title`">
        <table class="table table-sm mb-0 small">
          <caption class="visually-hidden">{{ title }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ horizontal ? 'Category' : 'Month' }}</th>
              <th v-for="d in datasets" :key="d.label" scope="col" class="text-end">
                {{ d.label }}<span v-if="unit"> ({{ unit }})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(label, i) in labels" :key="label">
              <th scope="row" class="fw-normal">{{ label }}</th>
              <td v-for="d in datasets" :key="d.label" class="text-end num">{{ d.data[i].toLocaleString('en-AU') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chart-card { height: 100%; }
.chart-wrap { position: relative; width: 100%; }
.min-w-0 { min-width: 0; }
.num { font-variant-numeric: tabular-nums; }
.table th, .table td { padding: 0.3rem 0.4rem; }
</style>
