<script setup>
defineProps({
  variant: { type: String, default: 'default' }, // default | free | price
  rotateRight: { type: Boolean, default: false },
})
</script>

<template>
  <span
    class="market-tag"
    :class="[
      variant === 'free' ? 'market-tag--free' : '',
      variant === 'price' ? 'market-tag--price' : '',
      rotateRight ? 'market-tag--rotate-r' : '',
    ]"
  >
    <slot />
  </span>
</template>
