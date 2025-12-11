<script setup>
import { ref, computed, reactive } from 'vue'
import LoadingAnime from './LoadingAnime.vue'

const props = defineProps({
  primaryColor: {
    type: String,
  },
})

const customStyles = computed(() => ({
  '--primary-color': props.primaryColor,
}))

const emit = defineEmits(['form-complete'])

const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  phone: '',
})

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmailValid = computed(() => {
  return emailRegex.test(form.email.trim())
})

const isFormValid = computed(() => {
  return form.name.trim() !== '' && isEmailValid.value && form.phone.length >= 10
})

const handleForm = () => {
  if (!isFormValid.value) return

  loading.value = true

  setTimeout(() => {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    // console.log('Generated token:', token)

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000

    localStorage.setItem('chatUser', JSON.stringify({ ...form, token, expiresAt }))
    loading.value = false
    emit('form-complete')
  }, 3000)
}
</script>

<template>
  <div class="cdUser011011-container">
    <div class="cdUser011011-card">
      <h2 class="cdUser011011-title">
        <svg
          class="cdUser011011-title-svg"
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
        >
          <defs>
            <linearGradient id="cdUser011011Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--primary-color)" />
              <stop offset="100%" stop-color="var(--primary-color)" />
            </linearGradient>
          </defs>

          <path
            fill="url(#cdUser011011Gradient)"
            d="M22.62 3.783c-1.115-1.811-4.355-2.604-6.713-.265c-.132.135-.306.548.218 1.104c1.097 1.149 6.819 7.046 4.702 12.196c-1.028 2.504-3.953 2.073-5.052-2.076a23.2 23.2 0 0 1-.473-9.367s.105-.394-.065-.52c-.117-.087-.305-.05-.547.33c-.06.096-.048.076-.106.178l-.003.002c-1.622 2.688-3.272 5.874-4.049 7.07c.38-1.803-.101-4.283-.85-6.359l-.142-.375c-.692-1.776-1.524-2.974-1.776-3.245c-.03-.033-.105-.094-.353-.094H.398c-.49 0-.448.412-.293.561c1.862 2.178 7.289 10.343 4.773 18.355c-.194.619.11.944.612.305c2.206-2.81 4.942-7.598 6.925-11.187c-.437 1.245-.822 2.63-1.028 4.083c-.435 3.064.487 5.37 1.162 6.58c.345.619.803.998 1.988.824c6.045-.885 8.06-6.117 8.805-8.77c1.357-4.839.363-7.568-.722-9.33"
          />
        </svg>

        <span>elcome</span>
      </h2>
      <p class="cdUser011011-subtitle">Please provide your info to start chatting with us</p>

      <form @submit.prevent="handleForm" class="cdUser011011-form">
        <div class="cdUser011011-input-group">
          <label>Full Name</label>
          <input v-model="form.name" type="text" :style="customStyles" />
        </div>

        <div class="cdUser011011-input-group">
          <label>Email Address</label>
          <input v-model="form.email" type="email" :style="customStyles" />
        </div>

        <div class="cdUser011011-input-group">
          <label>Phone Number</label>
          <input v-model="form.phone" type="tel" :style="customStyles" />
        </div>

        <button type="submit" :disabled="!isFormValid || loading" class="cdUser011011-btn">
          <LoadingAnime v-if="loading" />
          <span v-if="!loading">Start Chat</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Reset box-sizing for this component */
.cdUser011011-container *,
.cdUser011011-container *::before,
.cdUser011011-container *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.cdUser011011-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  padding: 16px;
  width: 100%;
}

.cdUser011011-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.cdUser011011-title {
  text-align: center;
  font-size: 1.5rem;
  color: #111827;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1.2;
}

.cdUser011011-title span {
  margin: 0;
  padding: 0;
}

.cdUser011011-title-svg {
  display: block;
  flex-shrink: 0;
}

.cdUser011011-subtitle {
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 0 24px 0;
  padding: 0;
  line-height: 1.4;
}

.cdUser011011-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
}

