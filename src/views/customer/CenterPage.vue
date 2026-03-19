<template>
  <div class="customer-center-page flex customer-theme min-h-screen bg-slate-900">
    <CustomerSidebar class="hidden md:block w-64 flex-shrink-0" />

    <main class="flex-1 p-4 md:p-8">
      <button
        type="button"
        class="mb-4 inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        @click="goBack"
      >
        <span class="text-lg leading-none">‹</span>
        <span class="text-sm font-medium">Back</span>
      </button>

      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="relative h-56 md:h-64 bg-slate-700">
          <img v-if="center.bannerPicture" :src="center.bannerPicture" alt="Clinic banner" class="w-full h-full object-cover" />
          <div v-else class="absolute inset-0 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500"></div>
        </div>

        <div class="px-4 md:px-8 pb-8">
          <div class="relative -mt-16 md:-mt-20 z-10 flex flex-col md:flex-row md:items-end gap-4">
            <div class="h-28 w-28 md:h-36 md:w-36 rounded-full border-4 border-slate-800 bg-slate-700 overflow-hidden shadow-xl">
              <img v-if="center.profilePicture" :src="center.profilePicture" alt="Clinic profile" class="w-full h-full object-cover" />
            </div>
            <div class="pt-1 md:pt-0">
              <h1 class="text-2xl md:text-5xl font-bold text-white">{{ center.name || 'Center' }}</h1>
              <p class="text-slate-300 mt-1">{{ center.location || 'Location not set' }}</p>
            </div>
          </div>

          <div class="mt-6 border-t border-slate-700 pt-4">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tab in tabs"
                :key="tab"
                @click="activeTab = tab"
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-gold-700 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                ]"
              >
                {{ tab }}
              </button>
            </div>
          </div>

          <div class="mt-6">
          <div v-if="activeTab === 'About Us'">
            <div class="bg-slate-700/60 rounded-xl p-5 border border-slate-600">
              <h3 class="text-white font-semibold mb-2">Description</h3>
              <p class="text-slate-200 leading-relaxed">
                {{ center.description || 'No description available yet.' }}
              </p>
            </div>

            <div class="mt-4 bg-slate-700/60 rounded-xl p-5 border border-slate-600">
              <h3 class="text-white font-semibold mb-2">Offered Services</h3>
              <div v-if="center.services.length" class="flex flex-wrap gap-2">
                <span
                  v-for="(service, index) in center.services"
                  :key="`center-service-${index}-${service}`"
                  class="inline-flex items-center px-3 py-1 rounded-full border border-[#9a7d5c] bg-[#d8c2a2] text-[#4d3724] text-xs font-medium"
                >
                  {{ service }}
                </span>
              </div>
              <p v-else class="text-slate-400 text-sm">No services listed yet.</p>
            </div>

            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-slate-700/60 rounded-xl p-5 border border-slate-600">
                <h4 class="text-slate-200 font-medium mb-2">Contact</h4>
                <p class="text-slate-300 text-sm">Email: {{ center.businessEmail || center.email || 'Not set' }}</p>
                <p class="text-slate-300 text-sm mt-1">Phone: {{ center.contactNumber || 'Not set' }}</p>
              </div>
              <div class="bg-slate-700/60 rounded-xl p-5 border border-slate-600">
                <h4 class="text-slate-200 font-medium mb-2">Address</h4>
                <p class="text-slate-300 text-sm">{{ center.location || 'Not set' }}</p>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'Products & Services'">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <div class="flex flex-col md:flex-row md:space-x-4 w-full md:w-auto gap-3">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search..."
                  class="px-3 py-2 rounded-lg bg-slate-800 text-[#4d3724] placeholder:text-[#7a5a3d] border border-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <select v-model="selectedCategory" class="px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500">
                  <option value="">All</option>
                  <option value="Product">Products</option>
                  <option value="Service">Services</option>
                </select>
              </div>
              <button @click="goToCart" class="px-4 py-2 rounded-lg bg-gold-700 hover:bg-gold-800 text-white">
                My Cart ({{ cartCount }})
              </button>
            </div>

            <div v-if="loading" class="text-slate-400 py-10">Loading products and services...</div>
            <div v-else-if="filteredItems.length === 0" class="text-slate-400 py-10">No products/services posted yet.</div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="item in filteredItems" :key="item.id" class="bg-slate-700/60 rounded-xl border border-slate-600 overflow-hidden">
                <img :src="item.imageUrl || fallbackImage" alt="Item image" class="w-full h-40 object-cover rounded mb-4" />
                <div class="p-4">
                  <h3 class="text-xl font-semibold text-white">{{ item.title || item.name }}</h3>
                  <p class="text-[#5a3925] mt-2">PHP {{ Number(item.price || 0).toFixed(2) }}</p>
                  <p class="text-slate-300 text-sm mt-1">{{ item.description || 'No description.' }}</p>

                  <div class="mt-4">
                    <template v-if="item.type === 'Product'">
                      <div class="flex items-center space-x-2">
                        <button @click="addToCart(item)" class="px-3 py-2 rounded-lg bg-gold-700 hover:bg-gold-800 text-white">
                          Add to Cart
                        </button>
                        <input type="number" min="1" v-model.number="item.quantity" class="w-16 px-2 py-1 rounded-lg bg-slate-800 text-white border border-slate-500" />
                      </div>
                    </template>
                    <template v-else>
                      <button @click="selectServiceForBooking(item)" class="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                        Book Appointment
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedService" class="mt-8 bg-slate-700/60 rounded-xl p-6 border border-slate-600">
              <h4 class="text-lg font-semibold text-white mb-3">Book: {{ selectedService.title || selectedService.name }}</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input v-model="bookingForm.date" type="date" class="px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-500" />
                <input v-model="bookingForm.time" type="time" class="px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-500" />
              </div>
              <textarea v-model="bookingForm.notes" rows="3" class="mt-4 w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-500" placeholder="Notes (optional)"></textarea>
              <div class="mt-4 flex gap-3">
                <button @click="submitBooking" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Booking</button>
                <button @click="selectedService = null" class="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white">Cancel</button>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'Reviews'">
            <div v-if="reviews.length === 0" class="text-slate-300 italic">No reviews yet.</div>
            <div v-else class="space-y-3">
              <article
                v-for="review in reviews"
                :key="review.id"
                class="bg-slate-700/60 rounded-xl border border-slate-600 p-4"
              >
                <p class="text-white font-medium">{{ review.reviewerName || 'Anonymous' }}</p>
                <p class="text-slate-300 mt-2">"{{ review.comment || 'No comment' }}"</p>
              </article>
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
    <button
      type="button"
      class="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gold-700 text-white shadow-lg hover:bg-gold-800 transition flex items-center justify-center"
      title="Chat with clinic"
      @click="openChat"
    >
      <Icon icon="mdi:chat-processing-outline" class="h-6 w-6" />
      <span
        v-if="unreadChatCount > 0"
        class="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-red-500 text-[11px] leading-5 text-white font-semibold flex items-center justify-center"
      >
        {{ unreadChatCount }}
      </span>
    </button>

    <div v-if="showChatModal" class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-2xl bg-slate-800 border border-slate-700 shadow-xl">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h3 class="text-white font-semibold">Chat with {{ center.name || 'Clinic' }}</h3>
            <p class="text-xs text-slate-400">This chat is for inquiries and appointments.</p>
          </div>
          <button type="button" class="text-slate-300 hover:text-white" @click="closeChat">
            <Icon icon="mdi:close" class="h-5 w-5" />
          </button>
        </div>
        <div class="px-4 pt-4">
          <p class="text-xs text-slate-400 mb-2">Quick questions</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="question in quickQuestions"
              :key="question.key"
              type="button"
              class="px-3 py-1.5 rounded-full text-xs bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
              @click="sendQuickQuestion(question)"
            >
              {{ question.label }}
            </button>
          </div>
        </div>
        <div ref="chatScrollRef" class="px-4 py-4 max-h-[45vh] overflow-y-auto space-y-3">
          <div v-if="chatMessages.length === 0" class="text-sm text-slate-400 text-center">No messages yet. Say hello!</div>
          <div
            v-for="message in chatMessages"
            :key="message.id"
            class="flex"
            :class="message.senderId === currentUserId ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[75%] rounded-2xl px-3 py-2 text-sm"
              :class="message.senderRole === 'system'
                ? 'bg-emerald-700 text-white'
                : message.senderId === currentUserId
                  ? 'bg-gold-700 text-white'
                  : 'bg-slate-700 text-slate-100'"
            >
              <p class="whitespace-pre-wrap">{{ message.text }}</p>
              <p class="mt-1 text-[10px] text-slate-300/80">
                {{ formatChatTime(message.createdAt) }}
              </p>
            </div>
          </div>
        </div>
        <div class="px-4 py-3 border-t border-slate-700">
          <div class="flex items-center gap-2">
            <input
              v-model="chatInput"
              type="text"
              placeholder="Type your message..."
              class="flex-1 px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <button
              type="button"
              class="px-3 py-2 rounded-lg bg-gold-700 text-white hover:bg-gold-800 transition"
              @click="sendChat"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import { toast } from 'vue3-toastify'
