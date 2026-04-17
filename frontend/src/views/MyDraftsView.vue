<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-nav">
        <RouterLink to="/" class="admin-nav-item"><i class="fa-solid fa-house"></i> 返回首页</RouterLink>
        <RouterLink to="/profile" class="admin-nav-item"><i class="fa-regular fa-user"></i> 个人资料</RouterLink>
        <RouterLink to="/my-interactions" class="admin-nav-item"><i class="fa-regular fa-heart"></i> 我的互动</RouterLink>
        <RouterLink to="/my-photos" class="admin-nav-item"><i class="fa-regular fa-images"></i> 我的相册</RouterLink>
        <RouterLink to="/editor" class="admin-nav-item"><i class="fa-regular fa-pen-to-square"></i> 写文章</RouterLink>
        <RouterLink to="/my-articles" class="admin-nav-item"><i class="fa-regular fa-newspaper"></i> 我的文章</RouterLink>
        <RouterLink to="/my-drafts" class="admin-nav-item active"><i class="fa-regular fa-file-lines"></i> 草稿箱</RouterLink>
      </div>
    </aside>

    <div class="admin-content">
      <div class="admin-card">
        <div class="my-articles-header">
          <h2><i class="fa-regular fa-file-lines"></i> 草稿箱</h2>
          <RouterLink to="/editor" class="btn btn-primary"><i class="fa-solid fa-plus"></i> 写新文章</RouterLink>
        </div>

        <div class="my-articles-list" id="myArticlesList">
          <div class="loading-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>
        </div>
      </div>
    </div>
  </div>

  <div id="deleteModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>确认删除</h3>
        <button class="modal-close" id="deleteModalClose"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p>确定要删除这篇草稿吗？此操作不可恢复。</p>
        <div class="form-actions" style="margin-top:1.5rem;">
          <button class="btn btn-secondary" id="cancelDeleteBtn">取消</button>
          <button class="btn btn-danger" id="confirmDeleteBtn">确认删除</button>
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
  const inserted = await ensureScript("/static/js/my-drafts.js");
  if (!inserted) runLegacyInit("__initMyDraftsPage");
});
</script>
