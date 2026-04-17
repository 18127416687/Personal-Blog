<template>
  <div id="login-page">
    <div class="left-panel">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M12 2L15 9H9L12 2Z" />
          <path d="M12 22L9 15H15L12 22Z" />
          <path d="M2 12L9 9V15L2 12Z" />
          <path d="M22 12L15 15V9L22 12Z" />
        </svg>
        <span>闈欐硦灏忕瓚</span>
      </div>

      <div class="characters-wrapper">
        <div class="characters-scene" ref="sceneRef" :style="sceneStyle">
          <div class="character char-purple">
            <div class="eyes">
              <span class="eye"><span class="pupil"></span></span>
              <span class="eye"><span class="pupil"></span></span>
            </div>
          </div>
          <div class="character char-black">
            <div class="eyes">
              <span class="eye"><span class="pupil"></span></span>
              <span class="eye"><span class="pupil"></span></span>
            </div>
          </div>
          <div class="character char-orange">
            <div class="eyes">
              <span class="eye"><span class="pupil"></span></span>
              <span class="eye"><span class="pupil"></span></span>
            </div>
          </div>
          <div class="character char-yellow">
            <div class="eyes">
              <span class="eye"><span class="pupil"></span></span>
              <span class="eye"><span class="pupil"></span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-links">
        <a href="javascript:void(0)">闅愮鏀跨瓥</a>
        <a href="javascript:void(0)">鏈嶅姟鏉℃</a>
        <a href="javascript:void(0)">鑱旂郴鎴戜滑</a>
      </div>
    </div>

    <div class="right-panel">
      <div class="form-container">
        <div class="sparkle-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.5 9H10.5L12 2Z" fill="#1a1a2e" />
            <path d="M12 22L10.5 15H13.5L12 22Z" fill="#1a1a2e" />
            <path d="M2 12L9 10.5V13.5L2 12Z" fill="#1a1a2e" />
            <path d="M22 12L15 13.5V10.5L22 12Z" fill="#1a1a2e" />
          </svg>
        </div>

        <div class="form-header">
          <h1>欢迎回来</h1>
          <p>请输入你的账号信息</p>
        </div>

        <form @submit.prevent="onSubmit">
          <div class="form-group">
            <label for="username">用户名</label>
            <div class="input-wrapper">
              <input id="username" v-model.trim="username" type="text" placeholder="璇疯緭鍏ョ敤鎴峰悕" autocomplete="off" />
            </div>
          </div>

          <div class="form-group">
            <label for="password">瀵嗙爜</label>
            <div class="input-wrapper">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
              <button type="button" class="toggle-password" @click="onTogglePassword">
                <i :class="showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'"></i>
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" checked /> 30 天内记住我
            </label>
            <span class="forgot-link">忘记密码？</span>
          </div>

          <div v-if="error" class="error-msg" style="display:block;">{{ error }}</div>
          <div v-if="ok" class="ok-msg">登录成功，正在跳转...</div>
          <button class="btn-login" type="submit" :disabled="loading">
            <span class="btn-text">{{ loading ? "登录中..." : "登录" }}</span>
            <div class="btn-hover-content">
              <span>{{ loading ? "登录中..." : "登录" }}</span>
              <i class="fa-solid fa-arrow-right"></i>
            </div>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../services/api";

const router = useRouter();
const username = ref("");
const password = ref("");
const loading = ref(false);
const showPassword = ref(false);
const error = ref("");
const ok = ref(false);
const sceneRef = ref(null);
const lookX = ref(0);
const lookY = ref(0);
let peekTimer = null;

const sceneStyle = computed(() => ({
  "--eye-x": `${lookX.value}px`,
  "--eye-y": `${lookY.value}px`
}));

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function onPointerMove(e) {
  if (!sceneRef.value) return;
  const rect = sceneRef.value.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  lookX.value = Math.round(clamp(nx * 5, -5, 5));
  lookY.value = Math.round(clamp(ny * 3, -3, 3));
}

function onPointerLeave() {
  lookX.value = 0;
  lookY.value = 0;
}

function onTogglePassword() {
  const oldX = lookX.value;
  showPassword.value = !showPassword.value;

  const peekX = oldX >= 0 ? -6 : 6;
  lookX.value = peekX;
  lookY.value = -1;
  if (peekTimer) clearTimeout(peekTimer);
  peekTimer = setTimeout(() => {
    lookX.value = 0;
    lookY.value = 0;
  }, 420);
}

async function onSubmit() {
  error.value = "";
  ok.value = false;

  if (!username.value) {
    error.value = "请输入用户名。";
    return;
  }
  if (!password.value || password.value.length < 6) {
    error.value = "密码至少需要 6 位。";
    return;
  }

  loading.value = true;
  try {
    await login({ username: username.value, password: password.value });
    ok.value = true;
    window.dispatchEvent(new Event("auth-changed"));
    setTimeout(() => router.push("/"), 450);
  } catch (e) {
    error.value = e.message || "登录失败，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerleave", onPointerLeave);
});

