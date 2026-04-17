if (typeof window.showToast !== 'function') {
    window.showToast = function(message) {
        try { console.log(message); } catch (e) {}
    };
}

function __initMyPhotosPage() {
    loadMyPhotos();
    initUploadModal();
}

function loadMyPhotos() {
    var grid = document.getElementById('myPhotosGrid');
    fetch('/api/photos')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!grid) return;
            grid.innerHTML = '';

            if (!Array.isArray(data) || data.length === 0) {
                grid.innerHTML = '<div class="empty-placeholder" style="grid-column:1/-1;"><i class="fa-regular fa-images"></i><p>No photos yet. Upload your first one.</p></div>';
                return;
            }

            data.forEach(function(photo) {
                if (!photo || !photo.url) return;
                var item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = '<img src="' + photo.url + '" alt="photo" loading="lazy">' +
                    '<div class="gallery-item-overlay">' +
                        '<button class="gallery-delete-btn" data-url="' + photo.url + '"><i class="fa-solid fa-trash"></i></button>' +
                    '</div>';
                grid.appendChild(item);
            });

            grid.querySelectorAll('.gallery-delete-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var url = this.dataset.url;
                    if (confirm('Delete this photo?')) {
                        deletePhoto(url, this.closest('.gallery-item'));
                    }
                });
            });

            initGalleryViewer(grid);
        })
        .catch(function() {
            if (grid) grid.innerHTML = '<div class="empty-placeholder" style="grid-column:1/-1;"><i class="fa-regular fa-folder-open"></i><p>Load failed</p></div>';
        });
}

function initGalleryViewer(grid) {
    try {
        if (window.__galleryViewer && typeof window.__galleryViewer.destroy === 'function') {
            window.__galleryViewer.destroy();
        }
        if (window.Viewer) {
            window.__galleryViewer = new window.Viewer(grid, {
                title: false,
                toolbar: true,
                navbar: true,
                movable: true,
                zoomable: true,
                rotatable: true,
                scalable: true,
                transition: true,
            });
        }
    } catch (e) {
        console.error('Viewer init failed:', e);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', __initMyPhotosPage, { once: true });
} else {
    __initMyPhotosPage();
}

function deletePhoto(url, element) {
    fetch('/api/photos/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.message) {
            showToast('Photo deleted', 'success');
            element.remove();
        } else {
            showToast(data.error || 'Delete failed', 'error');
        }
    })
    .catch(function() { showToast('Delete failed', 'error'); });
}

function initUploadModal() {
    var uploadBtn = document.getElementById('uploadPhotoBtn');
    var modal = document.getElementById('uploadModal');
    var closeBtn = document.getElementById('uploadModalClose');
    var dropZone = document.getElementById('uploadDropZone');
    var fileInput = document.getElementById('photoFileInput');
    var preview = document.getElementById('uploadPreview');
    var progress = document.getElementById('uploadProgress');
    var progressBar = document.getElementById('uploadProgressBar');
    var progressText = document.getElementById('uploadProgressText');
    var chooseBtn = document.getElementById('choosePhotoBtn');
    var startBtn = document.getElementById('startUploadBtn');
    var MAX_FILE_SIZE = 20 * 1024 * 1024;

    var pendingFiles = [];
    var uploading = false;

    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', function() {
        modal.classList.add('show');
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

    if (chooseBtn) {
        chooseBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }

    if (startBtn) {
        startBtn.addEventListener('click', function() {
            if (uploading || pendingFiles.length === 0) return;
            uploadFiles(pendingFiles);
        });
    }

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
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (uploading) return;
        if (!files || files.length === 0) return;

        // FileList may be cleared if input.value is reset; copy first.
        var selectedFiles = Array.prototype.slice.call(files);
        resetUploadUI();

        var validFiles = [];
        var rejectedBySize = 0;
        for (var i = 0; i < selectedFiles.length; i++) {
            var file = selectedFiles[i];
            if (file.size > MAX_FILE_SIZE) {
                rejectedBySize++;
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            if (rejectedBySize > 0) {
                showToast('All files exceed 20MB limit', 'error');
            } else {
                showToast('No valid image files', 'error');
            }
            return;
        }

        pendingFiles = validFiles;
        preview.style.display = 'flex';
        preview.style.flexWrap = 'wrap';
        preview.style.gap = '0.5rem';

        for (var j = 0; j < validFiles.length; j++) {
            var imageFile = validFiles[j];
            var thumb = document.createElement('div');
            thumb.style.cssText = 'width:80px;height:80px;border-radius:6px;overflow:hidden;position:relative;';
            thumb.innerHTML = '<img src="' + URL.createObjectURL(imageFile) + '" style="width:100%;height:100%;object-fit:cover;">' +
                '<div class="upload-status" data-index="' + j + '" style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:white;text-align:center;font-size:0.65rem;padding:2px 0;">Waiting</div>';
            preview.appendChild(thumb);
        }

        setStartButtonState(true);
    }

    function uploadFiles(files) {
        if (!files || files.length === 0) return;

        uploading = true;
        setStartButtonState(false);
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
                            statusEls[index].textContent = 'Done';
                            statusEls[index].style.background = 'rgba(34,197,94,0.8)';
                        }
                    } else {
                        if (statusEls[index]) {
                            statusEls[index].textContent = 'Failed';
                            statusEls[index].style.background = 'rgba(239,68,68,0.8)';
                        }
                    }

                    completed++;
                    progressBar.style.width = Math.round((completed / total) * 100) + '%';
                    progressText.textContent = completed + ' / ' + total + ' uploaded';

                    if (completed === total) {
                        uploading = false;
                        setTimeout(function() {
                            modal.classList.remove('show');
                            resetUploadUI();
                            loadMyPhotos();
                            showToast('Upload complete', 'success');
                        }, 800);
                    }
                });

                xhr.addEventListener('error', function() {
                    if (statusEls[index]) {
                        statusEls[index].textContent = 'Failed';
                        statusEls[index].style.background = 'rgba(239,68,68,0.8)';
                    }
                    completed++;
                    progressBar.style.width = Math.round((completed / total) * 100) + '%';
                    progressText.textContent = completed + ' / ' + total + ' uploaded';

                    if (completed === total) {
                        uploading = false;
                        setStartButtonState(true);
                    }
                });

                xhr.send(formData);
            })(files[i], i);
        }
    }

    function resetUploadUI() {
        pendingFiles = [];
        uploading = false;
        preview.innerHTML = '';
        preview.style.display = 'none';
        progress.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = '';
        fileInput.value = '';
        setStartButtonState(false);
    }

    function setStartButtonState(canUpload) {
        if (!startBtn) return;
        startBtn.disabled = !canUpload;
        startBtn.style.opacity = canUpload ? '1' : '.6';
        startBtn.style.cursor = canUpload ? 'pointer' : 'not-allowed';
    }
}
