<template>
  <section class="admin-shell" :class="{ dark: isDark }">
    <el-container class="admin-layout">
      <aside v-if="!isMobile" class="admin-sidebar" :class="{ collapsed: navCollapsed }">
        <div class="brand">
          <el-button class="collapse-btn" text @click="navCollapsed = !navCollapsed">
            {{ navCollapsed ? '>>' : '<<' }}
          </el-button>
          <div v-if="!navCollapsed">
            <h2>Content Ops</h2>
            <p>Enterprise Console</p>
          </div>
        </div>

        <div class="menu-list">
          <button
            v-for="item in modules"
            :key="item.key"
            class="menu-btn"
            :class="{ active: activeModule === item.key }"
            @click="activeModule = item.key"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <span v-if="!navCollapsed">{{ item.label }}</span>
          </button>
        </div>
      </aside>

      <el-drawer
        v-model="mobileDrawer"
        direction="ltr"
        size="240px"
        :with-header="false"
      >
        <div class="menu-list mobile">
          <button
            v-for="item in modules"
            :key="`m-${item.key}`"
            class="menu-btn"
            :class="{ active: activeModule === item.key }"
            @click="activeModule = item.key; mobileDrawer = false"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </el-drawer>

      <el-container class="admin-content-wrap">
        <el-header class="admin-topbar">
          <div>
            <h1>管理后台首页</h1>
            <p>{{ session?.data?.username || '-' }} · 内容审核与用户管理中心</p>
          </div>
          <div class="top-actions">
            <el-button v-if="isMobile" @click="mobileDrawer = true">菜单</el-button>
            <el-button @click="toggleTheme">{{ isDark ? '明亮模式' : '暗黑模式' }}</el-button>
            <el-button type="primary" @click="refreshAll">刷新数据</el-button>
          </div>
        </el-header>

        <el-main class="admin-main">
          <el-row :gutter="12" class="kpi-row">
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card class="kpi-card"><p>总用户</p><h3>{{ metrics.kpi.users }}</h3></el-card>
            </el-col>
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card class="kpi-card"><p>文章总量</p><h3>{{ metrics.kpi.articles }}</h3></el-card>
            </el-col>
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card class="kpi-card"><p>评论总量</p><h3>{{ metrics.kpi.comments }}</h3></el-card>
            </el-col>
            <el-col :xs="12" :sm="12" :md="6" :lg="6">
              <el-card class="kpi-card"><p>弹幕总量</p><h3>{{ metrics.kpi.bullets }}</h3></el-card>
            </el-col>
          </el-row>

          <el-row :gutter="12" class="chart-row">
            <el-col :xs="24" :md="12" :lg="8">
              <el-card>
                <template #header>用户活跃度占比（饼图）</template>
                <div class="chart-box"><v-chart :option="pieOption" autoresize /></div>
              </el-card>
            </el-col>
            <el-col :xs="24" :md="12" :lg="8">
              <el-card>
                <template #header>内容发布量（柱状图）</template>
                <div class="chart-box"><v-chart :option="barOption" autoresize /></div>
              </el-card>
            </el-col>
            <el-col :xs="24" :md="24" :lg="8">
              <el-card>
                <template #header>弹幕评论活跃趋势（折线图）</template>
                <div class="chart-box"><v-chart :option="lineOption" autoresize /></div>
              </el-card>
            </el-col>
          </el-row>

          <el-card v-if="activeModule === 'users'" class="module-card">
            <template #header>
              <div class="module-head">
                <span>用户管理</span>
                <form class="filter-form" @submit.prevent="resetUserPageAndLoad">
                  <el-input v-model.trim="userKeyword" clearable placeholder="搜索用户" style="width: 180px" />
                  <el-select v-model="userStatus" placeholder="状态" style="width: 130px">
                    <el-option label="全部状态" value="" />
                    <el-option label="active" value="active" />
                    <el-option label="suspended" value="suspended" />
                  </el-select>
                  <el-button type="primary" native-type="submit">筛选</el-button>
                </form>
              </div>
            </template>

            <div class="table-container">
              <el-table :data="users" border stripe class="admin-table">
                <el-table-column prop="id" label="ID" width="70" fixed="left" />
                <el-table-column prop="username" label="用户名" min-width="140" />
                <el-table-column prop="email" label="邮箱" min-width="180">
                  <template #default="scope">{{ scope.row.email || '-' }}</template>
                </el-table-column>
                <el-table-column label="状态" min-width="110">
                  <template #default="scope">
                    <el-tag :type="scope.row.is_active ? 'success' : 'danger'">{{ scope.row.is_active ? 'active' : 'suspended' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="封禁至" min-width="180">
                  <template #default="scope">{{ formatDate(scope.row.banned_until) }}</template>
                </el-table-column>
                <el-table-column label="操作" min-width="210" fixed="right">
                  <template #default="scope">
                    <div class="action-group">
                      <el-input-number
                        v-if="scope.row.is_active"
                        v-model="banHoursByUser[scope.row.id]"
                        :min="1"
                        :step="1"
                        size="small"
                      />
                      <el-button
                        v-if="scope.row.is_active"
                        type="danger"
                        size="small"
                        @click="banUser(scope.row)"
                      >封禁</el-button>
                      <el-button v-else size="small" type="primary" @click="unbanUser(scope.row.id)">一键解封</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="pager-wrap">
              <el-pagination
                background
                layout="prev, pager, next, total"
                :total="userTotal"
                :page-size="10"
                :current-page="userPage"
                @current-change="onUserPageChange"
              />
            </div>
          </el-card>

          <el-card v-if="activeModule === 'articles'" class="module-card">
            <template #header>
              <div class="module-head">
                <span>文章管理</span>
                <form class="filter-form" @submit.prevent="resetArticlePageAndLoad">
                  <el-input v-model.trim="articleKeyword" clearable placeholder="搜索标题/摘要" style="width: 200px" />
                  <el-select v-model="articleStatus" placeholder="状态" style="width: 140px">
                    <el-option label="全部状态" value="" />
                    <el-option label="public" value="public" />
                    <el-option label="private" value="private" />
                    <el-option label="draft" value="draft" />
                    <el-option label="scheduled" value="scheduled" />
                  </el-select>
                  <el-button type="primary" native-type="submit">筛选</el-button>
                </form>
              </div>
            </template>

            <div class="table-container">
              <el-table :data="articles" border stripe class="admin-table">
                <el-table-column prop="id" label="ID" width="70" fixed="left" />
                <el-table-column prop="title" label="标题" min-width="220" />
                <el-table-column prop="status" label="状态" min-width="110" />
                <el-table-column prop="author" label="作者" min-width="130" />
                <el-table-column label="更新" min-width="180">
                  <template #default="scope">{{ formatDate(scope.row.updated_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" min-width="100" fixed="right">
                  <template #default="scope">
                    <el-button type="danger" size="small" @click="deleteArticle(scope.row.id)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="pager-wrap">
              <el-pagination
                background
                layout="prev, pager, next, total"
                :total="articleTotal"
                :page-size="10"
                :current-page="articlePage"
                @current-change="onArticlePageChange"
              />
            </div>
          </el-card>

          <el-card v-if="activeModule === 'comments'" class="module-card">
            <template #header>
              <div class="module-head">
                <span>评论管理</span>
                <form class="filter-form" @submit.prevent="resetCommentPageAndLoad">
                  <el-input v-model.trim="commentKeyword" clearable placeholder="搜索评论内容" style="width: 220px" />
                  <el-button type="primary" native-type="submit">筛选</el-button>
                </form>
              </div>
            </template>

            <div class="table-container">
              <el-table :data="comments" border stripe class="admin-table">
                <el-table-column prop="id" label="ID" width="70" fixed="left" />
                <el-table-column prop="article_id" label="文章" min-width="90" />
                <el-table-column label="用户" min-width="150">
                  <template #default="scope">{{ scope.row.username || scope.row.user_id }}</template>
                </el-table-column>
                <el-table-column prop="content" label="内容" min-width="280" />
                <el-table-column label="操作" min-width="100" fixed="right">
                  <template #default="scope">
                    <el-button type="danger" size="small" @click="deleteComment(scope.row.id)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="pager-wrap">
              <el-pagination
                background
                layout="prev, pager, next, total"
                :total="commentTotal"
                :page-size="10"
                :current-page="commentPage"
                @current-change="onCommentPageChange"
              />
            </div>
          </el-card>

          <el-card v-if="activeModule === 'bullets'" class="module-card">
            <template #header>
              <div class="module-head">
                <span>弹幕管理</span>
                <form class="filter-form" @submit.prevent="resetBulletPageAndLoad">
                  <el-input v-model.trim="bulletKeyword" clearable placeholder="搜索弹幕内容" style="width: 220px" />
                  <el-button type="primary" native-type="submit">筛选</el-button>
                </form>
              </div>
            </template>

            <div class="table-container">
              <el-table :data="bullets" border stripe class="admin-table">
                <el-table-column prop="id" label="ID" width="70" fixed="left" />
                <el-table-column label="用户" min-width="160">
                  <template #default="scope">{{ scope.row.username || scope.row.user_id }}</template>
                </el-table-column>
                <el-table-column prop="content" label="内容" min-width="280" />
                <el-table-column label="时间" min-width="180">
                  <template #default="scope">{{ formatDate(scope.row.created_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" min-width="100" fixed="right">
                  <template #default="scope">
                    <el-button type="danger" size="small" @click="deleteBullet(scope.row.id)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="pager-wrap">
              <el-pagination
                background
                layout="prev, pager, next, total"
                :total="bulletTotal"
                :page-size="10"
                :current-page="bulletPage"
                @current-change="onBulletPageChange"
              />
            </div>
          </el-card>

          <el-card v-if="activeModule === 'announcement'" class="module-card">
            <template #header>全局公告发布</template>
            <el-form label-position="top" class="announce-form">
              <el-form-item label="公告内容">
                <el-input v-model.trim="announcementForm.content" type="textarea" :rows="4" placeholder="输入全局公告内容" />
              </el-form-item>
              <div class="announce-actions">
                <el-select v-model="announcementForm.display_mode" style="width: 170px">
                  <el-option value="marquee" label="顶部滚动条" />
                  <el-option value="modal" label="弹窗提示" />
                </el-select>
                <el-switch v-model="announcementForm.enabled" active-text="启用公告" />
                <el-button type="primary" @click="saveAnnouncement">发布公告</el-button>
              </div>
            </el-form>
          </el-card>

          <el-alert v-if="error" type="error" :title="error" show-icon :closable="false" />
        </el-main>
      </el-container>
    </el-container>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
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

use([CanvasRenderer, PieChart, BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent]);

const router = useRouter();
const ADMIN_THEME_KEY = 'admin_dashboard_theme';

const modules = [
  { key: 'users', label: '用户管理', icon: 'U' },
  { key: 'articles', label: '文章管理', icon: 'A' },
  { key: 'comments', label: '评论管理', icon: 'C' },
  { key: 'bullets', label: '弹幕管理', icon: 'B' },
  { key: 'announcement', label: '公告中心', icon: 'N' }
];

const activeModule = ref('users');
const navCollapsed = ref(false);
const mobileDrawer = ref(false);
const isDark = ref(false);
const isMobile = ref(false);

const session = ref(null);
const error = ref('');

const metrics = reactive({
  kpi: { users: 0, articles: 0, comments: 0, bullets: 0 },
  labels: [],
  pie: [],
  bar: [],
  line: [],
  danmu: []
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

const announcementForm = reactive({
  content: '',
  display_mode: 'marquee',
  enabled: false
});

const pieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['36%', '70%'],
      data: (metrics.pie || []).map((item) => ({ name: item.name, value: item.value || 0 })),
      label: { formatter: '{b}' }
    }
  ]
}));

const barOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 30, right: 10, top: 10, bottom: 30 },
  xAxis: {
    type: 'category',
    data: metrics.labels,
    axisLabel: { interval: 0, fontSize: 10 }
  },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'bar',
      data: metrics.bar,
      barMaxWidth: 26,
      itemStyle: { color: '#2d79e6', borderRadius: [6, 6, 0, 0] }
    }
  ]
}));

const lineOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 30, right: 10, top: 10, bottom: 30 },
  xAxis: {
    type: 'category',
    data: metrics.labels,
    axisLabel: { interval: 0, fontSize: 10 }
  },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'line',
      smooth: true,
      data: metrics.line,
      lineStyle: { color: '#2d79e6', width: 3 },
      itemStyle: { color: '#2d79e6' },
      areaStyle: { color: 'rgba(45, 121, 230, 0.16)' }
    }
  ]
}));

function syncViewport() {
  isMobile.value = window.innerWidth <= 1080;
  if (!isMobile.value) {
    mobileDrawer.value = false;
  }
}

function toggleTheme() {
  isDark.value = !isDark.value;
}

function applyThemeClass() {
  document.documentElement.classList.toggle('dark', isDark.value);
  try {
    window.localStorage.setItem(ADMIN_THEME_KEY, isDark.value ? 'dark' : 'light');
  } catch {
    // ignore storage errors
  }
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function toastSuccess(msg) {
  ElMessage.success(msg);
}

function toastError(msg) {
  ElMessage.error(msg || '操作失败');
}

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
    Object.assign(announcementForm, {
      content: res?.data?.content || '',
      display_mode: res?.data?.display_mode || 'marquee',
      enabled: !!res?.data?.enabled
    });
  } catch (e) {
    error.value = e.message;
  }
}

