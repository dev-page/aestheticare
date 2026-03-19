<template>
  <div class="module-theme min-h-screen bg-slate-900 p-4 md:p-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          @click="goBack"
        >
          <span class="text-lg leading-none">‹</span>
          <span class="text-sm font-medium">Back</span>
        </button>
        <h1 class="text-2xl md:text-3xl font-bold text-white">Attendance Record</h1>
        <p class="text-slate-400">Secure clock in/out with PIN confirmation and webcam proof.</p>
        </div>

        <div class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 md:min-w-[230px] text-right">
          <p class="text-slate-400 text-xs uppercase tracking-wide">Current Time</p>
          <p class="text-white text-2xl font-semibold leading-tight">{{ liveTime }}</p>
          <p class="text-slate-300 text-sm">{{ liveDate }}</p>
        </div>
      </header>

      <section class="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3">
        <p class="text-slate-400 text-xs uppercase tracking-wide">Attendance Day</p>
        <p class="text-white text-lg font-semibold">{{ todayLabel }}</p>
      </section>

      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article class="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 class="text-lg font-semibold text-white">Employee</h2>

          <div class="space-y-2 text-sm">
            <p class="text-slate-300"><span class="text-slate-400">Name:</span> {{ displayedEmployeeName }}</p>
            <p class="text-slate-300"><span class="text-slate-400">Role:</span> {{ displayedEmployeeRole }}</p>
            <p class="text-slate-300"><span class="text-slate-400">Date:</span> {{ todayLabel }}</p>
          </div>

          <div class="pt-2 border-t border-slate-700 space-y-2 text-sm">
            <p class="text-slate-300"><span class="text-slate-400">Time In:</span> {{ attendanceRecord.timeIn || '-' }}</p>
            <p class="text-slate-300"><span class="text-slate-400">Time Out:</span> {{ attendanceRecord.timeOut || '-' }}</p>
          </div>
        </article>

        <article class="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <h2 class="text-lg font-semibold text-white">PIN Verification</h2>

          <label class="block text-sm text-slate-300">
            Enter PIN
            <input
              v-model="pinInput"
              type="password"
              maxlength="8"
              class="mt-2 w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              :disabled="isLocked || !hasShiftAssignment"
            />
          </label>

          <button
            class="rounded-lg px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!pinInput || isLocked || isPinVerified || !hasShiftAssignment"
            @click="verifyPin"
          >
            {{ isPinVerified ? 'PIN Verified' : 'Verify PIN' }}
          </button>

          <p v-if="isLocked" class="text-red-400 text-sm">
            Too many failed attempts. Try again in {{ lockoutMinutesRemaining }} minute(s).
          </p>
          <p v-else class="text-slate-400 text-sm">
            Failed attempts: {{ failedAttempts }} / {{ maxPinAttempts }}
          </p>

          <p v-if="!isWithinShiftWindow" class="text-amber-400 text-sm">
            Current time is outside your allowed attendance window.
          </p>

          <div class="pt-3 border-t border-slate-700 space-y-2">
            <h3 class="text-sm font-semibold text-white">Face Verification</h3>
            <p v-if="!hasFaceRegistration" class="text-red-400 text-sm">
              No registered face found for this account.
            </p>
            <p v-else-if="isFaceVerified" class="text-emerald-400 text-sm">
              Face verified. You may proceed to clock in/out.
            </p>
            <p v-else-if="faceVerifyMessage" class="text-slate-300 text-sm">
              {{ faceVerifyMessage }}
            </p>
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!cameraReady || !hasFaceRegistration || isFaceVerifying || isLocked || !hasShiftAssignment"
              @click="verifyFace"
            >
              {{ isFaceVerifying ? 'Verifying Face...' : (isFaceVerified ? 'Face Verified' : 'Verify Face') }}
            </button>
          </div>
        </article>
      </section>

      <section class="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h2 class="text-lg font-semibold text-white">Webcam Proof</h2>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden min-h-[240px] flex items-center justify-center relative">
            <video
              ref="videoRef"
              class="w-full h-full object-cover"
              autoplay
              playsinline
              muted
            ></video>
            <p v-if="!cameraReady" class="absolute inset-0 text-slate-400 text-sm p-4 text-center flex items-center justify-center bg-slate-900/80">
              Camera is not available yet. Allow camera permission to continue.
            </p>
          </div>

          <div class="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden min-h-[240px] flex items-center justify-center">
            <img v-if="capturedPreview" :src="capturedPreview" alt="Captured attendance" class="w-full h-full object-cover" />
            <p v-else class="text-slate-400 text-sm p-4 text-center">Captured proof appears here after Clock In/Clock Out.</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            class="rounded-lg px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canClockIn || isSubmitting"
            @click="submitAttendance('clock_in')"
          >
            Clock In
          </button>

          <button
            class="rounded-lg px-4 py-2 text-sm font-semibold bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canClockOut || isSubmitting"
            @click="submitAttendance('clock_out')"
          >
            Clock Out
          </button>
        </div>
      </section>
    </div>

    <canvas ref="canvasRef" class="hidden"></canvas>
  </div>
