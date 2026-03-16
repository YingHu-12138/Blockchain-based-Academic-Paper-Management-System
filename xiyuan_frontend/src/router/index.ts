import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomePart.vue')
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('@/views/UploadPart.vue')
  },
  {
    path: '/verify',
    name: 'Verify',
    component: () => import('@/views/VerifyPart.vue')
  },
  {
    path: '/check',
    name: 'CheckDuplicate',
    component: () => import('@/views/CheckDuplicatePart.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfilePart.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminPart.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router