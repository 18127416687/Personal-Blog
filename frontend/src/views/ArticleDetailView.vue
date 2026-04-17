<template>
  <header class="ad-navbar">
    <div class="ad-navbar-inner">
      <div class="ad-logo"><RouterLink to="/">🌿 静泊小筑</RouterLink></div>
      <button
        class="ad-menu-toggle"
        id="adMenuToggle"
        onclick="document.getElementById('adNavLinks').classList.toggle('active')"
      >
        <i class="fa-solid fa-bars"></i>
      </button>
      <nav class="ad-nav-links" id="adNavLinks">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/articles">文章</RouterLink>
        <RouterLink to="/editor" class="ad-nav-write"><i class="fa-regular fa-pen-to-square"></i> 写文章</RouterLink>
        <RouterLink to="/my-articles">我的文章</RouterLink>
        <RouterLink to="/my-interactions">我的互动</RouterLink>
        <button
          id="adLogoutBtn"
          style="display:none;background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.875rem;"
        >
          <i class="fa-solid fa-right-from-bracket"></i> 注销
        </button>
        <button
          id="adLoginBtn"
          style="background:#3b82f6;color:white;border:none;padding:0.4rem 0.8rem;border-radius:6px;cursor:pointer;font-size:0.8rem;"
        >
          <i class="fa-regular fa-user"></i> 登录
        </button>
      </nav>
    </div>
  </header>

  <div class="ad-container">
    <aside class="ad-sidebar">
      <div class="ad-toc-card">
        <div class="ad-toc-title"><i class="fa-solid fa-list"></i> 目录</div>
        <div id="adTocEmpty" class="ad-toc-empty">暂无目录</div>
        <nav id="adTocNav" class="ad-toc-nav" style="display:none;"></nav>
      </div>
    </aside>

    <article class="ad-article">
      <div class="ad-loading" id="adLoading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>加载中...</p>
      </div>

      <div class="ad-content" id="adContent" style="display:none;">
        <div class="ad-header">
          <h1 id="adTitle"></h1>
          <div class="ad-meta">
            <span><i class="fa-regular fa-user"></i> <span id="adAuthor"></span></span>
            <span><i class="fa-regular fa-calendar"></i> <span id="adDate"></span></span>
            <span><i class="fa-regular fa-eye"></i> <span id="adViews"></span> 阅读</span>
            <span class="ad-tag" id="adTag"></span>
          </div>
        </div>

        <div class="ad-cover" id="adCover" style="display:none;">
          <img id="adCoverImg" src="" alt="封面" />
        </div>

        <div class="ad-body" id="adBody"></div>

        <div class="ad-actions">
          <button class="ad-action-btn" id="adLikeBtn">
            <i class="fa-regular fa-heart"></i>
            <span>点赞</span>
            <span class="ad-action-num" id="adLikeNum">0</span>
          </button>
          <button class="ad-action-btn" id="adFavBtn">
            <i class="fa-regular fa-bookmark"></i>
            <span>收藏</span>
            <span class="ad-action-num" id="adFavNum">0</span>
          </button>
        </div>

        <div class="ad-back">
          <RouterLink to="/articles"><i class="fa-solid fa-arrow-left"></i> 返回文章列表</RouterLink>
        </div>

        <div class="ad-comments" id="adComments">
          <div class="ad-comments-header">
            <h3><i class="fa-regular fa-comments"></i> 评论 <span id="commentCount">0</span></h3>
          </div>

          <div class="ad-comment-input-area" id="commentInputArea">
            <textarea id="commentInput" placeholder="写下你的评论..." rows="3"></textarea>
            <div class="ad-comment-submit">
              <button class="ad-comment-submit-btn" id="submitCommentBtn">发表评论</button>
            </div>
          </div>

          <div class="ad-comments-list" id="commentsList">
            <div class="ad-comments-loading"><i class="fa-solid fa-spinner fa-spin"></i> 加载评论中...</div>
          </div>
        </div>
      </div>

      <div class="ad-error" id="adError" style="display:none;">
        <i class="fa-regular fa-face-frown"></i>
        <p id="adErrorMsg"></p>
        <RouterLink to="/articles" class="ad-btn">返回文章列表</RouterLink>
      </div>
    </article>
  </div>

  <footer class="ad-footer">静泊小筑 · 用代码记录成长，用文字分享经验</footer>
</template>

<script setup>
import { onMounted, onUnmounted } from "vue";
import { RouterLink } from "vue-router";
import { ensureScript, runLegacyInit } from "../utils/legacyAssets";

onMounted(async () => {
  const inserted = await ensureScript("/static/js/article-detail.js");
  if (!inserted) runLegacyInit("__initArticleDetailPage");
});

onUnmounted(() => {
  const preview = document.getElementById("adImagePreview");
  if (preview) preview.remove();
  document.body.style.overflow = "";
});
</script>