</template>

<script>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '@/config/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { toast } from 'vue3-toastify'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { extractSingleFaceDescriptor, findBestFaceMatch } from '@/utils/faceRecognition'

export default {
  name: 'AttendanceRecord',
  setup() {
    const router = useRouter()
    const maxPinAttempts = 5
    const lockoutMinutes = 10

    const currentUserId = ref('')
    const currentBranchId = ref('')
    const employeeName = ref('Loading...')
    const employeeRole = ref('-')
    const storedPin = ref('')
    const hasShiftAssignment = ref(false)

    const attendanceRecord = ref({})
    const pinInput = ref('')
    const failedAttempts = ref(0)
    const lockedUntilTs = ref(0)
    const isPinVerified = ref(false)
    const isFaceVerified = ref(false)
    const isFaceVerifying = ref(false)
    const faceVerifyMessage = ref('')
    const hasFaceRegistration = ref(false)
    const registeredFaceDescriptors = ref([])

    const videoRef = ref(null)
    const canvasRef = ref(null)
    const cameraStream = ref(null)
    const cameraReady = ref(false)
    const capturedPreview = ref('')
    const isSubmitting = ref(false)
    const nowRef = ref(new Date())

    const todayKey = computed(() => {
      const now = new Date()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      return `${now.getFullYear()}-${mm}-${dd}`
    })

    const todayLabel = computed(() =>
      new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    )
    const liveTime = computed(() =>
      nowRef.value.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    )
    const liveDate = computed(() =>
      nowRef.value.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    )

    const isLocked = computed(() => Date.now() < lockedUntilTs.value)

    const lockoutMinutesRemaining = computed(() => {
      if (!isLocked.value) return 0
      const ms = lockedUntilTs.value - Date.now()
      return Math.ceil(ms / (60 * 1000))
    })

    const isWithinShiftWindow = computed(() => {
      const shiftStart = attendanceRecord.value.shiftStart || ''
      const shiftEnd = attendanceRecord.value.shiftEnd || ''
      if (!shiftStart || !shiftEnd) return true

      const now = new Date()
      const toMinutes = (value) => {
        const [h, m] = String(value).split(':').map((part) => Number(part || 0))
        return h * 60 + m
      }

      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const start = toMinutes(shiftStart)
      const end = toMinutes(shiftEnd)
      return nowMinutes >= start && nowMinutes <= end
    })

    const canClockIn = computed(() => {
      return (
        isPinVerified.value &&
        isFaceVerified.value &&
        !isLocked.value &&
        isWithinShiftWindow.value &&
        cameraReady.value &&
        !attendanceRecord.value.timeIn
      )
    })

    const canClockOut = computed(() => {
      return (
        isPinVerified.value &&
        isFaceVerified.value &&
        !isLocked.value &&
        isWithinShiftWindow.value &&
        cameraReady.value &&
        !!attendanceRecord.value.timeIn &&
        !attendanceRecord.value.timeOut
      )
    })

    const displayedEmployeeName = computed(() => (isFaceVerified.value ? employeeName.value : '-'))
    const displayedEmployeeRole = computed(() => (isFaceVerified.value ? employeeRole.value : '-'))

    const getAttendanceDocRef = () => doc(db, 'attendance', `${currentUserId.value}_${todayKey.value}`)

    const getWeekStartKey = (baseDate = new Date()) => {
      const currentDay = baseDate.getDay()
      const diffToMonday = (currentDay + 6) % 7
      const monday = new Date(baseDate)
      monday.setDate(baseDate.getDate() - diffToMonday)
      const yyyy = monday.getFullYear()
      const mm = String(monday.getMonth() + 1).padStart(2, '0')
      const dd = String(monday.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const getDayName = (baseDate = new Date()) =>
      baseDate.toLocaleDateString('en-US', { weekday: 'long' })

    const parseTimeTo24h = (value) => {
      const raw = String(value || '').trim().toUpperCase()
      if (!raw) return ''
      const clean = raw.replace(/\s+/g, '')

      const match12 = clean.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
      if (match12) {
        let hours = Number(match12[1])
        const minutes = Number(match12[2])
        const meridiem = match12[3].toUpperCase()
        if (hours === 12) hours = 0
        if (meridiem === 'PM') hours += 12
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }

      const match24 = clean.match(/^(\d{1,2}):(\d{2})$/)
      if (match24) {
        const hours = Number(match24[1])
        const minutes = Number(match24[2])
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return ''
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }

      return ''
    }

    const extractShiftWindow = (shiftLabel) => {
      const label = String(shiftLabel || '').trim()
      if (!label) return { shiftStart: '', shiftEnd: '' }

      const normalized = label.includes('||') ? label.split('||').pop().trim() : label
      const [startRaw = '', endRaw = ''] = normalized.split('-').map((part) => part.trim())
      const shiftStart = parseTimeTo24h(startRaw)
      const shiftEnd = parseTimeTo24h(endRaw)
      return { shiftStart, shiftEnd }
    }

    const loadShiftFromSchedules = async () => {
      const dayName = getDayName(new Date())
      const currentWeekKey = getWeekStartKey(new Date())
      const schedulesSnap = await getDocs(collection(db, 'users', currentUserId.value, 'schedules'))

      const docs = schedulesSnap.docs
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .sort((a, b) => String(b.id || '').localeCompare(String(a.id || '')))

      const currentWeek = docs.find((entry) => String(entry.id) === currentWeekKey)
      const currentWeekShift = String(currentWeek?.assignments?.[dayName] || '').trim()
      if (currentWeekShift) {
        return extractShiftWindow(currentWeekShift)
      }

      const fallback = docs.find((entry) => String(entry?.assignments?.[dayName] || '').trim())
      return extractShiftWindow(fallback?.assignments?.[dayName] || '')
    }
    const getFallbackPath = () => {
      const role = String(employeeRole.value || '').toLowerCase()
      if (role === 'manager') return '/manager/dashboard'
      if (role === 'receptionist') return '/receptionist/dashboard'
      if (role === 'practitioner') return '/practitioner/dashboard'
      if (role === 'finance') return '/finance/dashboard'
      if (role === 'hr') return '/hr/dashboard'
      return '/login'
    }

    const goBack = () => {
      if (window.history.length > 1) {
        router.back()
        return
      }
      router.push(getFallbackPath())
    }

    const getLockStorageKey = () => `attendancePinLock:${currentUserId.value}`

    const restorePinGuard = () => {
      if (!currentUserId.value) return
      try {
        const raw = localStorage.getItem(getLockStorageKey())
        if (!raw) return
        const parsed = JSON.parse(raw)
        failedAttempts.value = Number(parsed.failedAttempts || 0)
        lockedUntilTs.value = Number(parsed.lockedUntilTs || 0)
      } catch {
        failedAttempts.value = 0
        lockedUntilTs.value = 0
      }
    }

    const persistPinGuard = () => {
      if (!currentUserId.value) return
      localStorage.setItem(
        getLockStorageKey(),
        JSON.stringify({
          failedAttempts: failedAttempts.value,
          lockedUntilTs: lockedUntilTs.value
        })
      )
    }

    const loadProfileAndAttendance = async () => {
      const userSnap = await getDoc(doc(db, 'users', currentUserId.value))
      if (!userSnap.exists()) {
        toast.error('User profile not found.')
        return
      }

      const profile = userSnap.data()
      if (profile.archived === true) {
        await Swal.fire({
          icon: 'warning',
          title: 'Archived Account',
          text: 'Your account is archived and cannot access attendance.'
        })
        router.push(getFallbackPath())
        return
      }
      currentBranchId.value = profile.branchId || ''

      const firstName = profile.firstName || ''
      const lastName = profile.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()

      employeeName.value = profile.name || fullName || profile.email || 'Unknown Staff'
      employeeRole.value = profile.role || '-'
      storedPin.value = String(profile.attendancePin || profile.pin || '').trim()
      isFaceVerified.value = false
      faceVerifyMessage.value = ''

      const faceRegistration = profile.faceRegistration || {}
      const sampleDescriptors = Array.isArray(faceRegistration.samples)
        ? faceRegistration.samples
            .map((item) => (Array.isArray(item?.descriptor) ? item.descriptor : null))
            .filter((descriptor) => Array.isArray(descriptor) && descriptor.length > 0)
        : []
      const meanDescriptor = Array.isArray(faceRegistration.meanDescriptor) && faceRegistration.meanDescriptor.length > 0
        ? [faceRegistration.meanDescriptor]
        : []

      registeredFaceDescriptors.value = sampleDescriptors.length > 0 ? sampleDescriptors : meanDescriptor
      hasFaceRegistration.value = registeredFaceDescriptors.value.length > 0
      if (!hasFaceRegistration.value) {
        faceVerifyMessage.value = 'Face registration is required before attendance.'
        setTimeout(async () => {
          await Swal.fire({
            icon: 'warning',
            title: 'Face Registration Required',
            text: 'You must register your face first before using attendance record.',
            confirmButtonText: 'Go to Face Registration',
            allowOutsideClick: false,
          })
          router.push('/face-reg')
        }, 250)
      }

      let shiftStart = String(profile.shiftStart || '').trim()
      let shiftEnd = String(profile.shiftEnd || '').trim()

      if (!shiftStart || !shiftEnd) {
        const fromSchedule = await loadShiftFromSchedules()
        shiftStart = shiftStart || fromSchedule.shiftStart
        shiftEnd = shiftEnd || fromSchedule.shiftEnd
      }

      hasShiftAssignment.value = Boolean(shiftStart && shiftEnd)

      const attendanceSnap = await getDoc(getAttendanceDocRef())
      attendanceRecord.value = attendanceSnap.exists() ? attendanceSnap.data() : {}
      attendanceRecord.value.shiftStart = shiftStart
      attendanceRecord.value.shiftEnd = shiftEnd

      if (!hasShiftAssignment.value) {
        isPinVerified.value = false
        await Swal.fire({
          icon: 'warning',
          title: 'Attendance Locked',
          text: 'You cannot access attendance yet because no shift is assigned to your account.'
        })
        router.push(getFallbackPath())
      }

      restorePinGuard()
    }

    const attachStreamToVideo = async () => {
      await nextTick()
      if (!videoRef.value || !cameraStream.value) return
      if (videoRef.value.srcObject !== cameraStream.value) {
        videoRef.value.srcObject = cameraStream.value
      }
      try {
        await videoRef.value.play()
      } catch (error) {
        console.error('Video playback failed:', error)
      }
    }

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast.error('This browser does not support webcam capture.')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })

        cameraStream.value = stream
        cameraReady.value = true
        await attachStreamToVideo()
      } catch (error) {
        cameraReady.value = false
        toast.error('Unable to access camera. Please allow webcam permission.')
        console.error(error)
      }
    }

    const stopCamera = () => {
      if (!cameraStream.value) return
      cameraStream.value.getTracks().forEach((track) => track.stop())
      cameraStream.value = null
      cameraReady.value = false
    }

    const capturePhotoBlob = async () => {
      if (!videoRef.value || !canvasRef.value) return null

      const video = videoRef.value
      const canvas = canvasRef.value
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, width, height)

      capturedPreview.value = canvas.toDataURL('image/jpeg', 0.85)

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
      })
    }

    const verifyPin = () => {
      if (!hasShiftAssignment.value) {
        toast.error('No shift assigned yet. Attendance is locked.')
        return
      }
      if (isLocked.value) return

      if (!storedPin.value) {
        toast.error('Attendance PIN is not configured for your account.')
        return
      }

      if (pinInput.value === storedPin.value) {
        isPinVerified.value = true
        isFaceVerified.value = false
        faceVerifyMessage.value = 'PIN verified. Please verify your face.'
        failedAttempts.value = 0
        lockedUntilTs.value = 0
        persistPinGuard()
        toast.success('PIN verified.')
        return
      }

      failedAttempts.value += 1

      if (failedAttempts.value >= maxPinAttempts) {
        lockedUntilTs.value = Date.now() + lockoutMinutes * 60 * 1000
        toast.error(`PIN locked for ${lockoutMinutes} minutes.`)
      } else {
        toast.error('Invalid PIN.')
      }

      persistPinGuard()
    }

    const verifyFace = async () => {
      if (!hasShiftAssignment.value) {
        toast.error('No shift assigned yet. Attendance is locked.')
        return
      }

      if (!isPinVerified.value || isLocked.value) {
        toast.error('Verify your PIN first.')
        return
      }

      if (!hasFaceRegistration.value) {
        toast.error('No registered face found for your account.')
        return
      }

      if (!cameraReady.value || !videoRef.value) {
        toast.error('Camera is required for face verification.')
        return
      }

      if (isFaceVerifying.value) return
      isFaceVerifying.value = true
      faceVerifyMessage.value = 'Checking face match...'

      try {
        const extraction = await extractSingleFaceDescriptor(videoRef.value)
        if (!extraction?.ok || !Array.isArray(extraction?.descriptor)) {
          const message =
            extraction?.reason === 'multiple_faces'
              ? 'Multiple faces detected. Keep only one face in frame.'
              : 'No face detected. Align your face and try again.'
          isFaceVerified.value = false
          faceVerifyMessage.value = message
          toast.error(message)
          return
        }

        const match = findBestFaceMatch({
          probeDescriptor: extraction.descriptor,
          referenceDescriptors: registeredFaceDescriptors.value,
          threshold: 0.55,
        })

        if (!match.matched) {
          isFaceVerified.value = false
          faceVerifyMessage.value = `Face did not match. Distance: ${Number(match.bestDistance || 0).toFixed(3)}`
          toast.error('Face verification failed.')
          return
        }

        isFaceVerified.value = true
        faceVerifyMessage.value = `Face verified (distance: ${Number(match.bestDistance || 0).toFixed(3)}).`
        toast.success('Face verified.')
      } catch (error) {
        isFaceVerified.value = false
        faceVerifyMessage.value = error?.message || 'Face verification failed.'
        toast.error(faceVerifyMessage.value)
      } finally {
        isFaceVerifying.value = false
      }
    }

    const uploadProofPhoto = async (blob, actionType) => {
      const now = new Date()
      const filenameTs = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`
      const path = `attendanceProofs/${currentBranchId.value}/${currentUserId.value}/${todayKey.value}/${actionType}_${filenameTs}.jpg`

      const fileRef = storageRef(storage, path)
      await uploadBytes(fileRef, blob)
      return getDownloadURL(fileRef)
    }

    const submitAttendance = async (actionType) => {
      if (isSubmitting.value) return

      if (!hasShiftAssignment.value) {
        toast.error('No shift assigned yet. Attendance is locked.')
        return
      }

      if (!isPinVerified.value || isLocked.value) {
        toast.error('Verify your PIN first.')
        return
      }

      if (!isFaceVerified.value) {
        toast.error('Verify your face first.')
        return
      }

      if (!isWithinShiftWindow.value) {
        toast.error('You are outside your allowed attendance window.')
        return
      }

      if (!cameraReady.value) {
        toast.error('Camera is required for attendance proof.')
        return
      }

      if (actionType === 'clock_in' && attendanceRecord.value.timeIn) {
        toast.info('You already clocked in today.')
        return
      }

      if (actionType === 'clock_out' && !attendanceRecord.value.timeIn) {
        toast.error('Clock in first before clocking out.')
        return
      }

      if (actionType === 'clock_out' && attendanceRecord.value.timeOut) {
        toast.info('You already clocked out today.')
        return
      }

      isSubmitting.value = true

      try {
        const blob = await capturePhotoBlob()
        if (!blob) {
          toast.error('Unable to capture webcam frame. Please try clock in/out again.')
          return
        }

        let photoUrl = ''
        try {
          photoUrl = await uploadProofPhoto(blob, actionType)
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError)
          toast.error('Photo upload failed. Please retry clock in/out.')
          return
        }

        const now = new Date()
        const timeLabel = now.toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })

        const payload = {
          employeeId: currentUserId.value,
          employeeName: employeeName.value,
          role: employeeRole.value,
          branchId: currentBranchId.value,
          date: todayKey.value,
          updatedAt: serverTimestamp(),
          createdAt: attendanceRecord.value.createdAt || serverTimestamp()
        }

        if (actionType === 'clock_in') {
          payload.timeIn = timeLabel
          payload.photoInUrl = photoUrl
        } else {
          payload.timeOut = timeLabel
          payload.photoOutUrl = photoUrl
        }

        await setDoc(getAttendanceDocRef(), payload, { merge: true })

        attendanceRecord.value = {
          ...attendanceRecord.value,
          ...payload
        }
        isFaceVerified.value = false
        faceVerifyMessage.value = 'Attendance saved. Verify face again for next action.'

        toast.success(actionType === 'clock_in' ? 'Clock in saved.' : 'Clock out saved.')
      } catch (error) {
        console.error('Attendance save failed:', error)
        toast.error(`Attendance save failed: ${error?.message || 'Unknown error'}`)
      } finally {
        isSubmitting.value = false
      }
    }

    let unsubscribeAuth = null
    let clockInterval = null

    onMounted(() => {
      clockInterval = setInterval(() => {
        nowRef.value = new Date()
      }, 1000)

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) return
        currentUserId.value = user.uid
        await loadProfileAndAttendance()
        if (hasShiftAssignment.value) {
          await startCamera()
        } else {
          stopCamera()
        }
      })
    })

    watch(
      () => videoRef.value,
      async (value) => {
        if (value && cameraStream.value) {
          await attachStreamToVideo()
        }
      }
    )

    onUnmounted(() => {
      stopCamera()
      if (unsubscribeAuth) unsubscribeAuth()
      if (clockInterval) clearInterval(clockInterval)
    })

    return {
      attendanceRecord,
      pinInput,
      failedAttempts,
      maxPinAttempts,
      isLocked,
      lockoutMinutesRemaining,
      isPinVerified,
      isFaceVerified,
      isFaceVerifying,
      faceVerifyMessage,
      hasFaceRegistration,
      displayedEmployeeName,
      displayedEmployeeRole,
      employeeName,
      employeeRole,
      todayLabel,
      liveTime,
      liveDate,
      videoRef,
      canvasRef,
      cameraReady,
      capturedPreview,
      isSubmitting,
      hasShiftAssignment,
      canClockIn,
      canClockOut,
      isWithinShiftWindow,
      goBack,
      verifyPin,
      verifyFace,
      submitAttendance
    }
  }
}
</script>


