import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './style.css'
import App from './App.vue'
import { initA11yPrefs } from './composables/useA11yPrefs'
import router from './router'

initA11yPrefs()
createApp(App).use(router).mount('#app')
