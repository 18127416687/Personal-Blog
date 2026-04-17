<template>
  <section id="articles" class="page active-page">
    <h2 style="margin-bottom:1rem;"><i class="fa-regular fa-newspaper"></i> 最新随笔</h2>

    <div style="margin-bottom:1.5rem;">
      <div style="display:flex;gap:0.75rem;max-width:500px;">
        <input
          v-model.trim="searchQuery"
          type="text"
          placeholder="搜索文章标题、标签、作者..."
          style="flex:1;padding:0.6rem 1rem;border:1px solid #ddd;border-radius:6px;font-size:0.9rem;outline:none;"
          @keyup.enter="goFirstPage"
        />
        <button
          style="padding:0.6rem 1.25rem;border:none;border-radius:6px;background:#3b82f6;color:white;cursor:pointer;font-weight:500;white-space:nowrap;"
          @click="goFirstPage"
        >
          <i class="fa-solid fa-magnifying-glass"></i> 搜索
        </button>
      </div>
    </div>

    <div id="tagFilterBar" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.5rem;">
      <button :class="chipClass(!activeTag)" @click="setTag(null)">全部</button>
      <button
        v-for="tag in tagList"
        :key="tag"
        :class="chipClass(activeTag === tag)"
        @click="setTag(tag)"
      >
        {{ tag }}
      </button>
    </div>

    <p v-if="error" style="color:#ef4444;margin-bottom:1rem;">{{ error }}</p>

    <div class="blog-grid">
      <article
        v-for="article in pagedArticles"
        :key="article.id"
        class="blog-card"
        style="cursor:pointer;"
        @click="openDetail(article.id)"
      >
        <div class="card-thumb">
          <img
            :src="article.thumbnail || articleFallbackThumb(article.id)"
            alt="文章缩略图"
            @error="onThumbError"
          />
        </div>
        <div class="card-content">
          <div class="article-meta">
            <span class="author"><i class="fa-regular fa-user"></i> {{ article.author }}</span>
            <span class="date">{{ article.date || "-" }}</span>
          </div>
          <h3>{{ article.title }}</h3>
          <p class="excerpt">{{ article.excerpt }}</p>
          <div class="card-footer">
            <div class="stats">
              <span class="stat-item"><i class="fa-regular fa-eye"></i> {{ article.views || 0 }}</span>
              <button class="stat-item stat-btn" @click.stop="doLike(article)">
                <i class="fa-regular fa-heart"></i> {{ article.likes || 0 }}
              </button>
              <button class="stat-item stat-btn" @click.stop="doFavorite(article)">
                <i class="fa-regular fa-bookmark"></i> {{ article.favorites || 0 }}
              </button>
            </div>
            <span class="tag">#{{ article.tag || "未分类" }}</span>
          </div>
        </div>
      </article>

      <p v-if="pagedArticles.length === 0" style="grid-column:1/-1;text-align:center;color:#999;padding:3rem;">
        娌℃湁鎵惧埌鐩稿叧鏂囩珷
      </p>
    </div>

    <div v-if="totalPages > 1" style="display:flex;justify-content:center;align-items:center;gap:0.5rem;margin-top:2rem;flex-wrap:wrap;">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage -= 1">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <button
        v-for="p in pageNumbers"
        :key="p"
        class="page-btn"
        :class="{ active: p === currentPage }"
        @click="currentPage = p"
      >
        {{ p }}
      </button>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage += 1">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { favoriteArticle, likeArticle, listArticles } from "../services/api";

const FALLBACK_THUMB = "/static/img/article-placeholder.svg";

const route = useRoute();
const router = useRouter();

const allArticles = ref([]);
const error = ref("");
const searchQuery = ref("");
const activeTag = ref(route.query.tag ? String(route.query.tag) : null);
const currentPage = ref(1);
const perPage = 9;

const tagList = computed(() => {
  const set = new Set();
  allArticles.value.forEach((a) => {
    if (a.tag) set.add(a.tag);
  });
  return Array.from(set).sort();
});

const filteredArticles = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return allArticles.value.filter((a) => {
    const tagOk = !activeTag.value || a.tag === activeTag.value;
    if (!tagOk) return false;
    if (!q) return true;
    return [a.title, a.tag, a.author, a.excerpt].some((v) => (v || "").toLowerCase().includes(q));
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredArticles.value.length / perPage)));

const pagedArticles = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredArticles.value.slice(start, start + perPage);
});

const pageNumbers = computed(() => {
  const pages = [];
  for (let i = 1; i <= totalPages.value; i += 1) pages.push(i);
  return pages;
});

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

watch([filteredArticles, totalPages], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
});

watch(
  () => route.query.tag,
  (tag) => {
    activeTag.value = tag ? String(tag) : null;
    currentPage.value = 1;
  }
);

async function loadAll() {
  error.value = "";
  try {
    const res = await listArticles({ page: 1, per_page: 500 });
    allArticles.value = Array.isArray(res?.articles) ? res.articles : [];
  } catch (e) {
    error.value = e.message || "鏂囩珷鍔犺浇澶辫触";
  }
}

function setTag(tag) {
  activeTag.value = tag;
  currentPage.value = 1;
  router.replace({
    path: "/articles",
    query: tag ? { tag } : {}
  });
}

function goFirstPage() {
  currentPage.value = 1;
}

function chipClass(active) {
  return {
    chip: true,
    active
  };
}

function openDetail(id) {
  router.push(`/article/${id}`);
}

async function doLike(article) {
  try {
    const res = await likeArticle(article.id);
    article.likes = res.likes;
  } catch (e) {
    error.value = e.message || "鐐硅禐澶辫触";
  }
}

async function doFavorite(article) {
  try {
    const res = await favoriteArticle(article.id);
    article.favorites = res.favorites;
  } catch (e) {
    error.value = e.message || "鏀惰棌澶辫触";
  }
}

onMounted(loadAll);
</script>

<style scoped>
.chip {
  padding: 0.35rem 0.85rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: #fff;
  color: #555;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.chip.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: #fff;
}

.stat-btn {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.page-btn.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>