.cdUser011011-input-group {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

.cdUser011011-input-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin: 0 0 6px 0;
  padding: 0;
  line-height: 1.2;
}

.cdUser011011-input-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  font-size: 0.95rem;
  line-height: 1.4;
  margin: 0;
  background: #fff;
}

.cdUser011011-input-group input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
.cdUser011011-Gradient {
  color: var(--primary-color);
}
.cdUser011011-btn {
  background: var(--primary-color);
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    transform 0.1s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 4px 0 0 0;
  min-height: 44px;
}

.cdUser011011-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.cdUser011011-btn:active:not(:disabled) {
  transform: translateY(0);
}

.cdUser011011-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<template>
  <div class="cdUser011011-container">
    <div class="cdUser011011-card">
      <!-- Header -->
      <div class="cdUser011011-header">
        <div class="cdUser011011-logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            class="cdUser011011-logo-svg"
          >
            <path
              :fill="primaryColor || '#10b981'"
              d="M22.62 3.783c-1.115-1.811-4.355-2.604-6.713-.265c-.132.135-.306.548.218 1.104c1.097 1.149 6.819 7.046 4.702 12.196c-1.028 2.504-3.953 2.073-5.052-2.076a23.2 23.2 0 0 1-.473-9.367s.105-.394-.065-.52c-.117-.087-.305-.05-.547.33c-.06.096-.048.076-.106.178l-.003.002c-1.622 2.688-3.272 5.874-4.049 7.07c.38-1.803-.101-4.283-.85-6.359l-.142-.375c-.692-1.776-1.524-2.974-1.776-3.245c-.03-.033-.105-.094-.353-.094H.398c-.49 0-.448.412-.293.561c1.862 2.178 7.289 10.343 4.773 18.355c-.194.619.11.944.612.305c2.206-2.81 4.942-7.598 6.925-11.187c-.437 1.245-.822 2.63-1.028 4.083c-.435 3.064.487 5.37 1.162 6.58c.345.619.803.998 1.988.824c6.045-.885 8.06-6.117 8.805-8.77c1.357-4.839.363-7.568-.722-9.33"
            />
          </svg>
        </div>
        <h1 class="cdUser011011-title">
          <span class="cdUser011011-title-greeting">Welcome</span>
          <span class="cdUser011011-title-sub">to our support chat</span>
        </h1>
        <p class="cdUser011011-subtitle">Please provide your details to start chatting with us</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleForm" class="cdUser011011-form">
        <div class="cdUser011011-input-group">
          <label for="name" class="cdUser011011-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="cdUser011011-icon"
            >
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3s-3-1.34-3-3s1.34-3 3-3m0 14.2a7.2 7.2 0 0 1-6-3.22c.03-1.99 4-3.08 6-3.08c1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 0 1-6 3.22"
              />
            </svg>
            Full Name
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Enter your full name"
            required
            :style="{ '--focus-color': primaryColor }"
            class="cdUser011011-input"
          />
        </div>

        <div class="cdUser011011-input-group">
          <label for="email" class="cdUser011011-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="cdUser011011-icon"
            >
              <path
                fill="currentColor"
                d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 4l-8 5l-8-5V6l8 5l8-5z"
              />
            </svg>
            Email Address
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="your.email@example.com"
            required
            :style="{ '--focus-color': primaryColor }"
            class="cdUser011011-input"
          />
        </div>

        <div class="cdUser011011-input-group">
          <label for="phone" class="cdUser011011-label">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="cdUser011011-icon"
            >
              <path
                fill="currentColor"
                d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24c1.12.37 2.33.57 3.57.57c.55 0 1 .45 1 1V20c0 .55-.45 1-1 1c-9.39 0-17-7.61-17-17c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1c0 1.25.2 2.45.57 3.57c.11.35.03.74-.25 1.02z"
              />
            </svg>
            Phone Number
          </label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            :style="{ '--focus-color': primaryColor }"
            class="cdUser011011-input"
          />
        </div>

        <button
          type="submit"
          :disabled="!isFormValid || loading"
          :style="{ '--btn-color': primaryColor }"
          class="cdUser011011-btn"
        >
          <span class="cdUser011011-btn-content">
            <template v-if="loading">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                class="cdUser011011-spinner"
              >
                <path
                  fill="currentColor"
                  d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
                  opacity=".25"
                />
                <path
                  fill="currentColor"
                  d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
                >
                  <animateTransform
                    attributeName="transform"
                    dur="0.75s"
                    repeatCount="indefinite"
                    type="rotate"
                    values="0 12 12;360 12 12"
                  />
                </path>
              </svg>
              Processing...
            </template>
            <template v-else>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                class="cdUser011011-btn-icon"
              >
                <path fill="currentColor" d="m10 17l5-5l-5-5v10Z" />
              </svg>
              Start Chatting
            </template>
          </span>
        </button>
      </form>

      <!-- Privacy Note -->
      <p class="cdUser011011-privacy">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          class="cdUser011011-privacy-icon"
        >
          <path
            fill="currentColor"
            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"
          />
        </svg>
        Your information is secure and will only be used for support purposes.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  primaryColor: {
    type: String,
    default: '#10b981',
  },
})