async function saveAnnouncement() {
  try {
    error.value = '';
    await updateAdminAnnouncement({ ...announcementForm });
    await loadAnnouncement();
    toastSuccess('公告发布成功');
  } catch (e) {
    error.value = e.message;
    toastError(e.message);
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
    toastSuccess('文章已删除');
  } catch (e) {
    toastError(e.message);
  }
}

async function deleteComment(id) {
  if (!window.confirm('确认删除该评论？')) return;
  try {
    await batchDeleteComments({ ids: [id] });
    await loadComments();
    await loadMetrics();
    toastSuccess('评论已删除');
  } catch (e) {
    toastError(e.message);
  }
}

async function deleteBullet(id) {
  if (!window.confirm('确认删除该弹幕？')) return;
  try {
    await deleteAdminBullet(id);
    await loadBullets();
    await loadMetrics();
    toastSuccess('弹幕已删除');
  } catch (e) {
    toastError(e.message);
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
    toastSuccess('用户已封禁');
  } catch (e) {
    toastError(e.message);
  }
}

async function unbanUser(userId) {
  if (!window.confirm('确认一键解封该用户？')) return;
  try {
    await updateUserStatusWithDuration(userId, { status: 'active' });
    await loadUsers();
    toastSuccess('用户已解封');
  } catch (e) {
    toastError(e.message);
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

function onUserPageChange(page) {
  userPage.value = page;
  loadUsers();
}

function onArticlePageChange(page) {
  articlePage.value = page;
  loadArticles();
}

function onCommentPageChange(page) {
  commentPage.value = page;
  loadComments();
}

function onBulletPageChange(page) {
  bulletPage.value = page;
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
  toastSuccess('数据已刷新');
}

onMounted(async () => {
  try {
    const saved = window.localStorage.getItem(ADMIN_THEME_KEY);
    isDark.value = saved === 'dark';
  } catch {
    isDark.value = false;
  }
  applyThemeClass();
  syncViewport();
  window.addEventListener('resize', syncViewport);
  await initSession();
  await refreshAll();
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove('dark');
  window.removeEventListener('resize', syncViewport);
});

watch(isDark, () => {
  applyThemeClass();
});
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  width: 100%;
  background: #f3f6fb;
  color: #19314f;
}

.admin-shell.dark {
  --el-bg-color: #1d2738;
  --el-bg-color-page: #111826;
  --el-fill-color-blank: #1d2738;
  --el-border-color: #34455f;
  --el-text-color-primary: #e8f0ff;
  --el-text-color-regular: #bfd0ea;
  --el-mask-color: rgba(3, 8, 18, 0.78);
  background: #111826;
  color: #e8f0ff;
}

.admin-shell.dark :deep(input),
.admin-shell.dark :deep(textarea),
.admin-shell.dark :deep(select) {
  background-color: #243247 !important;
  color: #ecf3ff !important;
}

.admin-shell.dark :deep(.el-card),
.admin-shell.dark :deep(.el-drawer),
.admin-shell.dark :deep(.el-dialog),
.admin-shell.dark :deep(.el-input__wrapper),
.admin-shell.dark :deep(.el-textarea__inner),
.admin-shell.dark :deep(.el-select__wrapper),
.admin-shell.dark :deep(.el-table),
.admin-shell.dark :deep(.el-table__inner-wrapper),
.admin-shell.dark :deep(.el-table th.el-table__cell),
.admin-shell.dark :deep(.el-table tr),
.admin-shell.dark :deep(.el-table td.el-table__cell),
.admin-shell.dark :deep(.el-pagination button),
.admin-shell.dark :deep(.el-pagination .el-pager li) {
  background-color: #1d2a3f !important;
  color: #e8f0ff !important;
  border-color: #355070 !important;
}

.admin-shell.dark :deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background-color: #23344d !important;
}

