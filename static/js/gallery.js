window.addEventListener('DOMContentLoaded', function() {
    initGalleryUpload();
});

function initGalleryUpload() {
    var uploadBtn = document.getElementById('uploadPhotoBtn');
    var modal = document.getElementById('uploadModal');
    var closeBtn = document.getElementById('uploadModalClose');
    var dropZone = document.getElementById('uploadDropZone');
    var fileInput = document.getElementById('photoFileInput');
    var preview = document.getElementById('uploadPreview');
    var progress = document.getElementById('uploadProgress');
    var progressBar = document.getElementById('uploadProgressBar');
    var progressText = document.getElementById('uploadProgressText');

    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', function() {
        checkAuthBeforeUpload();
    });

    closeBtn.addEventListener('click', function() {
        modal.classList.remove('show');
        resetUploadUI();
    });

    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.classList.remove('show');
            resetUploadUI();
        }
    });

    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#3b82f6';
        this.style.background = '#f0f7ff';
    });

    dropZone.addEventListener('dragleave', function() {
        this.style.borderColor = '#ddd';
        this.style.background = '';
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ddd';
        this.style.background = '';
        var files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function checkAuthBeforeUpload() {
        fetch('/api/current_user', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.username) {
                    window.location.href = '/login.html';
                } else {
                    modal.classList.add('show');
                }
            })
            .catch(function() { window.location.href = '/login.html'; });
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;

        preview.innerHTML = '';
        preview.style.display = 'none';
        progress.style.display = 'none';

        var validFiles = [];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (!file.type.match('image.*')) continue;
            if (file.size > 5 * 1024 * 1024) {
                showToast(file.name + ' 超过5MB限制', 'error');
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            showToast('没有有效的图片文件', 'error');
            return;
        }

        preview.style.display = 'flex';
        preview.style.flexWrap = 'wrap';
        preview.style.gap = '0.5rem';

        for (var j = 0; j < validFiles.length; j++) {
            (function(file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var thumb = document.createElement('div');
                    thumb.style.cssText = 'width:80px;height:80px;border-radius:6px;overflow:hidden;position:relative;';
                    thumb.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">' +
                        '<div class="upload-status" style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:white;text-align:center;font-size:0.65rem;padding:2px 0;">等待上传</div>';
                    preview.appendChild(thumb);
                };
                reader.readAsDataURL(file);
            })(validFiles[j]);
        }

        uploadFiles(validFiles);
    }

    function uploadFiles(files) {
        progress.style.display = 'block';
        var total = files.length;
        var completed = 0;
        var statusEls = preview.querySelectorAll('.upload-status');

        for (var i = 0; i < files.length; i++) {
            (function(file, index) {
                var formData = new FormData();
                formData.append('file', file);

                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/photos', true);
                xhr.withCredentials = true;

                xhr.upload.addEventListener('progress', function(e) {
                    if (e.lengthComputable) {
                        var pct = Math.round((e.loaded / e.total) * 100);
                        if (statusEls[index]) statusEls[index].textContent = pct + '%';
                    }
                });

                xhr.addEventListener('load', function() {
                    if (xhr.status === 200) {
                        if (statusEls[index]) {
                            statusEls[index].textContent = '完成';
                            statusEls[index].style.background = 'rgba(34,197,94,0.8)';
                        }
                        completed++;
                        progressBar.style.width = Math.round((completed / total) * 100) + '%';
                        progressText.textContent = completed + ' / ' + total + ' 已上传';

                        if (completed === total) {
                            setTimeout(function() {
                                modal.classList.remove('show');
                                resetUploadUI();
                                loadPhotos();
                                showToast('全部上传成功', 'success');
                            }, 800);
                        }
                    } else {
                        if (statusEls[index]) {
                            statusEls[index].textContent = '失败';
                            statusEls[index].style.background = 'rgba(239,68,68,0.8)';
                        }
                        completed++;
                        progressBar.style.width = Math.round((completed / total) * 100) + '%';
                    }
                });

                xhr.addEventListener('error', function() {
                    if (statusEls[index]) {
                        statusEls[index].textContent = '失败';
                        statusEls[index].style.background = 'rgba(239,68,68,0.8)';
                    }
                    completed++;
                    progressBar.style.width = Math.round((completed / total) * 100) + '%';
                });

                xhr.send(formData);
            })(files[i], i);
        }
    }

    function resetUploadUI() {
        preview.innerHTML = '';
        preview.style.display = 'none';
        progress.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = '';
        fileInput.value = '';
    }

    function showToast(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 3000);
    }
}
