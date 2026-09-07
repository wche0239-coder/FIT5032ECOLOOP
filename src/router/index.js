import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { setFlash } from '../composables/useFlash'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/browse', name: 'browse', component: () => import('../views/BrowseView.vue') },
  {
    path: '/post-item',
    name: 'post-item',
    component: () => import('../views/PostItemView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/business',
    name: 'business',
    component: () => import('../views/BusinessDashboardView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['business', 'admin'] },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['admin'] },
  },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
  { path: '/signup', name: 'signup', component: () => import('../views/SignupView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// ---------------------------------------------------------------
// Role-based navigation guard (BR C.2).
// Every route can declare, via `meta`:
//   - requiresAuth: true          -> must be logged in at all
//   - allowedRoles: ['business']  -> must be logged in AND have
//                                    one of these roles
// ---------------------------------------------------------------
router.beforeEach((to) => {
  const { isLoggedIn, role } = useAuth()

  if (to.meta.requiresAuth && !isLoggedIn.value) {
    setFlash('Please log in to continue.')
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(role.value)) {
    setFlash("You don't have access to that page with your current account.")
    return { path: '/browse' }
  }

  return true
})

export default router
