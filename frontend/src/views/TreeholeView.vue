<template>
  <div class="treehole-page">
    <div class="treehole-header">
      <h1><i class="fa-regular fa-comment-dots"></i> 树洞</h1>
      <p class="treehole-desc">在这里，说出你的心声。每句话都会变成弹幕飞过。</p>
    </div>

    <div class="treehole-input-card">
      <div class="treehole-input-area">
        <input
          v-model.trim="message"
          type="text"
          id="bulletMessage"
          placeholder="此刻你想说..."
          maxlength="50"
          @keydown.enter.prevent="sendBullet"
        />
        <button id="shootBtn" @click="sendBullet"><i class="fa-solid fa-paper-plane"></i> 发射</button>
      </div>
    </div>

    <div class="bullet-screen" id="bulletScreen" ref="screenRef">
      <div v-show="!hasBulletsOnScreen" class="bullet-placeholder" id="bulletPlaceholder">
        <i class="fa-regular fa-comment-dots"></i>
        <p>还没有弹幕，快来发射第一条吧。</p>
      </div>
    </div>

    <div class="bullet-history">
      <h3><i class="fa-regular fa-clock"></i> 历史记录</h3>
      <div class="bullet-history-list" id="bulletHistoryList">
        <div v-if="loading" class="loading-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>
        <div v-else-if="history.length === 0" class="bullet-history-empty"><i class="fa-regular fa-comment-dots"></i>暂无弹幕</div>

        <div v-for="item in history" v-else :key="item.id" class="bullet-history-item">
          <div class="bullet-history-avatar">
            <img v-if="item.user_avatar" :src="item.user_avatar" alt="" />
            <i v-else class="fa-regular fa-circle-user"></i>
          </div>
          <div class="bullet-history-body">
            <div class="bullet-history-user">{{ item.user || "匿名" }}</div>
            <div class="bullet-history-content">{{ item.content }}</div>
          </div>
          <div class="bullet-history-time">{{ timeAgo(item.created_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { createBullet, listBullets } from "../services/api";

const screenRef = ref(null);
const message = ref("");
const history = ref([]);
const loading = ref(true);
const hasBulletsOnScreen = ref(false);

const TRACK_COUNT = 8;
const MAX_INITIAL_REPLAY = 8;
const MAX_POLL_REPLAY = 4;
const REPLAY_GAP_MS = 700;
const POLL_INTERVAL_MS = 12000;

const tracks = Array.from({ length: TRACK_COUNT }, () => ({ busy: false }));
const seenIds = new Set();
const colors = [
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#fb923c",
  "#38bdf8",
  "#e879f9",
  "#2dd4bf",
  "#facc15",
  "#818cf8",
  "#f87171",
  "#4ade80",
  "#c084fc",
  "#22d3ee"
];

let pollTimer = null;
let queueTimer = null;
const danmakuQueue = [];

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return date.toLocaleDateString("zh-CN");
}

function findFreeTrackIndex() {
  for (let i = 0; i < tracks.length; i += 1) {
    if (!tracks[i].busy) return i;
  }
  return -1;
}

function scheduleQueueFlush(delay = 120) {
  if (queueTimer) return;
  queueTimer = window.setTimeout(() => {
    queueTimer = null;
    flushDanmakuQueue();
  }, delay);
}

function enqueueDanmaku(text, color = randomColor()) {
  if (!text) return;
  danmakuQueue.push({ text, color });
  flushDanmakuQueue();
}

function flushDanmakuQueue() {
  const screen = screenRef.value;
  if (!screen) return;

  while (danmakuQueue.length > 0) {
    const freeTrack = findFreeTrackIndex();
    if (freeTrack === -1) {
      scheduleQueueFlush(260);
      break;
    }
    const payload = danmakuQueue.shift();
    shootToScreen(payload.text, payload.color, freeTrack);
  }
}

function shootToScreen(text, color = randomColor(), fixedTrack = null) {
  const screen = screenRef.value;
  if (!screen) return;

  const freeTrack = Number.isInteger(fixedTrack) ? fixedTrack : findFreeTrackIndex();
  if (freeTrack === -1) return;

  hasBulletsOnScreen.value = true;
  tracks[freeTrack].busy = true;

  const bullet = document.createElement("div");
  bullet.className = "danmaku-item";
  bullet.textContent = text;
  bullet.style.color = color;

  const trackHeight = screen.offsetHeight / tracks.length;
  const topPos = freeTrack * trackHeight + (trackHeight - 24) / 2;
  bullet.style.top = `${topPos}px`;

  const duration = 10 + Math.random() * 6;
  bullet.style.animationDuration = `${duration}s`;

  screen.appendChild(bullet);

  window.setTimeout(() => {
    bullet.remove();
    tracks[freeTrack].busy = false;
    if (screen.querySelectorAll(".danmaku-item").length === 0) {
      hasBulletsOnScreen.value = false;
    }
    flushDanmakuQueue();
  }, duration * 1000 + 200);
}

async function loadAllBullets() {
  loading.value = true;
  try {
    const data = await listBullets();
    const list = Array.isArray(data) ? data : [];
    const ordered = [...list].reverse();
    history.value = ordered;
    const firstLoad = seenIds.size === 0;

    // 首次加载回放最近弹幕，后续轮询只发新弹幕，避免重复回放导致动画异常。
    const pending = [];
    for (const item of ordered) {
      if (!seenIds.has(item.id)) {
        pending.push(item);
      }
      seenIds.add(item.id);
    }

    const replayItems = firstLoad
      ? pending.slice(-MAX_INITIAL_REPLAY)
      : pending.slice(-MAX_POLL_REPLAY);

    let delay = 0;
    replayItems.forEach((item) => {
      window.setTimeout(() => {
        const text = item.user ? `${item.user}: ${item.content}` : item.content;
        enqueueDanmaku(text);
      }, delay);
      delay += REPLAY_GAP_MS;
    });
  } catch {
    history.value = [];
  } finally {
    loading.value = false;
  }
}

async function sendBullet() {
  if (!message.value) {
    window.alert("请输入想说的话");
    return;
  }

  try {
    const data = await createBullet(message.value);
    const bullet = data?.bullet;
    if (bullet) {
      seenIds.add(bullet.id);
      const text = bullet.user ? `${bullet.user}: ${bullet.content}` : bullet.content;
      enqueueDanmaku(text);
      message.value = "";
      await loadAllBullets();
      return;
    }
  } catch (e) {
    if (String(e?.message || "").includes("登录")) {
      window.location.href = "/login";
      return;
    }
  }

  window.alert("发送失败");
}

onMounted(() => {
  loadAllBullets();
  pollTimer = window.setInterval(loadAllBullets, POLL_INTERVAL_MS);
});

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer);
  if (queueTimer) window.clearTimeout(queueTimer);
  danmakuQueue.length = 0;
});
</script>
