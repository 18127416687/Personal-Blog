<template>
  <div class="home-layout">
    <aside class="home-sidebar">
      <div class="profile-card">
        <div class="profile-avatar">
          <img :src="profile.avatar" alt="头像" />
        </div>
        <h3 class="profile-name">{{ profile.name }}</h3>
        <p class="profile-bio">{{ profile.bio }}</p>
        <div class="profile-stats">
          <div class="profile-stat">
            <span class="profile-stat-num">{{ latest.length }}</span>
            <span class="profile-stat-label">近期文章</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-num">{{ tags.length }}</span>
            <span class="profile-stat-label">标签</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-num">{{ totalViews }}</span>
            <span class="profile-stat-label">浏览</span>
          </div>
        </div>
      </div>

      <div class="nav-card">
        <h4><i class="fa-solid fa-compass"></i> 快捷导航</h4>
        <div class="quick-nav-grid">
          <RouterLink to="/articles" class="quick-nav-item">
            <i class="fa-regular fa-newspaper"></i>
            <span>文章</span>
          </RouterLink>
          <RouterLink to="/gallery" class="quick-nav-item">
            <i class="fa-regular fa-images"></i>
            <span>相册</span>
          </RouterLink>
          <RouterLink to="/treehole" class="quick-nav-item">
            <i class="fa-regular fa-comment-dots"></i>
            <span>树洞</span>
          </RouterLink>
          <RouterLink to="/search" class="quick-nav-item">
            <i class="fa-solid fa-magnifying-glass"></i>
            <span>搜索</span>
          </RouterLink>
          <RouterLink to="/profile" class="quick-nav-item">
            <i class="fa-regular fa-user"></i>
            <span>资料</span>
          </RouterLink>
          <RouterLink to="/editor" class="quick-nav-item">
            <i class="fa-regular fa-pen-to-square"></i>
            <span>写作</span>
          </RouterLink>
        </div>
      </div>
    </aside>

    <div class="home-content">
      <div class="weibo-hot-card" id="weiboHotCard">
        <div class="weibo-hot-header">
          <h4><i class="fa-brands fa-weibo"></i> 微博热搜</h4>
          <span class="refresh-timer">{{ refreshText }}</span>
        </div>
        <div class="weibo-hot-list" id="weiboHotList">
          <p v-if="weiboError" class="muted-tip">微博热搜加载失败</p>
          <p v-else-if="weiboList.length === 0" class="muted-tip">暂无热搜</p>
          <a
            v-for="(item, index) in weiboList"
            :key="`${item.word}-${index}`"
            class="weibo-hot-item"
            :href="`https://s.weibo.com/weibo?q=${encodeURIComponent(item.raw_word || item.word)}&from=page_hot`"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="weibo-hot-rank" :class="rankClass(index)">{{ index + 1 }}</span>
            <span class="weibo-hot-word">{{ item.word }}</span>
            <span v-if="item.label" class="weibo-hot-label">{{ item.label }}</span>
          </a>
        </div>
      </div>

      <div class="tags-card">
        <h4><i class="fa-solid fa-tags"></i> 热门标签</h4>
        <div class="tag-cloud" id="popularTags">
          <p v-if="tagError" class="muted-tip">标签加载失败</p>
          <p v-else-if="tags.length === 0" class="muted-tip">暂无标签</p>
          <RouterLink
            v-for="item in tags"
            :key="item.tag"
            :to="`/articles?tag=${encodeURIComponent(item.tag)}`"
            class="tag-item"
          >
            #{{ item.tag }}
          </RouterLink>
        </div>
      </div>

      <div class="latest-articles-card">
        <div class="card-header">
          <h4><i class="fa-regular fa-clock"></i> 最新文章</h4>
          <RouterLink to="/articles" class="view-all">
            查看全部 <i class="fa-solid fa-arrow-right"></i>
          </RouterLink>
        </div>
        <div class="latest-articles-list" id="latestArticles">
          <p v-if="articleError" class="muted-tip">文章加载失败</p>
          <p v-else-if="latest.length === 0" class="muted-tip">暂无文章</p>
          <RouterLink
            v-for="article in latest"
            :key="article.id"
            :to="`/article/${article.id}`"
            class="latest-article-item"
          >
            <div class="latest-article-thumb">
              <img
                :src="article.thumbnail || articleFallbackThumb(article.id)"
                alt="缩略图"
                @error="onThumbError"
              />
            </div>
            <div class="latest-article-info">
              <h5>{{ article.title }}</h5>
              <p class="latest-article-excerpt">{{ article.excerpt }}</p>
              <div class="latest-article-meta">
                <span><i class="fa-regular fa-calendar"></i> {{ article.date || "-" }}</span>
                <span><i class="fa-regular fa-eye"></i> {{ article.views || 0 }}</span>
                <span><i class="fa-regular fa-heart"></i> {{ article.likes || 0 }}</span>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { currentUser, getPopularTags, getWeiboHot, listArticles } from "../services/api";
const FALLBACK_THUMB = "/static/img/article-placeholder.svg";

const latest = ref([]);
const tags = ref([]);
const weiboList = ref([]);
const articleError = ref("");
const tagError = ref("");
const weiboError = ref("");
const profile = ref({
  name: "程序员逗号",
  bio: "热爱技术，热爱生活。用代码记录成长，用文字分享经验。",
  avatar: "https://picsum.photos/200/200?random=999"
});

const refreshText = ref("热搜每 15 分钟自动刷新");
let refreshTimer = null;

const totalViews = computed(() => latest.value.reduce((sum, item) => sum + (item.views || 0), 0));

function articleFallbackThumb(id) {
  return `${FALLBACK_THUMB}?id=${id || "default"}`;
}

function onThumbError(event) {
  const img = event?.target;
  if (!img) return;
  if (img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.src = articleFallbackThumb("fallback");
}

function rankClass(index) {
  if (index === 0) return "top-1";
  if (index === 1) return "top-2";
  if (index === 2) return "top-3";
  return "other";
}

async function loadProfile() {
  try {
    const user = await currentUser();
    if (!user?.username) return;
    profile.value = {
      name: user.nickname || user.username,
      bio: user.bio || profile.value.bio,
      avatar: user.avatar || profile.value.avatar
    };
  } catch {
    // keep default profile card
  }
}

async function loadArticles() {
  articleError.value = "";
  try {
    const res = await listArticles({ page: 1, per_page: 4 });
    latest.value = Array.isArray(res?.articles) ? res.articles : [];
  } catch (e) {
    articleError.value = e.message || "加载失败";
  }
}

async function loadTags() {
  tagError.value = "";
  try {
    const res = await getPopularTags();
    tags.value = Array.isArray(res) ? res : [];
  } catch (e) {
    tagError.value = e.message || "加载失败";
  }
}

async function loadWeibo() {
  weiboError.value = "";
  try {
    const res = await getWeiboHot();
    weiboList.value = Array.isArray(res) ? res.slice(0, 15) : [];
  } catch (e) {
    weiboError.value = e.message || "加载失败";
  }
}

onMounted(() => {
  loadProfile();
  loadArticles();
  loadTags();
  loadWeibo();
  refreshTimer = setInterval(loadWeibo, 15 * 60 * 1000);
});

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.muted-tip {
  color: #94a3b8;
  padding: 0.75rem 0;
}
</style>
