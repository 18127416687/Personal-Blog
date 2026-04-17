<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-nav">
        <RouterLink to="/" class="admin-nav-item"><i class="fa-solid fa-house"></i> 返回首页</RouterLink>
        <RouterLink to="/profile" class="admin-nav-item active"><i class="fa-regular fa-user"></i> 个人资料</RouterLink>
        <RouterLink to="/my-interactions" class="admin-nav-item"><i class="fa-regular fa-heart"></i> 我的互动</RouterLink>
        <RouterLink to="/my-photos" class="admin-nav-item"><i class="fa-regular fa-images"></i> 我的相册</RouterLink>
        <RouterLink to="/editor" class="admin-nav-item"><i class="fa-regular fa-pen-to-square"></i> 写文章</RouterLink>
        <RouterLink to="/my-articles" class="admin-nav-item"><i class="fa-regular fa-newspaper"></i> 我的文章</RouterLink>
        <RouterLink to="/my-drafts" class="admin-nav-item"><i class="fa-regular fa-file-lines"></i> 草稿箱</RouterLink>
      </div>
    </aside>

    <div class="admin-content">
      <div class="admin-card">
        <h2><i class="fa-regular fa-user"></i> 个人资料</h2>

        <div class="profile-edit-section">
          <div class="avatar-upload">
            <div class="avatar-preview" id="avatarPreview">
              <i class="fa-regular fa-circle-user"></i>
            </div>
            <div class="avatar-actions">
              <label for="avatarInput" class="btn btn-primary"><i class="fa-solid fa-camera"></i> 更换头像</label>
              <input type="file" id="avatarInput" accept="image/png,image/jpeg,image/gif" style="display:none;" />
              <p class="hint">支持 PNG、JPG、GIF，最大 5MB</p>
            </div>
          </div>
        </div>

        <form id="profileForm" class="profile-form">
          <div class="form-group">
            <label>用户名</label>
            <div class="input-with-btn">
              <input type="text" id="usernameInput" disabled />
              <button type="button" class="btn btn-sm" id="editUsernameBtn">修改</button>
            </div>
          </div>

          <div class="form-group">
            <label for="nicknameInput">昵称</label>
            <input type="text" id="nicknameInput" placeholder="输入昵称" />
          </div>

          <div class="form-group">
            <label for="bioInput">个人简介</label>
            <textarea id="bioInput" rows="3" placeholder="介绍一下自己..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="emailInput">邮箱</label>
              <input type="email" id="emailInput" placeholder="your@email.com" />
            </div>
            <div class="form-group">
              <label for="phoneInput">手机号</label>
              <input type="tel" id="phoneInput" placeholder="13800138000" />
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary"><i class="fa-regular fa-floppy-disk"></i> 保存资料</button>
          </div>
        </form>
      </div>

      <div class="admin-card">
        <h2><i class="fa-solid fa-lock"></i> 修改密码</h2>
        <form id="passwordForm" class="profile-form">
          <div class="form-group">
            <label for="oldPassword">当前密码</label>
            <input type="password" id="oldPassword" required />
          </div>
          <div class="form-group">
            <label for="newPassword">新密码</label>
            <input type="password" id="newPassword" required minlength="6" />
          </div>
          <div class="form-group">
            <label for="confirmPassword">确认新密码</label>
            <input type="password" id="confirmPassword" required minlength="6" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-key"></i> 修改密码</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { RouterLink } from "vue-router";
import { ensureScript, runLegacyInit } from "../utils/legacyAssets";

onMounted(async () => {
  const inserted = await ensureScript("/static/js/profile.js");
  if (!inserted) runLegacyInit("__initProfilePage");
});
</script>
