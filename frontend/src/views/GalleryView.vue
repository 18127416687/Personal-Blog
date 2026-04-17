<template>
  <section id="gallery" class="page active-page">
    <h2 style="margin-bottom:1rem;"><i class="fa-regular fa-images"></i> 胶片暗房</h2>

    <div class="gallery-grid" id="galleryGrid">
      <div v-if="loading" class="loading-placeholder" style="grid-column:1/-1;text-align:center;padding:3rem;color:#999;">
        <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
      </div>

      <div
        v-for="(photo, index) in photos"
        v-else
        :key="photo.url || index"
        class="gallery-item"
      >
        <img :src="normalizePhotoUrl(photo.url)" alt="相册图片" loading="lazy" />
      </div>

      <div
        v-if="!loading && photos.length === 0"
        class="empty-placeholder"
        style="grid-column:1/-1;"
      >
        <i class="fa-regular fa-images"></i>
        <p>暂无图片</p>
      </div>

      <div
        v-if="error"
        class="empty-placeholder"
        style="grid-column:1/-1;"
      >
        <i class="fa-regular fa-folder-open"></i>
        <p>{{ error }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { listPhotos } from "../services/api";

const loading = ref(true);
const error = ref("");
const photos = ref([]);

function normalizePhotoUrl(url) {
  const value = String(url || "").trim().replace(/\\/g, "/");
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/uploads/")) return value;
  if (value.startsWith("uploads/")) return `/${value}`;
  const marker = "/uploads/";
  const idx = value.toLowerCase().indexOf(marker);
  if (idx >= 0) return value.slice(idx);
  const hostPart = value.split("/", 1)[0];
  if (hostPart.includes(".") && !value.startsWith("/")) return `https://${value}`;
  return value;
}

async function loadPhotos() {
  loading.value = true;
  error.value = "";
  try {
    const data = await listPhotos();
    photos.value = Array.isArray(data) ? data : [];
  } catch (e) {
    photos.value = [];
    error.value = e?.message || "加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(loadPhotos);
</script>
