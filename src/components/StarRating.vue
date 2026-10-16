<script setup>
// Two modes:
//  * readonly — a single image-like element with a text alternative
//    ("Rated 4.2 out of 5 from 3 ratings"). Renders <span>s, never
//    buttons, so it can sit inside another button (as on ListingCard).
//  * interactive — a radio group: Tab focuses it, arrow keys change
//    the value, each star announces "3 stars, selected" (BR E.3).
const props = defineProps({
  modelValue: { type: Number, default: 0 }, // interactive mode
  average: { type: Number, default: 0 }, // readonly mode
  count: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false },
  size: { type: String, default: '1rem' },
  label: { type: String, default: 'Your rating' },
})
const emit = defineEmits(['update:modelValue'])

function pick(value) {
  emit('update:modelValue', Math.min(5, Math.max(1, value)))
}

function onKeydown(event, current) {
  const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }
  if (event.key in keys) {
    event.preventDefault()
    const next = Math.min(5, Math.max(1, (props.modelValue || current) + keys[event.key]))
    pick(next)
    event.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next - 1]?.focus()
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    pick(event.key === 'Home' ? 1 : 5)
  }
}

const readonlyLabel = () =>
  props.average > 0
    ? `Rated ${props.average.toFixed(1)} out of 5 from ${props.count} rating${props.count === 1 ? '' : 's'}`
    : 'No ratings yet'
</script>

<template>
  <span v-if="readonly" class="star-rating">
    <span role="img" :aria-label="readonlyLabel()" class="d-inline-flex">
      <i
        v-for="i in 5"
        :key="i"
        :class="['bi', i <= Math.round(average) ? 'bi-star-fill' : 'bi-star', 'star-icon']"
        :style="{ fontSize: size }"
        aria-hidden="true"
      ></i>
    </span>
    <span class="small text-faint ms-1" aria-hidden="true">
      {{ average > 0 ? average.toFixed(1) : 'No ratings yet' }}
      <template v-if="average > 0 && count">({{ count }})</template>
    </span>
  </span>

  <div v-else class="star-rating" role="radiogroup" :aria-label="label">
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      role="radio"
      class="star-btn"
      :style="{ fontSize: size }"
      :aria-checked="modelValue === i"
      :aria-label="`${i} star${i > 1 ? 's' : ''}`"
      :tabindex="modelValue === i || (modelValue === 0 && i === 1) ? 0 : -1"
      @click="pick(i)"
      @keydown="onKeydown($event, i)"
    >
      <i :class="['bi', i <= modelValue ? 'bi-star-fill' : 'bi-star']" aria-hidden="true"></i>
    </button>
  </div>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
}
/* Darker gold than --chalk so stars meet 3:1 non-text contrast. */
.star-icon, .star-btn { color: #9A7414; }
.star-btn {
  background: none;
  border: none;
  padding: 0 1px;
  line-height: 1;
  cursor: pointer;
}
.star-btn:hover i { transform: scale(1.15); }
.star-btn:focus-visible { outline: 2.5px solid var(--caution); outline-offset: 2px; }
.star-btn i { display: inline-block; transition: transform 0.1s ease; }
</style>