.admin-shell.dark :deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: #2a3d5a !important;
}

.admin-layout {
  min-height: 100vh;
}

.admin-sidebar {
  width: 256px;
  border-right: 1px solid #d7e2f0;
  background: #fff;
  padding: 14px;
}

.admin-sidebar.collapsed {
  width: 88px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.brand h2 {
  margin: 0;
  font-size: 20px;
}

.brand p {
  margin: 0;
  color: #7c8fa9;
  font-size: 12px;
}

.collapse-btn {
  border: 1px solid #d7e2f0;
  border-radius: 10px;
}

.menu-list {
  display: grid;
  gap: 8px;
}

.menu-btn {
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-btn.active {
  color: #2b79e6;
  border-color: #9fc3f7;
  background: #edf5ff;
}

.menu-icon {
  width: 18px;
}

.admin-content-wrap {
  min-width: 0;
}

.admin-topbar {
  height: auto;
  padding: 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.admin-topbar h1 {
  margin: 0;
  font-size: 28px;
}

.admin-topbar p {
  margin: 4px 0 0;
  color: #6b84a3;
}

.top-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-main {
  padding: 0 18px 18px;
  display: grid;
  gap: 12px;
}

.kpi-row,
.chart-row {
  margin-bottom: 0;
}

.kpi-card p {
  margin: 0;
  color: #6b84a3;
}

.kpi-card h3 {
  margin: 8px 0 0;
  font-size: 30px;
}

.chart-box {
  height: 260px;
}

.module-card {
  width: 100%;
}

.module-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-form {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.admin-table {
  min-width: 980px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pager-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.announce-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .admin-topbar {
    padding: 14px;
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-topbar h1 {
    font-size: 24px;
  }

  .admin-main {
    padding: 0 14px 14px;
  }

  .chart-box {
    height: 220px;
  }

  .admin-table {
    min-width: 860px;
  }
}

@media (max-width: 720px) {
  .admin-main {
    padding: 0 10px 10px;
  }

  .chart-box {
    height: 200px;
  }

  .admin-table {
    min-width: 820px;
  }

  .pager-wrap {
    justify-content: flex-start;
  }
}
</style>
