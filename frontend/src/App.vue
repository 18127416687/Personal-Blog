<template>
  <header v-show="!hideShell" class="navbar">
      <div class="logo">
        <RouterLink to="/">🌿 静泊小筑</RouterLink>
      </div>

      <button class="menu-toggle" @click="mobileOpen = !mobileOpen">
        <i class="fa-solid fa-bars"></i>
      </button>

      <nav :class="['nav-links', { active: mobileOpen }]" id="navLinks">
        <RouterLink class="top-nav-link" :class="{ active: isTopActive('/') }" to="/">首页</RouterLink>
        <RouterLink class="top-nav-link" :class="{ active: isTopActive('/articles') }" to="/articles">文章</RouterLink>
        <RouterLink class="top-nav-link" :class="{ active: isTopActive('/gallery') }" to="/gallery">相册</RouterLink>
        <RouterLink class="top-nav-link" :class="{ active: isTopActive('/treehole') }" to="/treehole">树洞</RouterLink>
        <RouterLink class="top-nav-link" :class="{ active: isTopActive('/search') }" to="/search">搜索</RouterLink>

        <div class="auth-area" id="authArea" ref="authAreaRef">
          <div id="userMenuContainer" v-show="isLoggedIn" style="position: relative;">
            <button
              id="userMenuBtn"
              @click.stop="userMenuOpen = !userMenuOpen"
              style="background:none;border:none;cursor:pointer;padding:0.5rem;border-radius:6px;display:flex;align-items:center;gap:0.5rem;color:#333;font-weight:500;"
            >
              <img
                v-if="user?.avatar"
                id="navAvatar"
                :src="user.avatar"
                alt="avatar"
                style="width:28px;height:28px;border-radius:50%;object-fit:cover;"
              />
              <span id="navUserName">{{ displayName }}</span>
              <i class="fa-solid fa-chevron-down" style="font-size:0.625rem;color:#999;"></i>
            </button>

            <div
              id="userDropdown"
              :class="{ 'dropdown-open': userMenuOpen }"
              class="user-dropdown-web"
              @click.stop
              @mousedown.stop
            >
              <RouterLink to="/profile" class="dropdown-item"><i class="fa-regular fa-user"></i> 个人资料</RouterLink>
              <RouterLink to="/my-interactions" class="dropdown-item"><i class="fa-regular fa-heart"></i> 我的互动</RouterLink>
              <RouterLink to="/my-photos" class="dropdown-item"><i class="fa-regular fa-images"></i> 我的相册</RouterLink>
              <RouterLink to="/editor" class="dropdown-item"><i class="fa-regular fa-pen-to-square"></i> 写文章</RouterLink>
              <RouterLink to="/my-articles" class="dropdown-item"><i class="fa-regular fa-newspaper"></i> 我的文章</RouterLink>
              <RouterLink to="/my-drafts" class="dropdown-item"><i class="fa-regular fa-file-lines"></i> 草稿箱</RouterLink>
              <RouterLink v-if="user?.is_admin" to="/admin" class="dropdown-item"><i class="fa-solid fa-shield"></i> 管理后台</RouterLink>
              <hr style="border:none;border-top:1px solid #f0f0f0;margin:0.25rem 0;" />
              <button
                id="logoutBtnDropdown"
                @click="onLogout"
                style="width:100%;text-align:left;background:none;border:none;padding:0.5rem 0.75rem;border-radius:4px;cursor:pointer;color:#ef4444;font-size:0.875rem;display:flex;align-items:center;gap:0.5rem;"
              >
                <i class="fa-solid fa-right-from-bracket"></i> 注销
              </button>
            </div>
          </div>

          <button id="loginBtn" v-show="!isLoggedIn" @click="goLogin">
            <i class="fa-regular fa-user"></i> 登录
          </button>
        </div>
      </nav>
  </header>

  <el-alert
    v-if="shouldShowPublicNotice && publicAnnouncement.display_mode === 'marquee'"
    type="info"
    :closable="false"
    show-icon
    class="global-marquee"
  >
    <template #title>
      <div class="global-marquee-track">
        <span>{{ publicAnnouncement.content }}</span>
      </div>
    </template>
  </el-alert>

  <main :class="hideShell ? 'main-container-shellless' : 'main-container'">
    <RouterView />
  </main>

  <div v-show="!hideShell" class="footer-wrapper">
      <hr />
      <div class="footer-tip">静泊小筑 · 用代码记录成长，用文字分享经验</div>
  </div>

  <el-dialog
    v-model="showPublicAnnouncementModal"
    title="全站公告"
    width="min(520px, calc(100vw - 24px))"
    :before-close="onPublicAnnouncementDialogClose"
    :show-close="true"
    align-center
    destroy-on-close
    class="global-notice-dialog"
  >
    <div v-if="shouldShowPublicNotice && publicAnnouncement.display_mode === 'modal'" class="global-notice-card">
      <p>{{ publicAnnouncement.content }}</p>
      <button class="global-notice-btn" @click="closePublicAnnouncementModal">我知道了</button>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { currentUser, getPublicAnnouncement, logout } from "./services/api";

