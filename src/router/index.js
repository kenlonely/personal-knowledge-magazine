import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ArchiveView from '../views/ArchiveView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/archive',
      name: 'archive',
      component: ArchiveView
    }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router