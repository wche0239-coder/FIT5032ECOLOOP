<script setup>
const props = defineProps({
  modelValue: { type: Number, default: 0 }, // used in interactive mode
  average: { type: Number, default: 0 }, // used in display mode
  count: { type: Number, default: 0 },
  readonly: { type: Boolean, default: false },
  size: { type: String, default: '1rem' },
})
const emit = defineEmits(['update:modelValue'])

function starValue(index) {
  return props.readonly ? props.average : props.modelValue
}
function onPick(index) {
  if (props.readonly) return
  emit('update:modelValue', index)
}
</script>

<template>
  <div class="star-rating" role="img" :aria-label="readonly ? `Rated ${average} out of 5 stars` : `Rating input, currently ${modelValue} out of 5`">
    <button
      v-for="i in 5" :key="i"
      type="button"
      class="star-btn"
      :class="{ 'star-btn--readonly': readonly }"
      :style="{ fontSize: size }"
      :tabindex="readonly ? -1 : 0"
      :aria-label="`${i} star${i > 1 ? 's' : ''}`"
      @click="onPick(i)"
    >
      <i :class="['bi', i <= Math.round(starValue(i)) ? 'bi-star-fill' : 'bi-star']"></i>
    </button>
    <span v-if="readonly" class="small text-faint ms-1">
      {{ average > 0 ? average.toFixed(1) : 'No ratings yet' }}
      <template v-if="average > 0 && count">({{ count }})</template>
    </span>
  </div>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
}
.star-btn {
  background: none;
  border: none;
  padding: 0 1px;
  line-height: 1;
  color: var(--chalk);
  cursor: pointer;
}
.star-btn--readonly { cursor: default; }
.star-btn:not(.star-btn--readonly):hover i {
  transform: scale(1.15);
}
.star-btn i { display: inline-block; transition: transform .1s ease; }
</style>
