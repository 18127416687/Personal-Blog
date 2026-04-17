async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || "请求失败");
  }
  return data;
}

export function login(payload) {
  return request("/api/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logout() {
  return request("/api/logout", { method: "POST" });
}

export function currentUser() {
  return request("/api/current_user");
}

export function getProfile() {
  return request("/api/user/profile");
}

export function updateProfile(payload) {
  return request("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function listArticles(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/articles${query ? `?${query}` : ""}`);
}

export function getArticle(id) {
  return request(`/api/articles/${id}`);
}

export function likeArticle(id) {
  return request(`/api/articles/${id}/like`, { method: "POST" });
}

export function favoriteArticle(id) {
  return request(`/api/articles/${id}/favorite`, { method: "POST" });
}

export function listMyArticles() {
  return request("/api/user/articles");
}

export function createArticle(payload) {
  return request("/api/user/articles", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateArticle(id, payload) {
  return request(`/api/user/articles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteArticle(id) {
  return request(`/api/user/articles/${id}`, { method: "DELETE" });
}

export function listMyLikes() {
  return request("/api/user/likes");
}

export function listMyFavorites() {
  return request("/api/user/favorites");
}

export function listPhotos() {
  return request("/api/photos");
}

export async function uploadPhoto(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/photos", {
    method: "POST",
    credentials: "same-origin",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "上传失败");
  return data;
}

export function deletePhoto(url) {
  return request("/api/photos/delete", {
    method: "POST",
    body: JSON.stringify({ url })
  });
}

export function listBullets() {
  return request("/api/bullets");
}

export function createBullet(content) {
  return request("/api/bullets", {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export function adminLogin(payload) {
  return request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function adminSession() {
  return request("/api/admin/session");
}

export function listAdminArticles(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/articles?${query}`);
}

export function batchAdminArticles(payload) {
  return request("/api/admin/articles/batch", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listAdminComments(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/comments?${query}`);
}

export function batchDeleteComments(payload) {
  return request("/api/admin/comments/batch-delete", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listAdminUsers(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/users?${query}`);
}

export function updateUserStatus(userId, status) {
  return request(`/api/admin/users/${userId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  });
}

export function updateUserStatusWithDuration(userId, payload) {
  return request(`/api/admin/users/${userId}/status`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function listAdminBullets(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/admin/bullets?${query}`);
}

export function deleteAdminBullet(bulletId) {
  return request(`/api/admin/bullets/${bulletId}`, {
    method: "DELETE"
  });
}

export function getAdminAnnouncement() {
  return request("/api/admin/announcement");
}

export function updateAdminAnnouncement(payload) {
  return request("/api/admin/announcement", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function getAdminDashboardMetrics() {
  return request("/api/admin/dashboard-metrics");
}

export function getPopularTags() {
  return request("/api/tags/popular");
}

export function getWeiboHot() {
  return request("/api/weibo/hot");
}
