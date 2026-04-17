import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import ArticlesView from "./views/ArticlesView.vue";
import ArticleDetailView from "./views/ArticleDetailView.vue";
import LoginView from "./views/LoginView.vue";
import GalleryView from "./views/GalleryView.vue";
import TreeholeView from "./views/TreeholeView.vue";
import SearchView from "./views/SearchView.vue";
import ProfileView from "./views/ProfileView.vue";
import MyArticlesView from "./views/MyArticlesView.vue";
import MyDraftsView from "./views/MyDraftsView.vue";
import MyInteractionsView from "./views/MyInteractionsView.vue";
import MyPhotosView from "./views/MyPhotosView.vue";
import EditorView from "./views/EditorView.vue";
import AdminLoginView from "./views/AdminLoginView.vue";
import AdminDashboardView from "./views/AdminDashboardView.vue";

const adminStyles = ["/static/css/admin.css"];

const routes = [
  { path: "/", name: "home", component: HomeView },
  { path: "/articles", name: "articles", component: ArticlesView },
  {
    path: "/article/:id",
    name: "article-detail",
    component: ArticleDetailView,
    meta: {
      shell: "none",
      styles: ["/static/css/article-detail.css"]
    }
  },
  { path: "/login", name: "login", component: LoginView, meta: { shell: "none" } },
  { path: "/gallery", name: "gallery", component: GalleryView },
  {
    path: "/treehole",
    name: "treehole",
    component: TreeholeView,
    meta: { styles: ["/static/css/treehole.css"] }
  },
  {
    path: "/search",
    name: "search",
    component: SearchView,
    meta: {
      shell: "none",
      styles: [
        "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap",
        "/static/css/search-page.css"
      ]
    }
  },
  { path: "/profile", name: "profile", component: ProfileView, meta: { styles: adminStyles } },
  { path: "/my-articles", name: "my-articles", component: MyArticlesView, meta: { styles: adminStyles } },
  { path: "/my-drafts", name: "my-drafts", component: MyDraftsView, meta: { styles: adminStyles } },
  {
    path: "/my-interactions",
    name: "my-interactions",
    component: MyInteractionsView,
    meta: { styles: adminStyles }
  },
  {
    path: "/my-photos",
    name: "my-photos",
    component: MyPhotosView,
    meta: { styles: [...adminStyles, "/static/css/viewer.min.css"] }
  },
  {
    path: "/editor/:id?",
    name: "editor",
    component: EditorView,
    meta: {
      shell: "none"
    }
  },
  { path: "/admin-login", name: "admin-login", component: AdminLoginView, meta: { shell: "none" } },
  { path: "/admin", name: "admin", component: AdminDashboardView, meta: { shell: "none" } },
  { path: "/:pathMatch(.*)*", redirect: "/" }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