import { addCartItem, readCart } from '@/utils/customerCart'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'

const route = useRoute()
const router = useRouter()
const centerId = String(route.params.id || '')

const tabs = ['About Us', 'Products & Services', 'Reviews']
const activeTab = ref('About Us')
const loading = ref(true)
const reviews = ref([])
const items = ref([])
const searchQuery = ref('')
const selectedCategory = ref('')
const cartCount = ref(0)
const showChatModal = ref(false)
const chatInput = ref('')
const chatMessages = ref([])
const currentUserId = ref('')
const chatThreadId = ref('')
const chatScrollRef = ref(null)
const customerProfile = ref(null)
const unreadChatCount = ref(0)
const customerLastReadAt = ref(null)
const quickQuestions = [
  { key: 'services', label: 'What services do you offer?' },
  { key: 'contact', label: 'How can I contact you?' },
  { key: 'location', label: 'Where are you located?' },
  { key: 'price', label: 'What is your price range?' },
  { key: 'booking', label: 'How do I book an appointment?' },
]
let chatUnsubscribe = null
let threadUnsubscribe = null
let unreadUnsubscribe = null
const selectedService = ref(null)
const fallbackImage = 'https://via.placeholder.com/300x200?text=AesthetiCare'

const center = ref({
  id: centerId,
  name: '',
  location: '',
  description: '',
  email: '',
  businessEmail: '',
  contactNumber: '',
  services: [],
  profilePicture: '',
  bannerPicture: '',
})