onUnmounted(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerleave", onPointerLeave);
  if (peekTimer) clearTimeout(peekTimer);
});
</script>

<style scoped>
* {
  box-sizing: border-box;
}

#login-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  background: #fff;
}

.left-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(135deg, #d4d0dc 0%, #c8c4d0 50%, #bbb7c5 100%);
  padding: 40px 48px;
  overflow: hidden;
}

.left-panel .logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  z-index: 10;
}

.left-panel .logo svg {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px;
  border-radius: 6px;
}

.characters-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.characters-scene {
  position: relative;
  width: 360px;
  height: 260px;
  --eye-x: 0px;
  --eye-y: 0px;
}

.character {
  position: absolute;
  bottom: 0;
  transform-origin: center bottom;
  animation: float-bob 4.2s ease-in-out infinite;
}

.char-purple {
  left: 65px;
  width: 128px;
  height: 230px;
  background: #6c3ff5;
  border-radius: 10px 10px 0 0;
  animation-delay: 0s;
}

.char-black {
  left: 185px;
  width: 92px;
  height: 180px;
  background: #2d2d2d;
  border-radius: 8px 8px 0 0;
  animation-delay: 0.45s;
}

.char-orange {
  left: 0;
  width: 180px;
  height: 120px;
  background: #ff9b6b;
  border-radius: 90px 90px 0 0;
  animation-delay: 0.9s;
}

.char-yellow {
  left: 235px;
  width: 105px;
  height: 140px;
  background: #e8d754;
  border-radius: 52px 52px 0 0;
  animation-delay: 1.35s;
}

.eyes {
  position: absolute;
  top: 34px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.char-black .eyes {
  top: 26px;
  gap: 8px;
}

.char-orange .eyes {
  top: 24px;
  gap: 12px;
}

.char-yellow .eyes {
  top: 22px;
  gap: 8px;
}

.eye {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.char-black .eye {
  width: 12px;
  height: 12px;
}

.char-orange .eye {
  width: 13px;
  height: 13px;
}

.char-yellow .eye {
  width: 11px;
  height: 11px;
}

.pupil {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #111827;
  transform: translate(var(--eye-x), var(--eye-y));
  transition: transform 120ms ease-out;
}

.char-black .pupil,
.char-yellow .pupil {
  width: 5px;
  height: 5px;
}

@keyframes float-bob {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-6px) rotate(-0.8deg);
  }
  50% {
    transform: translateY(-10px) rotate(0deg);
  }
  75% {
    transform: translateY(-4px) rotate(0.8deg);
  }
  100% {
    transform: translateY(0) rotate(0deg);
  }
}

.footer-links {
  display: flex;
  gap: 28px;
  font-size: 13px;
  color: rgba(80, 70, 90, 0.7);
}

.footer-links a {
  color: inherit;
  text-decoration: none;
}

.right-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 40px;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.sparkle-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.sparkle-icon svg {
  width: 32px;
  height: 32px;
}

.form-header {
  text-align: center;
  margin-bottom: 36px;
}

.form-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 6px;
}

.form-header p {
  font-size: 14px;
  color: #888;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}

.form-group input {
  width: 100%;
  height: 48px;
  border: none;
  border-bottom: 1.5px solid #e0e0e0;
  padding: 0 40px 0 0;
  font-size: 15px;
  color: #1a1a2e;
  background: transparent;
  outline: none;
}

.form-group input:focus {
  border-bottom-color: #5b21b6;
}

.toggle-password {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 6px;
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
}

.forgot-link {
  font-size: 13px;
  color: #5b21b6;
}

.error-msg {
  padding: 10px 14px;
  font-size: 13px;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 10px;
  margin-bottom: 12px;
}

.ok-msg {
  padding: 10px 14px;
  font-size: 13px;
  color: #065f46;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 10px;
  margin-bottom: 12px;
}

.tip-msg {
  font-size: 12px;
  color: #777;
  margin-bottom: 12px;
}

.btn-login {
  position: relative;
  width: 100%;
  height: 50px;
  border-radius: 25px;
  border: 1.5px solid #1a1a2e;
  background: #1a1a2e;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
}

.btn-login:disabled {
  opacity: 0.72;
  cursor: default;
}

.btn-login .btn-text {
  display: inline-block;
  transition: all 0.3s;
}

.btn-login .btn-hover-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #5b21b6;
  color: #fff;
  opacity: 0;
  transition: all 0.3s;
}

.btn-login:hover:not(:disabled) .btn-text {
  transform: translateX(40px);
  opacity: 0;
}

.btn-login:hover:not(:disabled) .btn-hover-content {
  opacity: 1;
}

@media (max-width: 900px) {
  #login-page {
    grid-template-columns: 1fr;
  }

  .left-panel {
    display: none;
  }

  .right-panel {
    padding: 24px;
  }
}
</style>

