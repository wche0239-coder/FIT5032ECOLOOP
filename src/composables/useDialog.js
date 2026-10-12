import { watch, nextTick, onBeforeUnmount } from 'vue'

// BR (E.3) — keyboard-accessible modal dialogs (WCAG 2.1.1 Keyboard,
// 2.1.2 No Keyboard Trap, 2.4.3 Focus Order):
//   * focus moves into the dialog when it opens
//   * Tab / Shift+Tab cycle inside the dialog while it is open
//   * Escape closes it
//   * focus returns to the control that opened it
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * @param {() => boolean} isOpen  getter: is the dialog currently shown?
 * @param {import('vue').Ref<HTMLElement|null>} panelRef  the dialog element
 * @param {() => void} close  called on Escape
 */
export function useDialog(isOpen, panelRef, close) {
  let returnFocusTo = null

  function focusables() {
    return panelRef.value ? Array.from(panelRef.value.querySelectorAll(FOCUSABLE)) : []
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const items = focusables()
    if (items.length === 0) {
      event.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    isOpen,
    async (open) => {
      if (open) {
        returnFocusTo = document.activeElement
        document.addEventListener('keydown', onKeydown)
        await nextTick()
        const target = panelRef.value?.querySelector('[autofocus]') || focusables()[0] || panelRef.value
        target?.focus()
      } else {
        document.removeEventListener('keydown', onKeydown)
        if (returnFocusTo && typeof returnFocusTo.focus === 'function') returnFocusTo.focus()
        returnFocusTo = null
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
}