const form = defineModel('form', {
  default: () => ({
    name: '',
    email: '',
    phone: '',
  }),
})

const loading = defineModel('loading', {
  default: false,
})

const emit = defineEmits(['submit'])

const isFormValid = computed(() => {
  return form.value.name.trim() && form.value.email.trim()
})

const handleForm = () => {
  if (isFormValid.value && !loading.value) {
    emit('submit', form.value)
  }
}
</script>

<style scoped>
/* ===== BASE RESET ===== */
.cdUser011011-container *,
.cdUser011011-container *::before,
.cdUser011011-container *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

/* ===== CONTAINER ===== */
.cdUser011011-container {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: transparent;
  padding: 1rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ===== CARD ===== */
.cdUser011011-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 20px;
  padding: 1.75rem 1.25rem;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 8px 40px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 480px) {
  .cdUser011011-card {
    padding: 1.5rem 1rem;
    border-radius: 16px;
    box-shadow:
      0 2px 12px rgba(0, 0, 0, 0.06),
      0 4px 24px rgba(0, 0, 0, 0.03);
  }
}

@media (max-width: 360px) {
  .cdUser011011-container {
    padding: 0.75rem;
  }

  .cdUser011011-card {
    padding: 1.25rem 0.875rem;
  }
}

/* ===== HEADER ===== */
.cdUser011011-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.cdUser011011-logo {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
  padding: 0.75rem;
}

.cdUser011011-logo-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

@media (max-width: 480px) {
  .cdUser011011-logo {
    width: 52px;
    height: 52px;
    border-radius: 14px;
  }
}

/* ===== TYPOGRAPHY ===== */
.cdUser011011-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.cdUser011011-title-greeting {
  color: #111827;
  font-weight: 700;
}

.cdUser011011-title-sub {
  color: var(--btn-color, #10b981);
  font-weight: 600;
  font-size: 0.9em;
}

@media (max-width: 480px) {
  .cdUser011011-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 360px) {
  .cdUser011011-title {
    font-size: 1.375rem;
  }
}

.cdUser011011-subtitle {
  color: #6b7280;
  font-size: 0.9375rem;
  line-height: 1.5;
  max-width: 320px;
  margin: 0 auto;
}

@media (max-width: 480px) {
  .cdUser011011-subtitle {
    font-size: 0.875rem;
    max-width: 280px;
  }
}

/* ===== FORM ===== */
.cdUser011011-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

@media (max-width: 480px) {
  .cdUser011011-form {
    gap: 1rem;
  }
}

/* ===== INPUT GROUPS ===== */
.cdUser011011-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.cdUser011011-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  line-height: 1.2;
}

.cdUser011011-icon {
  flex-shrink: 0;
  color: #6b7280;
  opacity: 0.8;
}

@media (max-width: 480px) {
  .cdUser011011-label {
    font-size: 0.8125rem;
  }
}

