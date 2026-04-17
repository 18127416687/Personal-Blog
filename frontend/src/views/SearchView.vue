<template>
  <div class="search-page-root">
    <main class="search-shell">
      <RouterLink class="back-home" to="/">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        返回首页
      </RouterLink>

      <section class="search-panel">
        <div class="clock-wrap" aria-live="polite">
          <p class="live-time">{{ liveTime }}</p>
          <p class="live-date">{{ liveDate }}</p>
        </div>

        <div class="search-area" :class="{ 'is-open': panelOpen }">
          <div class="search-capsule">
            <button
              type="button"
              class="engine-trigger"
              :aria-expanded="panelOpen ? 'true' : 'false'"
              aria-controls="engineList"
              @click.stop="togglePanel"
            >
              <span class="engine-icon" :data-engine="current.iconKey" v-html="engineIcons[current.iconKey] || ''"></span>
              <span>{{ current.name }}</span>
              <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>

            <input
              v-model.trim="keyword"
              type="text"
              class="search-input"
              placeholder="输入关键词开始搜索..."
              autocomplete="off"
              @keydown.enter="doSearch"
            />

            <button type="button" class="search-action" aria-label="搜索" @click="doSearch">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            </button>
          </div>

          <div id="engineList" class="engine-list" role="listbox" aria-label="搜索引擎">
            <button
              v-for="item in engineList"
              :key="item.key"
              type="button"
              class="engine-item"
              :class="{ 'is-active': item.key === currentKey }"
              :aria-selected="item.key === currentKey ? 'true' : 'false'"
              role="option"
              @click="setEngine(item.key)"
            >
              <span class="engine-icon" :data-engine="item.iconKey" v-html="engineIcons[item.iconKey] || ''"></span>
              <span>{{ item.name }}</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";

const engineIcons = {
  baidu:
    '<svg viewBox="0 0 1024 1024" aria-hidden="true"><path d="M184.310244 539.583133c111.396518-23.899253 96.196993-156.995092 92.797099-186.094183-5.499828-44.898596-58.198181-123.296146-129.795943-117.09634C57.214216 244.492357 44.014629 374.688287 44.014629 374.688287c-12.099622 60.198118 29.199087 188.794098 140.295615 164.894846z"></path></svg>',
  bing: '<i class="fa-brands fa-microsoft" aria-hidden="true"></i>',
  google: '<i class="fa-brands fa-google" aria-hidden="true"></i>',
  sogou: '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>',
  "360": '<i class="fa-solid fa-globe" aria-hidden="true"></i>',
  weibo: '<i class="fa-brands fa-weibo" aria-hidden="true"></i>',
  bilibili: '<i class="fa-regular fa-circle-play" aria-hidden="true"></i>',
  github: '<i class="fa-brands fa-github" aria-hidden="true"></i>',
  zhihu: '<i class="fa-brands fa-zhihu" aria-hidden="true"></i>'
};

const engines = {
  baidu: { name: "百度", iconKey: "baidu", url: "https://www.baidu.com/s?wd=" },
  bing: { name: "必应", iconKey: "bing", url: "https://www.bing.com/search?q=" },
  google: { name: "Google", iconKey: "google", url: "https://www.google.com/search?q=" },
  sogou: { name: "搜狗", iconKey: "sogou", url: "https://www.sogou.com/web?query=" },
  "360": { name: "360 搜索", iconKey: "360", url: "https://www.so.com/s?q=" },
  weibo: { name: "微博", iconKey: "weibo", url: "https://s.weibo.com/weibo?q=" },
  bilibili: { name: "BiliBili", iconKey: "bilibili", url: "https://search.bilibili.com/all?keyword=" },
  github: { name: "Github", iconKey: "github", url: "https://github.com/search?q=" },
  zhihu: { name: "知乎", iconKey: "zhihu", url: "https://www.zhihu.com/search?q=" }
};

const engineList = Object.keys(engines).map((key) => ({ key, ...engines[key] }));

const currentKey = ref("baidu");
const panelOpen = ref(false);
const keyword = ref("");
const liveTime = ref("00:00:00");
const liveDate = ref("0000年00月00日 周一");

const current = computed(() => engines[currentKey.value] || engines.baidu);

let timer = null;

function updateClock() {
  const now = new Date();
  liveTime.value = now.toLocaleTimeString("zh-CN", { hour12: false });
  liveDate.value = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function setEngine(key) {
  if (!engines[key]) return;
  currentKey.value = key;
  panelOpen.value = false;
}

function togglePanel() {
  panelOpen.value = !panelOpen.value;
}

function doSearch() {
  if (!keyword.value) return;
  const endpoint = current.value?.url || engines.baidu.url;
  window.open(`${endpoint}${encodeURIComponent(keyword.value)}`, "_blank", "noopener");
}

function onDocClick() {
  panelOpen.value = false;
}

onMounted(() => {
  updateClock();
  timer = window.setInterval(updateClock, 1000);
  document.addEventListener("click", onDocClick);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
  document.removeEventListener("click", onDocClick);
});
</script>

<style scoped>
.search-page-root {
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
}
</style>