const bookingForm = ref({
  date: '',
  time: '',
  notes: '',
})

const filteredItems = computed(() => {
  return items.value.filter((item) => {
    const matchesSearch = (item.title || item.name || '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value ? item.type === selectedCategory.value : true
    return matchesSearch && matchesCategory
  })
})

const syncCartCount = () => {
  cartCount.value = readCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push({ name: 'customer-home' })
}

const goToCart = () => router.push({ name: 'customer-cart' })

const addToCart = (item) => {
  addCartItem({
    id: item.id,
    branchId: centerId,
    branchName: center.value.name,
    name: item.title || item.name,
    variation: 'Default',
    price: Number(item.price || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
    imageUrl: item.imageUrl || '',
  })
  syncCartCount()
  toast.success('Added to cart.')
}

const openChat = () => {
  if (!auth.currentUser) {
    toast.error('Please log in to chat.')
    router.push('/login')
    return
  }
  showChatModal.value = true
  startChatListener()
  markCustomerRead()
}

const closeChat = () => {
  showChatModal.value = false
  markCustomerRead()
  stopChatListener()
}

const resolveCustomerProfile = async () => {
  const user = auth.currentUser
  if (!user) return null
  if (customerProfile.value) return customerProfile.value

  const userSnap = await getDoc(doc(db, 'users', user.uid))
  const userData = userSnap.exists() ? userSnap.data() : {}
  const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || user.email || 'Customer'
  const profile = { id: user.uid, name, email: user.email || userData.email || '' }
  customerProfile.value = profile
  return profile
}

const ensureChatThread = async () => {
  const user = auth.currentUser
  if (!user) return null
  const profile = await resolveCustomerProfile()
  const threadId = `${centerId}_${user.uid}`
  chatThreadId.value = threadId

  const threadRef = doc(db, 'chatThreads', threadId)
  const threadSnap = await getDoc(threadRef)
  if (!threadSnap.exists()) {
    await setDoc(threadRef, {
      branchId: centerId,
      customerId: user.uid,
      customerName: profile?.name || 'Customer',
      customerEmail: profile?.email || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: null,
      customerLastReadAt: null,
    })
  }
  return threadRef
}

const scrollChatToBottom = async () => {
  await nextTick()
  if (chatScrollRef.value) {
    chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
  }
}

const startChatListener = async () => {
  if (chatUnsubscribe) chatUnsubscribe()
  const user = auth.currentUser
  if (!user) return
  currentUserId.value = user.uid
  const threadRef = await ensureChatThread()
  if (!threadRef) return

  const messagesRef = collection(db, 'chatThreads', chatThreadId.value, 'messages')
  const q = query(messagesRef)
  chatUnsubscribe = onSnapshot(q, (snapshot) => {
    chatMessages.value = snapshot.docs
      .map((snap) => ({ id: snap.id, ...snap.data() }))
      .sort((a, b) => {
        const aServer = a.createdAt?.seconds || 0
        const bServer = b.createdAt?.seconds || 0
        if (aServer !== bServer) return aServer - bServer
        const aClient = Number(a.clientCreatedAt || 0)
        const bClient = Number(b.clientCreatedAt || 0)
        return aClient - bClient
      })
    scrollChatToBottom()
  })
}

const startUnreadListener = async () => {
  if (unreadUnsubscribe) unreadUnsubscribe()
  const user = auth.currentUser
  if (!user) return
  const threadRef = await ensureChatThread()
  if (!threadRef) return

  if (threadUnsubscribe) threadUnsubscribe()
  threadUnsubscribe = onSnapshot(threadRef, (snap) => {
    const data = snap.exists() ? snap.data() : {}
    customerLastReadAt.value = data.customerLastReadAt || null
  })

  const messagesRef = collection(db, 'chatThreads', chatThreadId.value, 'messages')
  const q = query(messagesRef)
  unreadUnsubscribe = onSnapshot(q, (snapshot) => {
    const lastRead = customerLastReadAt.value
    unreadChatCount.value = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data()
      if (data.senderRole !== 'receptionist') return false
      if (!lastRead?.toDate || !data.createdAt?.toDate) return !showChatModal.value
      return data.createdAt.toDate() > lastRead.toDate()
    }).length
  })
}