const route = useRoute();
const router = useRouter();
const authAreaRef = ref(null);
const user = ref(null);
const mobileOpen = ref(false);
const userMenuOpen = ref(false);
const showPublicAnnouncementModal = ref(false);
const publicAnnouncement = ref({
  enabled: false,
  content: "",
  display_mode: "marquee"
});

const routeStyleLinks = new Map();
const PUBLIC_ANNOUNCEMENT_SEEN_KEY = "public_announcement_seen";

const isLoggedIn = computed(() => !!user.value?.username);
const displayName = computed(() => user.value?.nickname || user.value?.username || "");
const hideShell = computed(() => route.meta?.shell === "none");
const isAdminRoute = computed(() => route.path.startsWith("/admin"));
const shouldShowPublicNotice = computed(
  () =>
    !hideShell.value &&
    !isAdminRoute.value &&
    !!publicAnnouncement.value?.enabled &&
    !!publicAnnouncement.value?.content
);

function isTopActive(path) {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
}

async function loadUser() {
  try {
    const data = await currentUser();
    user.value = data?.username ? data : null;
  } catch {
    user.value = null;
  }
}

async function loadPublicAnnouncement() {
  try {
    const res = await getPublicAnnouncement();
    const data = res?.data || {};
    const fingerprint = `${data.updated_at || ""}|${data.display_mode || "marquee"}|${data.content || ""}`;
    const seenFingerprint = sessionStorage.getItem(PUBLIC_ANNOUNCEMENT_SEEN_KEY) || "";
    publicAnnouncement.value = {
      enabled: !!data.enabled,
      content: data.content || "",
      display_mode: data.display_mode || "marquee",
      updated_at: data.updated_at || ""
    };
    showPublicAnnouncementModal.value =
      publicAnnouncement.value.enabled &&
      publicAnnouncement.value.display_mode === "modal" &&
      !isAdminRoute.value &&
      !!publicAnnouncement.value.content &&
      fingerprint !== seenFingerprint;
  } catch {
    publicAnnouncement.value = { enabled: false, content: "", display_mode: "marquee", updated_at: "" };
    showPublicAnnouncementModal.value = false;
  }
}

function closePublicAnnouncementModal() {
  const fingerprint = `${publicAnnouncement.value.updated_at || ""}|${publicAnnouncement.value.display_mode || "marquee"}|${publicAnnouncement.value.content || ""}`;
  sessionStorage.setItem(PUBLIC_ANNOUNCEMENT_SEEN_KEY, fingerprint);
  showPublicAnnouncementModal.value = false;
}

function onPublicAnnouncementDialogClose(done) {
  closePublicAnnouncementModal();
  done();
}

function goLogin() {
  mobileOpen.value = false;
  router.push("/login");
}

async function onLogout() {
  try {
    await logout();
  } catch {
    // ignore
  }
  user.value = null;
  userMenuOpen.value = false;
  mobileOpen.value = false;
  window.dispatchEvent(new Event("auth-changed"));
  router.push("/login");
}

function onDocClick(event) {
  if (!authAreaRef.value) return;
  if (!authAreaRef.value.contains(event.target)) {
    userMenuOpen.value = false;
  }
}

function onAuthChanged() {
  loadUser();
}

function updateRouteStyles() {
  const styles = Array.isArray(route.meta?.styles) ? route.meta.styles : [];
  const desired = new Set(styles.map((href) => new URL(href, window.location.href).href));

  for (const [resolvedHref, link] of routeStyleLinks.entries()) {
    if (!desired.has(resolvedHref)) {
      link.remove();
      routeStyleLinks.delete(resolvedHref);
    }
  }

  styles.forEach((href) => {
    const resolvedHref = new URL(href, window.location.href).href;
    if (routeStyleLinks.has(resolvedHref)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.routeStyle = "true";
    document.head.appendChild(link);
    routeStyleLinks.set(resolvedHref, link);
  });
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
    userMenuOpen.value = false;
    updateRouteStyles();
    if (!isAdminRoute.value) {
      loadPublicAnnouncement();
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadUser();
  document.addEventListener("click", onDocClick);
  window.addEventListener("auth-changed", onAuthChanged);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
  window.removeEventListener("auth-changed", onAuthChanged);
  for (const link of routeStyleLinks.values()) {
    link.remove();
  }
  routeStyleLinks.clear();
});
</script>

<style scoped>
.global-marquee {
  width: 100%;
  overflow: hidden !important;
  border: 1px solid #d8e6ff;
  border-radius: 0;
  background: #eef5ff !important;
  color: #1e60c9;
  padding: 8px 10px;
}

.global-marquee-track {
  position: relative;
  display: flex;
  width: max-content;
  animation: public-marquee 18s linear infinite;
  font-weight: 600;
  will-change: transform;
}

.global-marquee-track span {
  margin-right: 72px;
}

@keyframes public-marquee {
  from { transform: translateX(calc(100vw)); }
  to { transform: translateX(-100%); }
}

.global-notice-card {
  padding: 2px 0 0;
}

.global-notice-card p {
  margin: 0 0 14px;
  color: #425b7f;
}

.global-notice-btn {
  border: 0;
  border-radius: 10px;
  background: #2f74db;
  color: #fff;
  padding: 8px 14px;
  cursor: pointer;
}
</style>
