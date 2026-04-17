<template>
  <section class="admin-pro" :class="{ 'theme-dark': isDark }">
    <aside class="sidebar" :class="{ collapsed: navCollapsed }">
      <div class="brand">
        <button class="icon-btn" @click="navCollapsed = !navCollapsed" aria-label="折叠导航">
          <span>{{ navCollapsed ? '>>' : '<<' }}</span>
        </button>
        <div v-if="!navCollapsed" class="brand-text">
          <h1>Content Ops</h1>
          <p>Enterprise Console</p>
        </div>
      </div>

      <nav class="menu">
        <button
          v-for="item in modules"
          :key="item.key"
          class="menu-item"
          :class="{ active: activeModule === item.key }"
          @click="activeModule = item.key"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span v-if="!navCollapsed">{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <div class="main-area">
      <header class="global-head">
        <div class="head-left">
          <h2>管理后台首页</h2>
          <p>{{ session?.data?.username || '-' }} · 内容审核与用户管理中心</p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" @click="toggleTheme">{{ isDark ? '明亮模式' : '暗黑模式' }}</button>
          <button class="btn" @click="refreshAll">刷新数据</button>
        </div>
      </header>

      <div v-if="announcement.enabled && announcement.display_mode === 'marquee' && announcement.content" class="marquee-wrap">
        <div class="marquee-track">
          <span>{{ announcement.content }}</span>
          <span>{{ announcement.content }}</span>
        </div>
      </div>

      <section class="kpi-grid">
        <article class="kpi-card">
          <p>总用户</p>
          <h3>{{ metrics.kpi.users }}</h3>
        </article>
        <article class="kpi-card">
          <p>文章总量</p>
          <h3>{{ metrics.kpi.articles }}</h3>
        </article>
        <article class="kpi-card">
          <p>评论总量</p>
          <h3>{{ metrics.kpi.comments }}</h3>
        </article>
        <article class="kpi-card">
          <p>弹幕总量</p>
          <h3>{{ metrics.kpi.bullets }}</h3>
        </article>
      </section>

      <section class="chart-grid">
        <article class="panel chart-card">
          <header><h3>用户活跃度占比（饼图）</h3></header>
          <div class="pie-wrap">
            <div class="pie" :style="{ background: pieGradient }"></div>
            <div class="legend">
              <p v-for="(item, i) in metrics.pie" :key="item.name">
                <i :style="{ background: pieColors[i % pieColors.length] }"></i>
                {{ item.name }} · {{ item.value }}
              </p>
            </div>
          </div>
        </article>

        <article class="panel chart-card">
          <header><h3>内容发布量（柱状图）</h3></header>
          <div class="bar-chart">
            <div v-for="(v, i) in metrics.bar" :key="`${metrics.labels[i]}-${v}`" class="bar-item">
              <div class="bar" :style="{ height: `${barHeight(v)}%` }"></div>
              <span>{{ metrics.labels[i] }}</span>
            </div>
          </div>
        </article>

        <article class="panel chart-card">
          <header><h3>弹幕评论活跃趋势（折线图）</h3></header>
          <svg class="line-chart" viewBox="0 0 420 180" preserveAspectRatio="none">
            <polyline :points="linePoints" fill="none" stroke="#1e7be7" stroke-width="3" stroke-linecap="round" />
            <circle
              v-for="(p, i) in lineDots"
              :key="`dot-${i}`"
              :cx="p.x"
              :cy="p.y"
              r="4"
              fill="#1e7be7"
            />
          </svg>
          <div class="line-labels">
            <span v-for="label in metrics.labels" :key="label">{{ label }}</span>
          </div>
        </article>
      </section>

      <section v-if="activeModule === 'users'" class="panel">
        <header class="panel-head">
          <h3>用户管理</h3>
          <div class="inline-actions">
            <input v-model.trim="userKeyword" placeholder="搜索用户" />
            <select v-model="userStatus">
              <option value="">全部状态</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
            <button class="btn" @click="resetUserPageAndLoad">筛选</button>
          </div>
        </header>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>用户名</th><th>邮箱</th><th>状态</th><th>封禁至</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in users" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.username }}</td>
                <td>{{ row.email || '-' }}</td>
                <td><span :class="['tag', row.is_active ? 'tag-ok' : 'tag-bad']">{{ row.is_active ? 'active' : 'suspended' }}</span></td>
                <td>{{ formatDate(row.banned_until) }}</td>
                <td>
                  <div class="row-actions">
                    <input
                      v-if="row.is_active"
                      type="number"
                      min="1"
                      v-model.number="banHoursByUser[row.id]"
                      placeholder="小时"
                    />
                    <button v-if="row.is_active" class="btn danger" @click="banUser(row)">封禁</button>
                    <button v-else class="btn" @click="unbanUser(row.id)">一键解封</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pager">
          <button class="btn ghost" :disabled="userPage <= 1" @click="userPage--; loadUsers()">上一页</button>
          <span>第 {{ userPage }} / {{ userPages }} 页（{{ userTotal }} 条）</span>
          <button class="btn ghost" :disabled="userPage >= userPages" @click="userPage++; loadUsers()">下一页</button>
        </footer>
      </section>

      <section v-if="activeModule === 'articles'" class="panel">
        <header class="panel-head">
          <h3>文章管理</h3>
          <div class="inline-actions">
            <input v-model.trim="articleKeyword" placeholder="搜索标题/摘要" />
            <select v-model="articleStatus">
              <option value="">全部状态</option>
              <option value="public">public</option>
              <option value="private">private</option>
              <option value="draft">draft</option>
              <option value="scheduled">scheduled</option>
            </select>
            <button class="btn" @click="resetArticlePageAndLoad">筛选</button>
          </div>
        </header>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>标题</th><th>状态</th><th>作者</th><th>更新</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in articles" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.title }}</td>
                <td>{{ row.status }}</td>
                <td>{{ row.author }}</td>
                <td>{{ formatDate(row.updated_at) }}</td>
                <td><button class="btn danger" @click="deleteArticle(row.id)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pager">
          <button class="btn ghost" :disabled="articlePage <= 1" @click="articlePage--; loadArticles()">上一页</button>
          <span>第 {{ articlePage }} / {{ articlePages }} 页（{{ articleTotal }} 条）</span>
          <button class="btn ghost" :disabled="articlePage >= articlePages" @click="articlePage++; loadArticles()">下一页</button>
        </footer>
      </section>

      <section v-if="activeModule === 'comments'" class="panel">
        <header class="panel-head">
          <h3>评论管理</h3>
          <div class="inline-actions">
            <input v-model.trim="commentKeyword" placeholder="搜索评论内容" />
            <button class="btn" @click="resetCommentPageAndLoad">筛选</button>
          </div>
        </header>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>文章</th><th>用户</th><th>内容</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comments" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.article_id }}</td>
                <td>{{ row.username || row.user_id }}</td>
                <td>{{ row.content }}</td>
                <td><button class="btn danger" @click="deleteComment(row.id)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pager">
          <button class="btn ghost" :disabled="commentPage <= 1" @click="commentPage--; loadComments()">上一页</button>
          <span>第 {{ commentPage }} / {{ commentPages }} 页（{{ commentTotal }} 条）</span>
          <button class="btn ghost" :disabled="commentPage >= commentPages" @click="commentPage++; loadComments()">下一页</button>
        </footer>
      </section>

      <section v-if="activeModule === 'bullets'" class="panel">
        <header class="panel-head">
          <h3>弹幕管理</h3>
          <div class="inline-actions">
            <input v-model.trim="bulletKeyword" placeholder="搜索弹幕内容" />
            <button class="btn" @click="resetBulletPageAndLoad">筛选</button>
          </div>
        </header>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>用户</th><th>内容</th><th>时间</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in bullets" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.username || row.user_id }}</td>
                <td>{{ row.content }}</td>
                <td>{{ formatDate(row.created_at) }}</td>
                <td><button class="btn danger" @click="deleteBullet(row.id)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="pager">
          <button class="btn ghost" :disabled="bulletPage <= 1" @click="bulletPage--; loadBullets()">上一页</button>
          <span>第 {{ bulletPage }} / {{ bulletPages }} 页（{{ bulletTotal }} 条）</span>
          <button class="btn ghost" :disabled="bulletPage >= bulletPages" @click="bulletPage++; loadBullets()">下一页</button>
        </footer>
      </section>

      <section v-if="activeModule === 'announcement'" class="panel">
        <header class="panel-head">
          <h3>全局公告发布</h3>
        </header>
        <div class="announce-form">
          <label>
            公告内容
            <textarea v-model.trim="announcementForm.content" rows="4" placeholder="输入全局公告内容"></textarea>
          </label>
          <div class="announce-row">
            <label>
              展示形式
              <select v-model="announcementForm.display_mode">
                <option value="marquee">顶部滚动条</option>
                <option value="modal">弹窗提示</option>
              </select>
            </label>
            <label class="switcher">
              <input type="checkbox" v-model="announcementForm.enabled" />
              <span>启用公告</span>
            </label>
            <button class="btn" @click="saveAnnouncement">发布公告</button>
          </div>
        </div>
      </section>

      <p v-if="notice" class="notice">{{ notice }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-if="showAnnouncementModal" class="modal-mask" @click.self="showAnnouncementModal = false">
      <div class="modal-card">
        <h4>全局公告</h4>
        <p>{{ announcement.content }}</p>
        <button class="btn" @click="showAnnouncementModal = false">我知道了</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  adminSession,
  batchAdminArticles,
  batchDeleteComments,
  deleteAdminBullet,
  getAdminAnnouncement,
  getAdminDashboardMetrics,
  listAdminArticles,
  listAdminBullets,
  listAdminComments,
  listAdminUsers,
  updateAdminAnnouncement,
  updateUserStatusWithDuration
} from '../services/api';

const router = useRouter();

const modules = [
  { key: 'users', label: '用户管理', icon: 'U' },
  { key: 'articles', label: '文章管理', icon: 'A' },
  { key: 'comments', label: '评论管理', icon: 'C' },
  { key: 'bullets', label: '弹幕管理', icon: 'B' },
  { key: 'announcement', label: '公告中心', icon: 'N' }
];

const activeModule = ref('users');
const navCollapsed = ref(false);
const isDark = ref(false);

const session = ref(null);
const error = ref('');
const notice = ref('');

const metrics = reactive({
  kpi: { users: 0, articles: 0, comments: 0, bullets: 0 },
  labels: [],
  pie: [],
  bar: [],
  line: []
});

const articleKeyword = ref('');
const articleStatus = ref('');
const articlePage = ref(1);
const articlePages = ref(1);
const articleTotal = ref(0);
const articles = ref([]);

const commentKeyword = ref('');
const commentPage = ref(1);
const commentPages = ref(1);
const commentTotal = ref(0);
const comments = ref([]);

const userKeyword = ref('');
const userStatus = ref('');
const userPage = ref(1);
const userPages = ref(1);
const userTotal = ref(0);
const users = ref([]);
const banHoursByUser = reactive({});

const bulletKeyword = ref('');
const bulletPage = ref(1);
const bulletPages = ref(1);
const bulletTotal = ref(0);
const bullets = ref([]);

const announcement = reactive({
  content: '',
  display_mode: 'marquee',
  enabled: false,
  updated_at: ''
});

const announcementForm = reactive({
  content: '',
  display_mode: 'marquee',
  enabled: false
});

const showAnnouncementModal = ref(false);
const pieColors = ['#1e7be7', '#16a085', '#f59f0b'];

function showNotice(msg) {
  notice.value = msg;
  setTimeout(() => {
    if (notice.value === msg) notice.value = '';
  }, 2200);
}

function toggleTheme() {
  isDark.value = !isDark.value;
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function barHeight(value) {
  const max = Math.max(1, ...metrics.bar);
  return Math.max(6, Math.round((value / max) * 100));
}

const pieGradient = computed(() => {
  const values = metrics.pie.map((x) => Number(x.value || 0));
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return '#e5eef9';

  let start = 0;
  const segments = values.map((v, i) => {
    const end = start + (v / total) * 100;
    const segment = `${pieColors[i % pieColors.length]} ${start}% ${end}%`;
    start = end;
    return segment;
  });
  return `conic-gradient(${segments.join(', ')})`;
});

const lineDots = computed(() => {
  const values = metrics.line.length ? metrics.line : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...values);
  const width = 420;
  const height = 180;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((v, i) => ({
    x: Number((i * step).toFixed(2)),
    y: Number((height - (v / max) * (height - 20) - 10).toFixed(2))
  }));
});

const linePoints = computed(() => lineDots.value.map((p) => `${p.x},${p.y}`).join(' '));

async function initSession() {
  try {
    session.value = await adminSession();
  } catch {
    router.push('/admin-login');
  }
}

async function loadMetrics() {
  try {
    const res = await getAdminDashboardMetrics();
    Object.assign(metrics, res.data || {});
  } catch (e) {
    error.value = e.message;
  }
}

async function loadAnnouncement() {
  try {
    const res = await getAdminAnnouncement();
    Object.assign(announcement, res.data || {});
    Object.assign(announcementForm, {
      content: announcement.content,
      display_mode: announcement.display_mode,
      enabled: announcement.enabled
    });

    showAnnouncementModal.value = !!(
      announcement.enabled &&
      announcement.display_mode === 'modal' &&
      announcement.content
    );
  } catch (e) {
    error.value = e.message;
  }
}

async function saveAnnouncement() {
  try {
    error.value = '';
    await updateAdminAnnouncement({ ...announcementForm });
    await loadAnnouncement();
    showNotice('公告发布成功');
  } catch (e) {
    error.value = e.message;
  }
}

async function loadArticles() {
  try {
    error.value = '';
    const res = await listAdminArticles({
      page: articlePage.value,
      per_page: 10,
      keyword: articleKeyword.value,
      status: articleStatus.value
    });
    articles.value = res.data.items;
    articleTotal.value = res.data.pagination.total;
    articlePages.value = Math.max(1, res.data.pagination.total_pages);
  } catch (e) {
    error.value = e.message;
  }
}

async function loadComments() {
  try {
    error.value = '';
    const res = await listAdminComments({
      page: commentPage.value,
      per_page: 10,
      keyword: commentKeyword.value
    });
    comments.value = res.data.items;
    commentTotal.value = res.data.pagination.total;
    commentPages.value = Math.max(1, res.data.pagination.total_pages);
  } catch (e) {
    error.value = e.message;
  }
}

async function loadUsers() {
  try {
    error.value = '';
    const res = await listAdminUsers({
      page: userPage.value,
      per_page: 10,
      keyword: userKeyword.value,
      status: userStatus.value
    });
    users.value = res.data.items;
    userTotal.value = res.data.pagination.total;
    userPages.value = Math.max(1, res.data.pagination.total_pages);
  } catch (e) {
    error.value = e.message;
  }
}

async function loadBullets() {
  try {
    error.value = '';
    const res = await listAdminBullets({
      page: bulletPage.value,
      per_page: 10,
      keyword: bulletKeyword.value
    });
    bullets.value = res.data.items;
    bulletTotal.value = res.data.pagination.total;
    bulletPages.value = Math.max(1, res.data.pagination.total_pages);
  } catch (e) {
    error.value = e.message;
  }
}

async function deleteArticle(id) {
  if (!window.confirm('确认删除该文章？')) return;
  try {
    await batchAdminArticles({ action: 'delete', ids: [id] });
    await loadArticles();
    await loadMetrics();
    showNotice('文章已删除');
  } catch (e) {
    error.value = e.message;
  }
}

async function deleteComment(id) {
  if (!window.confirm('确认删除该评论？')) return;
  try {
    await batchDeleteComments({ ids: [id] });
    await loadComments();
    await loadMetrics();
    showNotice('评论已删除');
  } catch (e) {
    error.value = e.message;
  }
}

async function deleteBullet(id) {
  if (!window.confirm('确认删除该弹幕？')) return;
  try {
    await deleteAdminBullet(id);
    await loadBullets();
    await loadMetrics();
    showNotice('弹幕已删除');
  } catch (e) {
    error.value = e.message;
  }
}

async function banUser(row) {
  if (!window.confirm('确认封禁该用户？')) return;
  try {
    await updateUserStatusWithDuration(row.id, {
      status: 'suspended',
      ban_hours: banHoursByUser[row.id] || undefined
    });
    await loadUsers();
    showNotice('用户已封禁');
  } catch (e) {
    error.value = e.message;
  }
}

async function unbanUser(userId) {
  if (!window.confirm('确认一键解封该用户？')) return;
  try {
    await updateUserStatusWithDuration(userId, { status: 'active' });
    await loadUsers();
    showNotice('用户已解封');
  } catch (e) {
    error.value = e.message;
  }
}

function resetArticlePageAndLoad() {
  articlePage.value = 1;
  loadArticles();
}

function resetCommentPageAndLoad() {
  commentPage.value = 1;
  loadComments();
}

function resetUserPageAndLoad() {
  userPage.value = 1;
  loadUsers();
}

function resetBulletPageAndLoad() {
  bulletPage.value = 1;
  loadBullets();
}

async function refreshAll() {
  await Promise.all([
    loadMetrics(),
    loadArticles(),
    loadComments(),
    loadUsers(),
    loadBullets(),
    loadAnnouncement()
  ]);
  showNotice('数据已刷新');
}

onMounted(async () => {
  await initSession();
  await refreshAll();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Noto+Sans+SC:wght@400;500;700&display=swap');

.admin-pro {
  --bg: #f3f7fc;
  --card: #ffffff;
  --text: #19314f;
  --muted: #6f859f;
  --line: #d9e4f2;
  --brand: #1e7be7;
  --brand-soft: #edf4ff;
  --danger: #d63f45;
  --ok: #1c9d67;

  min-height: 100vh;
  background: radial-gradient(circle at 10% -20%, #dceeff 0%, var(--bg) 46%);
  display: grid;
  grid-template-columns: 260px 1fr;
  color: var(--text);
  font-family: 'Noto Sans SC', sans-serif;
}

.theme-dark {
  --bg: #111826;
  --card: #1c2637;
  --text: #e8eef8;
  --muted: #a8b6cc;
  --line: #2e3b50;
  --brand: #4ea2ff;
  --brand-soft: #1d3252;
  --danger: #ff767d;
  --ok: #3ac989;
  background: radial-gradient(circle at 10% -20%, #203554 0%, var(--bg) 46%);
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 1px solid var(--line);
  background: color-mix(in oklab, var(--card) 94%, white);
  padding: 20px 14px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 20px;
}

.sidebar.collapsed {
  width: 86px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand h1 {
  margin: 0;
  font: 800 18px/1.2 'Manrope', sans-serif;
}

.brand p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--card);
  cursor: pointer;
  color: var(--text);
}

.menu {
  display: grid;
  gap: 10px;
  align-content: start;
}

.menu-item {
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  border-radius: 14px;
  padding: 10px 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.menu-item.active {
  background: var(--brand-soft);
  border-color: color-mix(in oklab, var(--brand) 24%, var(--line));
  color: var(--brand);
}

.menu-icon {
  width: 20px;
  text-align: center;
  font: 700 14px/1 'Manrope', sans-serif;
}

.main-area {
  padding: 22px;
  display: grid;
  gap: 16px;
}

.global-head {
  border-radius: 18px;
  background: var(--card);
  border: 1px solid var(--line);
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.global-head h2 {
  margin: 0;
  font: 800 23px/1.3 'Manrope', sans-serif;
}

.global-head p {
  margin: 4px 0 0;
  color: var(--muted);
}

.head-actions {
  display: flex;
  gap: 10px;
}

.btn {
  border: 1px solid color-mix(in oklab, var(--brand) 26%, var(--line));
  border-radius: 12px;
  padding: 8px 14px;
  font-weight: 600;
  color: #fff;
  background: var(--brand);
  cursor: pointer;
}

.btn.ghost {
  color: var(--text);
  background: var(--card);
  border-color: var(--line);
}

.btn.danger {
  background: var(--danger);
  border-color: color-mix(in oklab, var(--danger) 24%, var(--line));
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.marquee-wrap {
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: color-mix(in oklab, var(--brand-soft) 88%, var(--card));
  padding: 10px 0;
}

.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee 18s linear infinite;
}

.marquee-track span {
  margin-right: 60px;
  color: var(--brand);
  font-weight: 600;
}

@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.kpi-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-card {
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--card);
  padding: 14px;
}

.kpi-card p {
  margin: 0;
  color: var(--muted);
}

.kpi-card h3 {
  margin: 8px 0 0;
  font: 800 28px/1.2 'Manrope', sans-serif;
}

.chart-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.panel {
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--card);
  padding: 14px;
}

.chart-card header h3,
.panel-head h3 {
  margin: 0;
  font: 700 16px/1.3 'Manrope', sans-serif;
}

.pie-wrap {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  align-items: center;
}

.pie {
  width: 130px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 10px solid color-mix(in oklab, var(--card) 88%, var(--line));
}

.legend p {
  margin: 0 0 8px;
  color: var(--muted);
  display: flex;
  gap: 8px;
  align-items: center;
}

.legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.bar-chart {
  margin-top: 14px;
  height: 150px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  align-items: end;
}

.bar-item {
  height: 100%;
  display: grid;
  gap: 6px;
  justify-items: center;
  align-content: end;
}

.bar {
  width: 18px;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(180deg, #6cb8ff 0%, #1e7be7 100%);
}

.bar-item span {
  font-size: 11px;
  color: var(--muted);
}

.line-chart {
  margin-top: 10px;
  width: 100%;
  height: 150px;
  border-radius: 12px;
  background: color-mix(in oklab, var(--brand-soft) 35%, var(--card));
}

.line-labels {
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  color: var(--muted);
  font-size: 11px;
  text-align: center;
}

.panel-head {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.inline-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

input,
select,
textarea {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  color: var(--text);
  padding: 8px 10px;
  font: 500 14px/1.35 'Noto Sans SC', sans-serif;
}

textarea {
  width: 100%;
  resize: vertical;
  min-height: 86px;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}

th {
  color: var(--muted);
  font-weight: 600;
}

.tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
}

.tag-ok {
  color: var(--ok);
  background: color-mix(in oklab, var(--ok) 16%, var(--card));
}

.tag-bad {
  color: var(--danger);
  background: color-mix(in oklab, var(--danger) 16%, var(--card));
}

.row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.row-actions input {
  width: 70px;
}

.pager {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.announce-form {
  display: grid;
  gap: 12px;
}

.announce-form label {
  display: grid;
  gap: 6px;
  color: var(--muted);
  font-size: 14px;
}

.announce-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.switcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.notice {
  color: var(--ok);
}

.error {
  color: var(--danger);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.36);
  display: grid;
  place-items: center;
  z-index: 10;
}

.modal-card {
  width: min(520px, calc(100vw - 24px));
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--card);
  padding: 18px;
}

.modal-card h4 {
  margin: 0 0 8px;
  font: 700 18px/1.2 'Manrope', sans-serif;
}

.modal-card p {
  margin: 0 0 14px;
  color: var(--muted);
}

@media (max-width: 1080px) {
  .admin-pro {
    grid-template-columns: 86px 1fr;
  }

  .sidebar {
    width: 86px;
  }

  .brand-text,
  .menu-item span:not(.menu-icon) {
    display: none;
  }

  .kpi-grid,
  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .main-area {
    padding: 12px;
  }

  .global-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .pager {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
