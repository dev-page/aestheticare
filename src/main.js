
import { createApp } from 'vue'
//import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import Vue3Toastify from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import VueSweetalert2 from 'vue-sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

createApp(App)
//.use(createPinia())
.use(router)
.use(Vue3Toastify, {
  autoClose: 3000,
})
.use(VueSweetalert2)
.mount('#app')
