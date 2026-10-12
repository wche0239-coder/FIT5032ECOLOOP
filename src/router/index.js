import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { setFlash } from '../composables/useFlash'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: 'Home' } },
  { path: '/browse', name: 'browse', component: () => import('../views/BrowseView.vue'), meta: { title: 'Browse listings' } },
  {
    path: '/post-item',
    name: 'post-item',
    component: () => import('../views/PostItemView.vue'),
    meta: { requiresAuth: true, title: 'Post an item' },
  },
  {
    path: '/business',
    name: 'business',
    component: () => import('../views/BusinessDashboardView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['business', 'admin'], title: 'Business dashboard' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['admin'], title: 'Admin' },
  },
  {
    path: '/reports',
    name: 'reports',
    component: () => import('../views/ReportsView.vue'),
    meta: { requiresAuth: true, title: 'Data & reports' },
  },
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: 'Log in' } },
  { path: '/signup', name: 'signup', component: () => import('../views/SignupView.vue'), meta: { title: 'Sign up' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Page not found' } },
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
router.beforeEach(async (to) => {
  const { isLoggedIn, role, waitForAuth } = useAuth()
  // Firebase restores the session asynchronously on page load (BR D.1),
  // so wait for it before deciding whether the visitor is logged in.
  await waitForAuth()

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

// BR (E.3) WCAG 2.4.2 Page Titled — every route gets a unique, descriptive title.
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · EcoLoop` : 'EcoLoop'
})

export default router
