<template>
  <div class="editor-page">
    <div class="editor-topbar">
      <div class="topbar-left">
        <RouterLink to="/my-articles" class="back-btn"><i class="fa-solid fa-arrow-left"></i></RouterLink>
        <span class="topbar-title" id="topbarTitle">写文章</span>
        <span class="save-status" id="saveStatus"></span>
      </div>
      <div class="topbar-right">
        <button type="button" class="topbar-btn ai-btn" id="aiWriterBtn"><i class="fa-solid fa-wand-magic-sparkles"></i> AI帮写</button>
        <button type="button" class="topbar-btn" id="draftBtn"><i class="fa-regular fa-floppy-disk"></i> 存草稿</button>
        <button type="button" class="topbar-btn preview-btn" id="previewBtn"><i class="fa-regular fa-eye"></i> 预览</button>
        <div class="publish-dropdown" id="publishDropdown">
          <button type="button" class="topbar-btn publish-btn" id="publishToggleBtn"><i class="fa-regular fa-paper-plane"></i> 发布 <i class="fa-solid fa-chevron-down" style="font-size:0.625rem;margin-left:0.25rem;"></i></button>
          <div class="publish-menu" id="publishMenu">
            <button type="button" class="publish-menu-item" data-status="public"><i class="fa-solid fa-globe"></i> 公开</button>
            <button type="button" class="publish-menu-item" data-status="private"><i class="fa-solid fa-lock"></i> 私密</button>
            <button type="button" class="publish-menu-item" data-status="scheduled"><i class="fa-regular fa-clock"></i> 定时发布</button>
            <div class="publish-scheduled" id="publishScheduled" style="display:none;">
              <input type="datetime-local" id="scheduledInput" />
              <button type="button" class="btn-confirm-scheduled" id="confirmScheduledBtn">确认</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-body">
      <div class="editor-main">
        <input type="text" class="title-input" id="articleTitleInput" placeholder="请输入文章标题..." maxlength="100" />

        <div id="w-e-toolbar" class="wang-toolbar"></div>
        <div id="w-e-text" class="wang-editor"></div>

        <div class="editor-footer">
          <div class="word-count" id="wordCount">0 字</div>
          <div class="editor-tips">
            <span><i class="fa-regular fa-circle-check"></i> Ctrl+S 自动保存草稿</span>
            <span><i class="fa-regular fa-circle-check"></i> 支持粘贴图片</span>
          </div>
        </div>
      </div>

      <div class="editor-sidebar">
        <div class="sidebar-card outline-card">
          <div class="sidebar-card-title"><i class="fa-solid fa-list"></i> 文章大纲</div>
          <div class="outline-empty" id="outlineEmpty">
            <i class="fa-regular fa-rectangle-list"></i>
            <span>使用 H1/H2/H3 标题生成大纲</span>
          </div>
          <div class="outline-list" id="outlineList" style="display:none;"></div>
        </div>

        <div class="sidebar-card">
          <div class="sidebar-card-title"><i class="fa-regular fa-image"></i> 封面图</div>
          <div class="cover-upload" id="coverUpload">
            <div class="cover-placeholder" id="coverPlaceholder">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <span>点击上传封面</span>
            </div>
            <img id="coverPreview" style="display:none;" alt="封面预览" />
            <input type="file" id="coverInput" accept="image/png,image/jpeg,image/gif" style="display:none;" />
          </div>
          <div class="cover-ai-row">
            <input type="text" class="sidebar-input" id="aiCoverPromptInput" placeholder="输入封面描述，如：霓虹夜景中的程序员工作台" />
            <button type="button" class="btn btn-secondary cover-ai-btn" id="aiCoverGenerateBtn">AI生图</button>
          </div>
          <input type="text" class="sidebar-input" id="articleThumbnailInput" placeholder="或输入图片URL..." />
        </div>

        <div class="sidebar-card">
          <div class="sidebar-card-title"><i class="fa-solid fa-tag"></i> 标签</div>
          <div class="tag-input-area">
            <div class="tag-list" id="tagList"></div>
            <input type="text" class="tag-input" id="tagInput" placeholder="输入后回车添加" />
          </div>
          <p class="sidebar-hint">最多 5 个标签</p>
        </div>

        <div class="sidebar-card">
          <div class="sidebar-card-title"><i class="fa-regular fa-file-lines"></i> 摘要</div>
          <textarea class="sidebar-textarea" id="articleExcerptInput" rows="3" placeholder="输入文章摘要，不填将自动截取..."></textarea>
          <p class="sidebar-hint">建议 50-200 字</p>
        </div>

        <div class="sidebar-card">
          <div class="sidebar-card-title"><i class="fa-solid fa-sliders"></i> 发布设置</div>
          <div class="setting-item">
            <span class="setting-label">当前状态</span>
            <span class="setting-value" id="currentStatusBadge"><span class="status-dot public"></span> 公开</span>
          </div>
          <div class="setting-item" id="scheduledSetting" style="display:none;">
            <span class="setting-label">定时时间</span>
            <span class="setting-value" id="scheduledTimeDisplay">未设置</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="previewModal" class="modal">
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3 id="previewModalTitle"></h3>
        <button class="modal-close" id="previewClose"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div id="previewMeta" class="preview-meta"></div>
        <div id="previewContent" class="preview-content"></div>
      </div>
    </div>
  </div>

  <div id="aiWriterModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fa-solid fa-wand-magic-sparkles"></i> AI帮忙写作</h3>
        <button class="modal-close" id="aiWriterClose"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="aiTopicInput">文章主题</label>
          <input type="text" id="aiTopicInput" maxlength="80" placeholder="例如：2026年前端工程化趋势" />
        </div>
        <div class="form-group">
          <label for="aiOutlineInput">大致内容 / 要点</label>
          <textarea id="aiOutlineInput" class="sidebar-textarea" rows="5" placeholder="输入你希望覆盖的核心点，越具体生成越准确"></textarea>
        </div>
        <div class="ai-apply-mode">
          <label class="ai-apply-option">
            <input type="radio" name="aiApplyMode" value="replace" checked />
            覆盖当前正文
          </label>
          <label class="ai-apply-option">
            <input type="radio" name="aiApplyMode" value="append" />
            追加到正文末尾
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="aiCancelBtn">取消</button>
          <button type="button" class="btn btn-primary" id="aiGenerateBtn"><i class="fa-solid fa-wand-magic-sparkles"></i> 生成文章</button>
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
  await ensureScript("https://cdn.jsdelivr.net/npm/@wangeditor/editor@5.1.23/dist/index.js");
  const inserted = await ensureScript("/static/js/editor-new.js");
  if (!inserted) runLegacyInit("__initEditorNewPage");
});
</script>
