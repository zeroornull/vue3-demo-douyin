import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import router from './router'
import { pinia } from './stores'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')
