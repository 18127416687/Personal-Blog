<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-nav">
        <RouterLink to="/" class="admin-nav-item"><i class="fa-solid fa-house"></i> 返回首页</RouterLink>
        <RouterLink to="/profile" class="admin-nav-item"><i class="fa-regular fa-user"></i> 个人资料</RouterLink>
        <RouterLink to="/my-interactions" class="admin-nav-item active"><i class="fa-regular fa-heart"></i> 我的互动</RouterLink>
        <RouterLink to="/my-photos" class="admin-nav-item"><i class="fa-regular fa-images"></i> 我的相册</RouterLink>
        <RouterLink to="/editor" class="admin-nav-item"><i class="fa-regular fa-pen-to-square"></i> 写文章</RouterLink>
        <RouterLink to="/my-articles" class="admin-nav-item"><i class="fa-regular fa-newspaper"></i> 我的文章</RouterLink>
        <RouterLink to="/my-drafts" class="admin-nav-item"><i class="fa-regular fa-file-lines"></i> 草稿箱</RouterLink>
      </div>
    </aside>

    <div class="admin-content">
      <div class="admin-card">
        <div class="my-interactions-header">
          <h2><i class="fa-regular fa-heart"></i> 我的互动</h2>
        </div>
        <div class="filter-bar">
          <button class="filter-btn active" data-filter="likes"><i class="fa-regular fa-heart"></i> 点赞 <span id="likesCount" class="filter-count">0</span></button>
          <button class="filter-btn" data-filter="favorites"><i class="fa-regular fa-bookmark"></i> 收藏 <span id="favoritesCount" class="filter-count">0</span></button>
        </div>
        <div class="my-articles-list" id="myInteractionsList">
          <div class="loading-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { RouterLink } from "vue-router";
import { ensureScript, runLegacyInit } from "../utils/legacyAssets";

onMounted(async () => {
  const inserted = await ensureScript("/static/js/my-interactions.js");
  if (!inserted) runLegacyInit("__initMyInteractionsPage");
});
</script>
