<template>
  <div class="flex customer-theme bg-slate-900 min-h-screen">
    <CustomerSidebar />

    <main class="flex-1 p-8">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-white mb-2">My Orders</h1>
        <p class="text-slate-400">Track your orders placed through the platform.</p>
      </div>

      <div class="bg-[#2a180f] rounded-xl p-6 border border-[#4b2f1c]">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <input
            v-model="search"
            type="text"
            placeholder="Search order id or payment method..."
            class="w-full md:max-w-sm bg-slate-900 text-[#f3e3cf] placeholder:text-[#c7a98c] px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <div class="text-sm text-slate-400">Total Orders: {{ filteredOrders.length }}</div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-left">
            <thead class="text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4">Order ID</th>
                <th class="py-3 px-4">Items</th>
                <th class="py-3 px-4">Total</th>
                <th class="py-3 px-4">Payment</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Created At</th>
                <th class="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody class="text-slate-200">
              <tr v-if="!loading && filteredOrders.length === 0">
                <td colspan="7" class="py-8 text-center text-slate-400">No orders found.</td>
              </tr>
              <tr v-for="order in filteredOrders" :key="order.id" class="border-t border-slate-700">
                <td class="py-3 px-4 text-slate-300">{{ order.id }}</td>
                <td class="py-3 px-4">{{ order.items.length }}</td>
                <td class="py-3 px-4 text-amber-300">PHP {{ Number(order.total || 0).toFixed(2) }}</td>
                <td class="py-3 px-4">{{ order.paymentMethod || 'Cash' }}</td>
                <td class="py-3 px-4">
                  <span
                    class="px-2 py-1 rounded-full text-xs font-semibold"
                    :class="order.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : order.status === 'Cancelled'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'"
                  >
                    {{ order.status || 'Pending' }}
                  </span>
                </td>
                <td class="py-3 px-4">{{ formatDate(order.createdAt) }}</td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="px-3 py-1 rounded-lg bg-gold-700 hover:bg-gold-800 text-white text-xs"
                      @click="openOrder(order)"
                    >
                      View
                    </button>
                    <button
                      v-if="canCancelOrder(order)"
                      type="button"
                      class="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs"
                      @click="openCancelModal(order)"
                    >
                      Cancel
                    </button>
                    <button
                      v-if="canMarkReceived(order)"
                      type="button"
                      class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                      @click="openReceiveModal(order)"
                    >
                      Order Received
                    </button>
                    <button
                      v-if="canRequestRefund(order)"
                      type="button"
                      class="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs"
                      @click="openRefundModal(order)"
                    >
                      Request Refund
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <Modal :isOpen="showModal" @close="closeModal" :showConfirm="false" panelClass="bg-slate-900 border border-slate-700">
      <div v-if="selectedOrder" class="text-slate-200">
        <h2 class="text-xl font-semibold text-white mb-2">Order Details</h2>
        <p class="text-sm text-slate-400 mb-4">Order ID: {{ selectedOrder.id }}</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p class="text-xs uppercase text-slate-400">Delivery</p>
            <p class="text-white font-semibold mt-1">{{ selectedOrder.delivery?.fullName || selectedOrder.customerName || 'Customer' }}</p>
            <p class="text-xs text-slate-400">Phone: {{ selectedOrder.delivery?.phone || 'N/A' }}</p>
            <p class="text-xs text-slate-400">Address: {{ selectedOrder.delivery?.address || 'N/A' }}</p>
          </div>
          <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p class="text-xs uppercase text-slate-400">Payment</p>
            <p class="text-white font-semibold mt-1">{{ selectedOrder.paymentMethod || 'Cash' }}</p>
            <p class="text-xs text-slate-400 mt-2">Total: PHP {{ Number(selectedOrder.total || 0).toFixed(2) }}</p>
            <p class="text-xs text-slate-400">Status: {{ selectedOrder.status || 'Pending' }}</p>
            <p v-if="selectedOrder.cancelledAt" class="text-xs text-slate-400">Cancelled: {{ formatDate(selectedOrder.cancelledAt) }}</p>
            <p v-if="selectedOrder.receivedAt" class="text-xs text-slate-400">Received: {{ formatDate(selectedOrder.receivedAt) }}</p>
            <p class="text-xs text-slate-400">Created: {{ formatDate(selectedOrder.createdAt) }}</p>
          </div>
        </div>

        <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p class="text-xs uppercase text-slate-400 mb-3">Items</p>
          <div v-for="item in selectedOrder.items" :key="item.id" class="flex items-start justify-between py-2 border-b border-slate-700 last:border-b-0">
            <div>
              <p class="text-white font-medium">{{ item.name }}</p>
              <p class="text-xs text-slate-400">Qty: {{ item.quantity }} • Branch: {{ item.branchName || 'N/A' }}</p>
            </div>
            <div class="text-amber-300">PHP {{ Number(item.price || 0).toFixed(2) }}</div>
          </div>
        </div>

        <div v-if="selectedOrder.deliveryReview || selectedOrder.deliveryProofUrl" class="bg-slate-800 rounded-lg p-4 border border-slate-700 mt-4">
          <p class="text-xs uppercase text-slate-400 mb-3">Proof of Receipt</p>
          <div v-if="selectedOrder.deliveryRating" class="mb-3 flex items-center gap-1">
            <span
              v-for="star in 5"
              :key="`display-star-${star}`"
              class="text-lg"
              :class="star <= Number(selectedOrder.deliveryRating || 0) ? 'text-amber-300' : 'text-slate-600'"
            >
              ★
            </span>
          </div>
          <p v-if="selectedOrder.deliveryReview" class="text-sm text-slate-200 whitespace-pre-wrap">{{ selectedOrder.deliveryReview }}</p>
          <a
            v-if="selectedOrder.deliveryProofUrl"
            :href="selectedOrder.deliveryProofUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex mt-3 px-3 py-2 rounded-lg bg-gold-700 hover:bg-gold-800 text-white text-xs"
          >
            View Proof Photo
          </a>
        </div>

        <div v-if="selectedOrder.refundRequestId || selectedOrder.refundVoucherId" class="bg-slate-800 rounded-lg p-4 border border-slate-700 mt-4">
          <p class="text-xs uppercase text-slate-400 mb-3">Refund Status</p>
          <p class="text-sm text-slate-200">
            {{ selectedOrder.refundRequestStatus || (selectedOrder.refundVoucherId ? 'Approved' : 'Not requested') }}
          </p>
          <p v-if="selectedOrder.refundReason" class="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{{ selectedOrder.refundReason }}</p>
          <a
            v-if="selectedOrder.refundProofUrl"
            :href="selectedOrder.refundProofUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex mt-3 px-3 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs"
          >
            View Refund Proof
          </a>
        </div>

        <div v-if="selectedOrder.cancelReasonType || selectedOrder.cancelReasonDetails" class="bg-slate-800 rounded-lg p-4 border border-slate-700 mt-4">
          <p class="text-xs uppercase text-slate-400 mb-3">Cancellation</p>
          <p class="text-sm text-slate-200">{{ selectedOrder.cancelReasonType || 'No reason recorded' }}</p>
          <p v-if="selectedOrder.cancelReasonDetails" class="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{{ selectedOrder.cancelReasonDetails }}</p>
          <p v-if="selectedOrder.paymentStatus === 'Refunded'" class="mt-3 text-xs text-emerald-300">
            Refund initiated. Depending on your payment method, the amount may reflect within 24 hours or a few business days.
          </p>
        </div>
      </div>
    </Modal>

    <Modal :isOpen="showReceiveModal" @close="closeReceiveModal" :showConfirm="false" panelClass="bg-slate-900 border border-slate-700">
      <div class="text-slate-200">
        <h2 class="text-xl font-semibold text-white mb-2">Confirm Order Received</h2>
        <p class="text-sm text-slate-400 mb-4">
          Upload a proof photo and leave a short review to confirm that you already received this order.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">Proof of Delivery Photo</label>
            <input
              type="file"
              accept="image/*"
              class="block w-full text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-gold-700 file:px-3 file:py-2 file:text-white hover:file:bg-gold-800"
              @change="handleProofFileChange"
            />
            <p v-if="receiveForm.fileName" class="mt-2 text-xs text-slate-400">Selected: {{ receiveForm.fileName }}</p>
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Delivery Rating</label>
            <div class="flex items-center gap-2">
              <button
                v-for="star in 5"
                :key="`input-star-${star}`"
                type="button"
                class="text-3xl leading-none transition"
                :class="star <= receiveForm.rating ? 'text-amber-300' : 'text-slate-500 hover:text-amber-200'"
                @click="receiveForm.rating = star"
              >
                ★
              </button>
            </div>
            <p class="mt-2 text-xs text-slate-400">Choose a rating from 1 to 5 stars.</p>
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Delivery Review</label>
            <textarea
              v-model="receiveForm.review"
              rows="4"
              class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Describe the condition of the order and confirm that you received it."
            />
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              :disabled="isSubmittingReceive"
              class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white"
              @click="confirmOrderReceived"
            >
              {{ isSubmittingReceive ? 'Submitting...' : 'Submit and Complete Order' }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
              @click="closeReceiveModal"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <Modal :isOpen="showRefundModal" @close="closeRefundModal" :showConfirm="false" panelClass="bg-slate-900 border border-slate-700">
      <div class="text-slate-200">
        <h2 class="text-xl font-semibold text-white mb-2">Request Refund</h2>
        <p class="text-sm text-slate-400 mb-4">
          Submit your refund concern with supporting proof. The clinic owner/admin will review it and issue a voucher if approved.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">Reason</label>
            <select
              v-model="refundRequestForm.issueType"
              class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select a refund reason</option>
              <option value="Damaged Item">Damaged Item</option>
              <option value="Wrong Item">Wrong Item</option>
              <option value="Missing Item">Missing Item</option>
              <option value="Quality Concern">Quality Concern</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Details</label>
            <textarea
              v-model="refundRequestForm.reason"
              rows="4"
              class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe what went wrong with the order."
            />
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-2">Proof Photo</label>
            <input
              type="file"
              accept="image/*"
              class="block w-full text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-purple-700 file:px-3 file:py-2 file:text-white hover:file:bg-purple-800"
              @change="handleRefundProofFileChange"
            />
            <p v-if="refundRequestForm.fileName" class="mt-2 text-xs text-slate-400">Selected: {{ refundRequestForm.fileName }}</p>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              :disabled="isSubmittingRefundRequest"
              class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white"
              @click="submitRefundRequest"
            >
              {{ isSubmittingRefundRequest ? 'Submitting...' : 'Submit Refund Request' }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
              @click="closeRefundModal"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <Modal :isOpen="showCancelModal" @close="closeCancelModal" :showConfirm="false" panelClass="bg-slate-900 border border-slate-700">
      <div class="text-slate-200">
        <h2 class="text-xl font-semibold text-white mb-2">Cancel Order</h2>
        <p class="text-sm text-slate-400 mb-4">
          Choose a cancellation reason. If this order was already paid online, your refund will be processed after cancellation.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">Reason</label>
            <select
              v-model="cancelForm.reasonType"
              class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a reason</option>
              <option value="Changed my mind">Changed my mind</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Wrong delivery details">Wrong delivery details</option>
              <option value="Found a better option">Found a better option</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div v-if="cancelForm.reasonType === 'Other'">
            <label class="block text-sm text-slate-400 mb-2">Please specify</label>
            <textarea
              v-model="cancelForm.reasonDetails"
              rows="4"
              class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Tell us why you are cancelling this order."
            />
          </div>

          <div class="rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-3 text-xs text-slate-300">
            Refund notice: if your payment was already processed online, the refund is initiated after cancellation and may reflect within 24 hours or a few business days depending on your payment method.
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              :disabled="isSubmittingCancel"
              class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white"
              @click="confirmCancelOrder"
            >
              {{ isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation' }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
              @click="closeCancelModal"
            >
              Keep Order
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { addDoc, getFirestore, collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import Modal from '@/components/common/Modal.vue'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'
import { storage } from '@/config/firebaseConfig'
import { resolveApiBaseUrl } from '@/utils/apiBaseUrl'

export default {
  name: 'CustomerOrders',
  components: { CustomerSidebar, Modal },
  setup() {
    const db = getFirestore(getApp())
    const auth = getAuth(getApp())
    const OTP_API_BASE = resolveApiBaseUrl(import.meta.env.VITE_OTP_API_BASE_URL, {
      devFallbackUrl: 'http://localhost:3000',
    })

    const loading = ref(true)
    const search = ref('')
    const orders = ref([])
    const showModal = ref(false)
    const selectedOrder = ref(null)
    const showReceiveModal = ref(false)
    const selectedReceiveOrder = ref(null)
    const isSubmittingReceive = ref(false)
    const showRefundModal = ref(false)
    const selectedRefundOrder = ref(null)
    const isSubmittingRefundRequest = ref(false)
    const showCancelModal = ref(false)
    const selectedCancelOrder = ref(null)
    const isSubmittingCancel = ref(false)
    const receiveForm = ref({
      file: null,
      fileName: '',
      rating: 0,
      review: '',
    })
    const refundRequestForm = ref({
      issueType: '',
      reason: '',
      file: null,
      fileName: '',
    })
    const cancelForm = ref({
      reasonType: '',
      reasonDetails: '',
    })

    const formatDate = (value) => {
      if (!value) return 'N/A'
      if (value.toDate) return value.toDate().toLocaleString()
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString()
      return String(value)
    }

    const fetchFromBackend = async (path, options = {}) => {
      const baseUrl = String(OTP_API_BASE || '').trim()
      if (!baseUrl) {
        throw new Error('OTP backend is not configured.')
      }
      const response = await fetch(`${baseUrl}${path}`, options)
      if (response.status === 404) {
        throw new Error(`Endpoint not found on ${baseUrl}`)
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Non-JSON response from ${baseUrl}`)
      }
      return response
    }

    const buildAuthHeaders = async (headers = {}) => {
      const user = auth.currentUser
      if (!user) {
        throw new Error('You must be logged in to continue.')
      }
      const token = await user.getIdToken()
      return {
        ...headers,
        Authorization: `Bearer ${token}`,
      }
    }

    const createCustomerNotification = async ({ title, message, link = '/customer/orders' }) => {
      const user = auth.currentUser
      if (!user) return
      await addDoc(collection(db, 'notifications'), {
        recipientUserId: user.uid,
        title: String(title || 'Notification').trim(),
        message: String(message || '').trim(),
        link,
        read: false,
        deleted: false,
        createdAt: serverTimestamp(),
      })
    }

    const getCreatedAtMillis = (order) => {
      if (order?.createdAt?.toDate) return order.createdAt.toDate().getTime()
      const parsed = new Date(order?.createdAt || 0)
      return parsed.getTime()
    }

    const canCancelOrder = (order) => {
      const status = String(order?.status || 'Pending')
      if (status === 'Cancelled' || status === 'Completed') return false
      const createdAtMillis = getCreatedAtMillis(order)
      if (!createdAtMillis) return false
      const diffHours = (Date.now() - createdAtMillis) / (1000 * 60 * 60)
      return diffHours <= 24
    }

    const canMarkReceived = (order) => {
      const status = String(order?.status || '').trim().toLowerCase()
      return status !== 'completed' && status !== 'cancelled' && status !== 'refunded'
    }

    const canRequestRefund = (order) => {
      const status = String(order?.status || '').trim().toLowerCase()
      const refundRequestStatus = String(order?.refundRequestStatus || '').trim().toLowerCase()
      if (status !== 'completed') return false
      if (order?.refundVoucherId) return false
      if (order?.refundRequestId && refundRequestStatus !== 'rejected') return false
      return refundRequestStatus !== 'approved' && refundRequestStatus !== 'pending'
    }

    const handleProofFileChange = (event) => {
      const file = event?.target?.files?.[0] || null
      receiveForm.value.file = file
      receiveForm.value.fileName = file?.name || ''
    }

    const handleRefundProofFileChange = (event) => {
      const file = event?.target?.files?.[0] || null
      refundRequestForm.value.file = file
      refundRequestForm.value.fileName = file?.name || ''
    }

    const resetReceiveForm = () => {
      receiveForm.value = {
        file: null,
        fileName: '',
        rating: 0,
        review: '',
      }
    }

    const resetRefundRequestForm = () => {
      refundRequestForm.value = {
        issueType: '',
        reason: '',
        file: null,
        fileName: '',
      }
    }

    const resetCancelForm = () => {
      cancelForm.value = {
        reasonType: '',
        reasonDetails: '',
      }
    }

    const openReceiveModal = (order) => {
      selectedReceiveOrder.value = order
      resetReceiveForm()
      showReceiveModal.value = true
    }

    const closeReceiveModal = () => {
      showReceiveModal.value = false
      selectedReceiveOrder.value = null
      resetReceiveForm()
    }

    const openRefundModal = (order) => {
      selectedRefundOrder.value = order
      resetRefundRequestForm()
      showRefundModal.value = true
    }

    const closeRefundModal = () => {
      showRefundModal.value = false
      selectedRefundOrder.value = null
      resetRefundRequestForm()
    }

    const openCancelModal = (order) => {
      selectedCancelOrder.value = order
      resetCancelForm()
      showCancelModal.value = true
    }

    const closeCancelModal = () => {
      showCancelModal.value = false
      selectedCancelOrder.value = null
      resetCancelForm()
    }

    const confirmOrderReceived = async () => {
      if (!selectedReceiveOrder.value?.id) {
        toast.error('No order selected.')
        return
      }
      if (!receiveForm.value.file) {
        toast.error('Please upload a proof photo.')
        return
      }
      if (!String(receiveForm.value.review || '').trim()) {
        toast.error('Please leave a short delivery review.')
        return
      }
      if (Number(receiveForm.value.rating || 0) < 1) {
        toast.error('Please choose a delivery rating.')
        return
      }

      isSubmittingReceive.value = true
      try {
        const extension = String(receiveForm.value.file.name || '').split('.').pop() || 'jpg'
        const filePath = `order-receipts/${selectedReceiveOrder.value.id}/${Date.now()}.${extension}`
        const fileRef = storageRef(storage, filePath)
        await uploadBytes(fileRef, receiveForm.value.file)
        const proofUrl = await getDownloadURL(fileRef)

        await updateDoc(doc(db, 'customerOrders', selectedReceiveOrder.value.id), {
          status: 'Completed',
          receivedAt: serverTimestamp(),
          deliveryProofUrl: proofUrl,
          deliveryProofPath: filePath,
          deliveryRating: Number(receiveForm.value.rating || 0),
          deliveryReview: String(receiveForm.value.review || '').trim(),
          updatedAt: serverTimestamp(),
        })

        selectedReceiveOrder.value.status = 'Completed'
        selectedReceiveOrder.value.receivedAt = new Date()
        selectedReceiveOrder.value.deliveryProofUrl = proofUrl
        selectedReceiveOrder.value.deliveryProofPath = filePath
        selectedReceiveOrder.value.deliveryRating = Number(receiveForm.value.rating || 0)
        selectedReceiveOrder.value.deliveryReview = String(receiveForm.value.review || '').trim()

        if (selectedOrder.value?.id === selectedReceiveOrder.value.id) {
          selectedOrder.value = { ...selectedReceiveOrder.value }
        }

        await createCustomerNotification({
          title: 'Order Completed',
          message: `You confirmed receipt for order ${selectedReceiveOrder.value.id}. Thank you for your review.`,
        })

        toast.success('Order marked as received.')
        closeReceiveModal()
      } catch (error) {
        console.error(error)
        toast.error('Failed to confirm order received.')
      } finally {
        isSubmittingReceive.value = false
      }
    }

    const submitRefundRequest = async () => {
      if (!selectedRefundOrder.value?.id) {
        toast.error('No order selected.')
        return
      }
      if (!String(refundRequestForm.value.issueType || '').trim()) {
        toast.error('Please choose a refund reason.')
        return
      }
      if (!String(refundRequestForm.value.reason || '').trim()) {
        toast.error('Please describe your refund concern.')
        return
      }
      if (!refundRequestForm.value.file) {
        toast.error('Please upload a proof photo.')
        return
      }

      isSubmittingRefundRequest.value = true
      try {
        const extension = String(refundRequestForm.value.file.name || '').split('.').pop() || 'jpg'
        const filePath = `refund-requests/${selectedRefundOrder.value.id}/${Date.now()}.${extension}`
        const fileRef = storageRef(storage, filePath)
        await uploadBytes(fileRef, refundRequestForm.value.file)
        const proofUrl = await getDownloadURL(fileRef)

        const requestPayload = {
          orderId: selectedRefundOrder.value.id,
          customerId: selectedRefundOrder.value.customerId || auth.currentUser?.uid || '',
          customerName: selectedRefundOrder.value.customerName || selectedRefundOrder.value.delivery?.fullName || 'Customer',
          branchId: selectedRefundOrder.value.branchId || '',
          branchName: selectedRefundOrder.value.branchName || '',
          amount: Number(selectedRefundOrder.value.total || 0),
          issueType: String(refundRequestForm.value.issueType || '').trim(),
          reason: String(refundRequestForm.value.reason || '').trim(),
          proofUrl,
          proofPath: filePath,
          status: 'Pending',
          orderStatusAtRequest: selectedRefundOrder.value.status || 'Completed',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        const requestRef = await addDoc(collection(db, 'refundRequests'), requestPayload)

        await updateDoc(doc(db, 'customerOrders', selectedRefundOrder.value.id), {
          status: 'Refund Requested',
          refundRequestId: requestRef.id,
          refundRequestStatus: 'Pending',
          refundIssueType: requestPayload.issueType,
          refundReason: requestPayload.reason,
          refundProofUrl: proofUrl,
          refundProofPath: filePath,
          refundRequestedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        const targetOrder = orders.value.find((entry) => entry.id === selectedRefundOrder.value.id)
        if (targetOrder) {
          targetOrder.status = 'Refund Requested'
          targetOrder.refundRequestId = requestRef.id
          targetOrder.refundRequestStatus = 'Pending'
          targetOrder.refundIssueType = requestPayload.issueType
          targetOrder.refundReason = requestPayload.reason
          targetOrder.refundProofUrl = proofUrl
          targetOrder.refundProofPath = filePath
        }

        if (selectedOrder.value?.id === selectedRefundOrder.value.id && targetOrder) {
          selectedOrder.value = { ...targetOrder }
        }

        await createCustomerNotification({
          title: 'Refund Request Submitted',
          message: `Your refund request for order ${selectedRefundOrder.value.id} has been submitted and is now pending review.`,
        })

        toast.success('Refund request submitted.')
        closeRefundModal()
      } catch (error) {
        console.error(error)
        toast.error('Failed to submit refund request.')
      } finally {
        isSubmittingRefundRequest.value = false
      }
    }

    const confirmCancelOrder = async () => {
      const order = selectedCancelOrder.value
      if (!order?.id) return
      if (!canCancelOrder(order)) {
        toast.error('Orders can only be cancelled within 24 hours.')
        return
      }

      const reasonType = String(cancelForm.value.reasonType || '').trim()
      const reasonDetails = String(cancelForm.value.reasonDetails || '').trim()

      if (!reasonType) {
        toast.error('Please choose a cancellation reason.')
        return
      }
      if (reasonType === 'Other' && !reasonDetails) {
        toast.error('Please specify your cancellation reason.')
        return
      }

      isSubmittingCancel.value = true
      try {
        const isPayMongoPaid =
          String(order.source || '').trim().toLowerCase() === 'paymongo_checkout' &&
          String(order.paymentStatus || '').trim().toLowerCase() === 'paid' &&
          Boolean(String(order.paymongoPaymentId || '').trim())

        if (isPayMongoPaid) {
          const response = await fetchFromBackend(`/customer/orders/${order.id}/cancel`, {
            method: 'POST',
            headers: await buildAuthHeaders({ 'content-type': 'application/json' }),
            body: JSON.stringify({
              reasonType,
              reasonDetails,
            }),
          })
          const raw = await response.text()
          let payload = null
          try {
            payload = JSON.parse(raw)
          } catch (_error) {
            throw new Error(`Backend returned non-JSON response (${response.status}). Check backend URL/port and ensure /customer/orders/${order.id}/cancel exists.`)
          }
          if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || 'Failed to cancel and refund order.')
          }

          order.status = 'Cancelled'
          order.paymentStatus = payload?.data?.paymentStatus || 'Refunded'
          order.refundType = payload?.data?.refundType || 'PayMongo'
          order.refundAmount = Number(payload?.data?.refundAmount || order.total || 0)
          order.paymongoRefundId = payload?.data?.paymongoRefundId || null
          order.paymongoRefundStatus = payload?.data?.paymongoRefundStatus || null
          order.cancelReasonType = reasonType
          order.cancelReasonDetails = reasonType === 'Other' ? reasonDetails : ''
          order.cancelledAt = new Date()
          order.refundedAt = new Date()
        } else {
          await updateDoc(doc(db, 'customerOrders', order.id), {
            status: 'Cancelled',
            cancelReasonType: reasonType,
            cancelReasonDetails: reasonType === 'Other' ? reasonDetails : '',
            cancelledAt: serverTimestamp(),
          })
          order.status = 'Cancelled'
          order.cancelReasonType = reasonType
          order.cancelReasonDetails = reasonType === 'Other' ? reasonDetails : ''
          order.cancelledAt = new Date()
        }

        if (selectedOrder.value?.id === order.id) {
          selectedOrder.value = { ...order }
        }

        await createCustomerNotification({
          title: 'Order Cancelled',
          message: isPayMongoPaid
            ? `Your order ${order.id} was cancelled. Your refund has been initiated and may reflect within 24 hours or a few business days depending on your payment method.`
            : `Your order ${order.id} was cancelled successfully.`,
        })

        closeCancelModal()
        toast.success(
          isPayMongoPaid
            ? 'Order cancelled. Your refund has been initiated and may reflect within 24 hours or a few business days depending on your payment method.'
            : 'Order cancelled successfully.'
        )
      } catch (error) {
        console.error(error)
        toast.error(error?.message || 'Failed to cancel order.')
      } finally {
        isSubmittingCancel.value = false
      }
    }

    const loadOrders = async (userId) => {
      if (!userId) return
      loading.value = true
      try {
        const snapshot = await getDocs(query(collection(db, 'customerOrders'), where('customerId', '==', userId)))
        orders.value = snapshot.docs
          .map((snap) => ({ id: snap.id, ...snap.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
            return bTime - aTime
          })
      } catch (error) {
        console.error('Failed to load orders:', error)
      } finally {
        loading.value = false
      }
    }

    const filteredOrders = computed(() => {
      const keyword = String(search.value || '').trim().toLowerCase()
      if (!keyword) return orders.value
      return orders.value.filter((order) => {
        const text = [order.id, order.paymentMethod]
          .map((entry) => String(entry || '').toLowerCase())
          .join(' ')
        return text.includes(keyword)
      })
    })

    const openOrder = (order) => {
      selectedOrder.value = order
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      selectedOrder.value = null
    }

    onMounted(() => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) return
        await loadOrders(user.uid)
      })
    })

    return {
      loading,
      search,
      filteredOrders,
      formatDate,
      openOrder,
      closeModal,
      showModal,
      selectedOrder,
      showReceiveModal,
      isSubmittingReceive,
      receiveForm,
      showRefundModal,
      isSubmittingRefundRequest,
      refundRequestForm,
      showCancelModal,
      isSubmittingCancel,
      cancelForm,
      canCancelOrder,
      canMarkReceived,
      canRequestRefund,
      openCancelModal,
      closeCancelModal,
      confirmCancelOrder,
      openReceiveModal,
      closeReceiveModal,
      handleProofFileChange,
      confirmOrderReceived,
      openRefundModal,
      closeRefundModal,
      handleRefundProofFileChange,
      submitRefundRequest,
    }
  }
}
</script>