/* ===== INPUTS ===== */
.cdUser011011-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s ease;
  font-size: 0.9375rem;
  line-height: 1.5;
  background: #ffffff;
  font-family: inherit;
  -webkit-appearance: none;
  appearance: none;
  min-height: 48px;
}

.cdUser011011-input:focus {
  border-color: var(--focus-color, #10b981);
  box-shadow:
    0 0 0 3px rgba(16, 185, 129, 0.15),
    0 1px 2px rgba(0, 0, 0, 0.05);
  background: #ffffff;
}

.cdUser011011-input::placeholder {
  color: #9ca3af;
  font-size: 0.875rem;
}

@media (max-width: 480px) {
  .cdUser011011-input {
    padding: 0.75rem 0.875rem;
    font-size: 0.875rem;
    min-height: 44px;
  }
}

/* ===== BUTTON ===== */
.cdUser011011-btn {
  background: var(--btn-color, #10b981);
  color: white;
  font-weight: 600;
  font-size: 0.9375rem;
  border: none;
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 0.5rem;
  min-height: 52px;
  touch-action: manipulation;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.cdUser011011-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0);
  transition: background 0.2s ease;
}

.cdUser011011-btn:hover:not(:disabled)::before {
  background: rgba(255, 255, 255, 0.1);
}

.cdUser011011-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.cdUser011011-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cdUser011011-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

@media (max-width: 480px) {
  .cdUser011011-btn {
    min-height: 48px;
    font-size: 0.875rem;
    padding: 0.875rem;
  }
}

/* ===== SPINNER ===== */
.cdUser011011-spinner {
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.cdUser011011-btn-icon {
  transition: transform 0.2s ease;
}

.cdUser011011-btn:hover:not(:disabled) .cdUser011011-btn-icon {
  transform: translateX(2px);
}

/* ===== PRIVACY NOTE ===== */
.cdUser011011-privacy {
  text-align: center;
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1.4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 0.5rem;
}

.cdUser011011-privacy-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

@media (max-width: 480px) {
  .cdUser011011-privacy {
    font-size: 0.6875rem;
    padding: 0.75rem;
    flex-direction: column;
    text-align: center;
    gap: 0.375rem;
  }
}

/* ===== DARK MODE SUPPORT ===== */
@media (prefers-color-scheme: dark) {
  .cdUser011011-card {
    background: #1f2937;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.2),
      0 8px 40px rgba(0, 0, 0, 0.15);
  }

  .cdUser011011-logo {
    background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  }

  .cdUser011011-title-greeting {
    color: #f9fafb;
  }

  .cdUser011011-subtitle {
    color: #d1d5db;
  }

  .cdUser011011-label {
    color: #e5e7eb;
  }

  .cdUser011011-icon {
    color: #9ca3af;
  }

  .cdUser011011-input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }

  .cdUser011011-input:focus {
    background: #374151;
    border-color: var(--focus-color, #10b981);
    box-shadow:
      0 0 0 3px rgba(16, 185, 129, 0.25),
      0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .cdUser011011-input::placeholder {
    color: #9ca3af;
  }

  .cdUser011011-privacy {
    background: #111827;
    color: #9ca3af;
  }
}

/* ===== SAFE AREA SUPPORT ===== */
@supports (padding: max(0px)) {
  .cdUser011011-container {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
}

/* ===== PORTRAIT/LANDSCAPE ADJUSTMENTS ===== */
@media (orientation: landscape) and (max-height: 600px) {
  .cdUser011011-container {
    padding: 0.5rem;
  }

  .cdUser011011-card {
    padding: 1rem;
    gap: 1rem;
  }

  .cdUser011011-logo {
    width: 48px;
    height: 48px;
    margin-bottom: 0;
  }

  .cdUser011011-title {
    font-size: 1.25rem;
  }

  .cdUser011011-form {
    gap: 0.75rem;
  }

  .cdUser011011-input {
    padding: 0.625rem 0.75rem;
    min-height: 40px;
    font-size: 0.875rem;
  }

  .cdUser011011-btn {
    min-height: 44px;
    padding: 0.75rem;
  }
}
</style>
