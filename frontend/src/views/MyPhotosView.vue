<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-nav">
        <RouterLink to="/" class="admin-nav-item"><i class="fa-solid fa-house"></i> 返回首页</RouterLink>
        <RouterLink to="/profile" class="admin-nav-item"><i class="fa-regular fa-user"></i> 个人资料</RouterLink>
        <RouterLink to="/my-interactions" class="admin-nav-item"><i class="fa-regular fa-heart"></i> 我的互动</RouterLink>
        <RouterLink to="/my-photos" class="admin-nav-item active"><i class="fa-regular fa-images"></i> 我的相册</RouterLink>
        <RouterLink to="/editor" class="admin-nav-item"><i class="fa-regular fa-pen-to-square"></i> 写文章</RouterLink>
        <RouterLink to="/my-articles" class="admin-nav-item"><i class="fa-regular fa-newspaper"></i> 我的文章</RouterLink>
        <RouterLink to="/my-drafts" class="admin-nav-item"><i class="fa-regular fa-file-lines"></i> 草稿箱</RouterLink>
      </div>
    </aside>

    <div class="admin-content">
      <div class="admin-card">
        <div class="my-articles-header">
          <h2><i class="fa-regular fa-images"></i> 我的相册</h2>
          <button id="uploadPhotoBtn" class="btn btn-primary"><i class="fa-solid fa-cloud-arrow-up"></i> 上传图片</button>
        </div>

        <div class="gallery-grid" id="myPhotosGrid">
          <div class="loading-placeholder" style="grid-column:1/-1;text-align:center;padding:3rem;color:#999;"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>
        </div>
      </div>
    </div>
  </div>

  <div id="uploadModal" class="modal">
    <div class="modal-content" style="max-width:480px;">
      <div class="modal-header">
        <h3>上传图片</h3>
        <button class="modal-close" id="uploadModalClose"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div id="uploadDropZone" style="border:2px dashed #ddd;border-radius:8px;padding:2rem;text-align:center;cursor:pointer;transition:border-color 0.2s;">
          <i class="fa-solid fa-cloud-arrow-up" style="font-size:2rem;color:#999;margin-bottom:0.75rem;"></i>
          <p style="color:#666;margin:0 0 0.5rem;">点击选择或拖拽图片到此处</p>
          <p style="color:#999;font-size:0.8rem;margin:0;">支持 JPG、PNG、GIF，最大 5MB</p>
        </div>
        <input type="file" id="photoFileInput" accept="image/*,.heic,.heif" style="display:none;" multiple />
        <div id="uploadPreview" style="display:none;margin-top:1rem;"></div>
        <div id="uploadProgress" style="display:none;margin-top:1rem;">
          <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;">
            <div id="uploadProgressBar" style="background:#3b82f6;height:100%;width:0%;transition:width 0.3s;"></div>
          </div>
          <p id="uploadProgressText" style="text-align:center;font-size:0.8rem;color:#666;margin-top:0.5rem;"></p>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;">
          <button type="button" id="choosePhotoBtn" class="btn" style="border:1px solid #d1d5db;background:#fff;color:#374151;">Choose Images</button>
          <button type="button" id="startUploadBtn" class="btn btn-primary" disabled style="opacity:.6;cursor:not-allowed;">Start Upload</button>
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
  await ensureScript("/static/js/viewer.min.js");
  const inserted = await ensureScript("/static/js/my-photos.js");
  if (!inserted) runLegacyInit("__initMyPhotosPage");
});
</script>