const markCustomerRead = async () => {
  const user = auth.currentUser
  if (!user) return
  if (!chatThreadId.value) return
  try {
    await setDoc(
      doc(db, 'chatThreads', chatThreadId.value),
      { customerLastReadAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    )
    unreadChatCount.value = 0
  } catch (error) {
    console.error(error)
  }
}

const stopChatListener = () => {
  if (chatUnsubscribe) {
    chatUnsubscribe()
    chatUnsubscribe = null
  }
}

const sendChat = async () => {
  if (!chatInput.value.trim()) {
    toast.error('Please enter a message.')
    return
  }
  const user = auth.currentUser
  if (!user) {
    toast.error('Please log in first.')
    router.push('/login')
    return
  }

  try {
    const profile = await resolveCustomerProfile()
    const threadRef = await ensureChatThread()
    if (!threadRef) return

    const messageText = chatInput.value.trim()
    chatInput.value = ''

    const messagePayload = {
      text: messageText,
      senderId: user.uid,
      senderName: profile?.name || 'Customer',
      senderEmail: profile?.email || '',
      senderRole: 'customer',
      createdAt: serverTimestamp(),
    }

    await addDoc(collection(db, 'chatThreads', chatThreadId.value, 'messages'), messagePayload)

    await setDoc(
      threadRef,
      {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )

    await addDoc(collection(db, 'messages'), {
      branchId: centerId,
      subject: `New chat message from ${profile?.name || 'Customer'}`,
      senderName: profile?.name || 'Customer',
      senderEmail: profile?.email || '',
      body: messageText,
      isRead: false,
      type: 'chat',
      threadId: chatThreadId.value,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error(error)
    toast.error('Failed to send message.')
  }
}

const formatPriceRange = () => {
  const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
  const productPrices = items.value
    .filter((item) => item.type === 'Product')
    .map((item) => Number(item.price || 0))
    .filter((price) => price > 0)
  const servicePrices = items.value
    .filter((item) => item.type === 'Service')
    .map((item) => Number(item.price || 0))
    .filter((price) => price > 0)

  const formatRange = (prices, label) => {
    if (!prices.length) return `${label}: not listed yet.`
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return min === max
      ? `${label}: around ${formatter.format(min)}.`
      : `${label}: ${formatter.format(min)} to ${formatter.format(max)}.`
  }

  if (!productPrices.length && !servicePrices.length) {
    return 'Pricing is not available yet. Please ask the receptionist for a quote.'
  }

  return `${formatRange(productPrices, 'Products')} ${formatRange(servicePrices, 'Services')}`.trim()
}

const buildQuickAnswer = (key) => {
  switch (key) {
    case 'services':
      if (!center.value.services.length) return 'We do not have a published services list yet.'
      return `We currently offer: ${center.value.services.join(', ')}.`
    case 'contact':
      return `You can reach us at ${center.value.contactNumber || 'our phone'} or ${center.value.businessEmail || center.value.email || 'our email'}.`
    case 'location':
      return center.value.location
        ? `We are located at ${center.value.location}.`
        : 'Our location is not set yet.'
    case 'price':
      return formatPriceRange()
    case 'booking':
      return 'To book, go to Products & Services, select a service, then choose a date and time. You can also chat with the receptionist for help.'
    default:
      return 'Thanks for your question. A receptionist will reply soon.'
  }
}

const sendQuickQuestion = async (question) => {
  const user = auth.currentUser
  if (!user) {
    toast.error('Please log in to chat.')
    router.push('/login')
    return
  }
  try {
    await ensureChatThread()
    const profile = await resolveCustomerProfile()
    const threadId = chatThreadId.value
    const questionText = question?.label || 'Quick question'
    const answerText = buildQuickAnswer(question?.key)

    const baseTime = Date.now()
    await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
      text: questionText,
      senderId: user.uid,
      senderName: profile?.name || 'Customer',
      senderEmail: profile?.email || '',
      senderRole: 'customer',
      createdAt: serverTimestamp(),
      clientCreatedAt: baseTime
    })

    await addDoc(collection(db, 'chatThreads', threadId, 'messages'), {
      text: answerText,
      senderId: 'system',
      senderName: 'AesthetiCare',
      senderRole: 'system',
      createdAt: serverTimestamp(),
      clientCreatedAt: baseTime + 1
    })

    await setDoc(
      doc(db, 'chatThreads', threadId),
      {
        lastMessage: answerText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  } catch (error) {
    console.error(error)
    toast.error('Failed to send quick answer.')
  }
}

const selectServiceForBooking = (item) => {
  selectedService.value = item
}

const submitBooking = async () => {
  const user = auth.currentUser
  if (!user) {
    toast.error('Please log in first.')
    router.push('/login')
    return
  }
  if (!selectedService.value || !bookingForm.value.date || !bookingForm.value.time) {
    toast.error('Please complete date and time.')
    return
  }

  try {
    const profile = await resolveCustomerProfile()
    const customerName = profile?.name || user.email || 'Customer'

    await addDoc(collection(db, 'appointments'), {
      customerId: user.uid,
      customerName,
      service: selectedService.value.title || selectedService.value.name || '',
      date: bookingForm.value.date,
      time: bookingForm.value.time,
      notes: bookingForm.value.notes || '',
      status: 'Scheduled',
      branchId: centerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    toast.success('Appointment booked.')
    selectedService.value = null
    bookingForm.value = { date: '', time: '', notes: '' }
    router.push({ name: 'customer-appointments' })
  } catch (error) {
    console.error(error)
    toast.error('Failed to book appointment.')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const clinicSnap = await getDoc(doc(db, 'clinics', centerId))
    if (clinicSnap.exists()) {
      const data = clinicSnap.data()
      center.value = {
        id: centerId,
        name: data.clinicName || data.clinicBranch || 'Center',
        location: data.clinicLocation || '',
        description: data.description || '',
        email: data.email || '',
        businessEmail: data.businessEmail || '',
        contactNumber: data.contactNumber || '',
        services: Array.isArray(data.services) ? data.services.filter(Boolean) : [],
        profilePicture: data.profilePicture || '',
        bannerPicture: data.bannerPicture || '',
      }
    }

    const [postSnap, reviewSnap] = await Promise.all([
      getDocs(query(collection(db, 'productServicePosts'), where('branchId', '==', centerId))),
      getDocs(query(collection(db, 'reviews'), where('branchId', '==', centerId))),
    ])

    items.value = postSnap.docs.map((snap) => {
      const data = snap.data()
      return {
        id: snap.id,
        type: data.postType || 'Service',
        name: data.productName || data.serviceName || data.title || 'Unnamed',
        title: data.title || '',
        description: data.description || '',
        price: Number(data.price || 0),
        imageUrl: data.imageUrl || '',
        quantity: 1,
      }
    })

    reviews.value = reviewSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
    syncCartCount()
    if (auth.currentUser) {
      currentUserId.value = auth.currentUser.uid
      await startUnreadListener()
    }
  } catch (error) {
    console.error(error)
    toast.error('Failed to load center page.')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  stopChatListener()
  if (threadUnsubscribe) threadUnsubscribe()
  if (unreadUnsubscribe) unreadUnsubscribe()
})

const formatChatTime = (timestamp) => {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.customer-center-page main :deep(.text-white) {
  color: #4d3724 !important;
}

.customer-center-page main :deep(.text-slate-400),
.customer-center-page main :deep(.text-slate-300),
.customer-center-page main :deep(.text-slate-200) {
  color: #6d4d34 !important;
}

.customer-center-page main :deep(button.text-white),
.customer-center-page main :deep(.bg-gold-700.text-white),
.customer-center-page main :deep(.bg-emerald-600.text-white),
.customer-center-page main :deep(.bg-slate-600.text-white) {
  color: #f3e3cf !important;
}
</style>
