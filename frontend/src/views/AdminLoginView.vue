<template>
  <section class="admin-login-wrap">
    <div class="admin-login-card">
      <h1>管理员登录</h1>
      <p class="muted">仅超级管理员可访问后台。</p>
      <form @submit.prevent="onSubmit" class="form">
        <label>
          用户名
          <input v-model.trim="form.username" required />
        </label>
        <label>
          密码
          <input v-model="form.password" type="password" required />
        </label>
        <button class="submit-btn" :disabled="loading">
          {{ loading ? "登录中..." : "登录后台" }}
        </button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { adminLogin } from "../services/api";

const router = useRouter();
const loading = ref(false);
const error = ref("");
const form = reactive({ username: "", password: "" });

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await adminLogin({ username: form.username, password: form.password });
    await router.push("/admin");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.admin-login-wrap {
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
}

.admin-login-card {
  width: min(420px, 100%);
  padding: 28px;
  border-radius: 22px;
  border: 1px solid #dbe3ee;
  background:
    linear-gradient(145deg, rgba(14, 165, 233, 0.12), rgba(16, 185, 129, 0.12)),
    #fff;
}

.form {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

input {
  border: 1px solid #cdd7e5;
  border-radius: 10px;
  padding: 10px 12px;
}

.submit-btn {
  margin-top: 6px;
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(90deg, #0284c7, #10b981);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 10px;
  color: #dc2626;
  font-size: 14px;
}
</style>
