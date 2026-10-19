<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" :close-on-click-modal="false" mode="form">
    <!-- 页面主体内容开始 -->
    <div class="body">
      <!-- URL输入区域 -->
      <div class="url-section">
        <div class="section-title">{{ $t('vk.assetLibrary.uploadRemoteFile.remoteFileUrl') }}</div>
        <div class="url-input-group">
          <el-input
            ref="urlInput"
            v-model="form1.data.url"
            :placeholder="$t('vk.assetLibrary.uploadRemoteFile.urlPlaceholder')"
            :disabled="isLoading"
            @keyup.enter.native="fetchRemoteFile"
            @input="onUrlInput"
            clearable
          >
            <el-button slot="append" icon="el-icon-download" :loading="isLoading" :disabled="!form1.data.url.trim() || isLoading" @click="fetchRemoteFile">
              {{ isLoading ? $t('vk.assetLibrary.uploadRemoteFile.fetching') : $t('vk.assetLibrary.uploadRemoteFile.fetch') }}
            </el-button>
          </el-input>
          <div class="url-tips">
            <span class="tip-text">{{ $t('vk.assetLibrary.uploadRemoteFile.urlTips') }}</span>
          </div>
        </div>
      </div>

      <!-- 文件信息显示区域 -->
      <div class="file-info-section" v-if="fileInfo">
        <div class="section-title">{{ $t('vk.assetLibrary.uploadRemoteFile.fileInfo') }}</div>

        <!-- 文件预览 -->
        <div class="preview-area">
          <div class="preview-container" v-if="fileInfo.type === 'image'">
            <el-image :src="fileInfo.url" fit="contain" class="preview-image" :preview-src-list="[fileInfo.url]">
              <div slot="error" class="image-slot">
                <i class="el-icon-picture-outline"></i>
                <div>{{ $t('vk.assetLibrary.uploadRemoteFile.imageLoadFailed') }}</div>
              </div>
            </el-image>
          </div>
          <div class="preview-container" v-else-if="fileInfo.type === 'video' || fileInfo.type === 'audio'">
            <iframe v-if="['html', 'htm'].indexOf(getFileFormatFromUrl(fileInfo.url)) > -1" :src="fileInfo.url" class="preview-iframe"></iframe>
            <audio v-else-if="fileInfo.type === 'audio'" :src="fileInfo.url" controls class="preview-audio"></audio>
            <video v-else :src="fileInfo.url" controls class="preview-video"></video>
          </div>
          <div class="preview-container" v-else>
            <div class="preview-other">
              <vk-data-icon name="el-icon-document" size="60" color="#d5d5de"></vk-data-icon>
              <span class="file-type">{{ fileInfo.type.toUpperCase() }}</span>
            </div>
          </div>
        </div>

        <!-- 文件详情 -->
        <div class="file-details">
          <div class="detail-item" v-if="fileInfo.format">
            <span class="label">{{ $t('vk.assetLibrary.uploadRemoteFile.fileFormat') }}</span>
            <span class="value">{{ fileInfo.format.toUpperCase() }}</span>
          </div>
          <div class="detail-item" v-if="fileInfo.width && fileInfo.height">
            <span class="label">{{ $t('vk.assetLibrary.uploadRemoteFile.dimensions') }}</span>
            <span class="value">{{ fileInfo.width }} × {{ fileInfo.height }}</span>
          </div>
        </div>
      </div>

      <!-- 文件设置区域 -->
      <div class="settings-section" v-if="fileInfo">
        <div class="section-title">{{ $t('vk.assetLibrary.uploadRemoteFile.fileSettings') }}</div>

        <vk-data-form
          ref="form1"
          v-model="form1.data"
          :form-type="value.mode"
          :rules="form1.props.rules"
          :action="form1.props.action"
          :columns="form1.props.columns"
          :loading.sync="form1.props.loading"
          :labelWidth="form1.props.labelWidth"
          :show-cancel="false"
          :submit-text="page.submitText"
          @success="onFormSuccess"
        ></vk-data-form>
      </div>
    </div>
    <!-- 页面主体内容结束 -->
  </vk-data-dialog>
</template>

<script>
  let vk = uni.vk; // vk实例

  export default {
    props: {
      value: {
        type: Object,
        default: function () {
          return {
            show: false,
            mode: '',
            item: {},
          };
        },
      },
    },
    data: function () {
      return {
        page: {
          title: this.$t('vk.assetLibrary.uploadRemoteFile.title'),
          submitText: this.$t('vk.assetLibrary.uploadRemoteFile.submitUpload'),
          top: '5vh',
          width: '800px',
        },
        isLoading: false,
        fileInfo: null, // 文件信息
        autoFetchTimer: null, // 自动抓取定时器
        form1: {
          data: {
            type: '',
            url: '',
            name: '',
            description: '',
            clone_image: false,
            category_id: '',
            category_name: '',
            width: 0,
            height: 0,
          },
          props: {
            action: 'admin/system_uni/uni-id-files/files/sys/addRemote',
            columns: [
              {
                key: 'url',
                title: this.$t('vk.assetLibrary.uploadRemoteFile.fileUrl'),
                type: 'text',
                disabled: true,
                placeholder: this.$t('vk.assetLibrary.uploadRemoteFile.remoteFileUrl'),
              },
              {
                key: 'name',
                title: this.$t('vk.assetLibrary.fileName'),
                type: 'text',
                placeholder: this.$t('vk.assetLibrary.uploadRemoteFile.fileNamePlaceholder'),
              },
              {
                key: 'description',
                title: this.$t('vk.assetLibrary.form.description'),
                type: 'text',
                placeholder: this.$t('vk.assetLibrary.uploadRemoteFile.descriptionPlaceholder'),
              },
              {
                key: 'clone_image',
                title: this.$t('vk.assetLibrary.uploadRemoteFile.cloneImage'),
                type: 'switch',
                show: false, // 默认隐藏，根据文件类型动态显示
              },
            ],
            rules: {
              name: [
                { required: true, message: this.$t('vk.assetLibrary.form.nameRequired'), trigger: 'change' },
                { max: 50, message: this.$t('vk.assetLibrary.form.nameMaxLength', { length: 50 }), trigger: 'change' },
              ],
              category_id: [{ required: true, message: this.$t('vk.assetLibrary.uploadRemoteFile.selectCategory'), trigger: 'change' }],
            },
            labelWidth: '80px',
          },
        },
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      // 初始化
      init() {
        let { value } = this;
        this.$emit('input', value);
      },

      // URL输入处理
      onUrlInput(value) {
        // 如果URL是完整的，自动触发抓取
        if (value && value.trim() && this.validateUrl(value.trim())) {
          // 使用防抖，避免频繁触发
          clearTimeout(this.autoFetchTimer);
          this.autoFetchTimer = setTimeout(() => {
            if (!this.isLoading) {
              // 如果URL发生变化，清除之前的文件信息并重新抓取
              if (this.fileInfo && this.fileInfo.url !== value.trim()) {
              }
              this.fetchRemoteFile();
            }
          }, 300);
        } else {
          // 如果URL不完整，清除文件信息
          if (this.fileInfo) {
            this.fileInfo = null;
          }
        }
      },

      // 验证URL格式
      validateUrl(url) {
        try {
          new URL(url);
          return true;
        } catch (error) {
          return false;
        }
      },

      // 抓取远程文件
      async fetchRemoteFile() {
        if (!this.form1.data.url.trim()) {
          this.$message.warning(this.$t('vk.assetLibrary.uploadRemoteFile.enterRemoteUrl'));
          return;
        }

        // 验证URL格式
        if (!this.validateUrl(this.form1.data.url.trim())) {
          this.$message.error(this.$t('vk.assetLibrary.uploadRemoteFile.invalidUrl'));
          return;
        }

        this.isLoading = true;
        try {
          // 直接在前端获取文件信息
          let fileInfo = await this.getRemoteFileInfo(this.form1.data.url.trim());

          if (fileInfo) {
            this.fileInfo = fileInfo;
            this.updateFormData();
            this.updateFormColumns();
          } else {
            this.$message.error(this.$t('vk.assetLibrary.uploadRemoteFile.fetchFailed'));
          }
        } catch (error) {
          console.error('获取远程文件信息失败:', error);
          this.$message.error(this.$t('vk.assetLibrary.uploadRemoteFile.fetchFailed'));
        } finally {
          this.isLoading = false;
        }
      },

      // 获取远程文件信息
      async getRemoteFileInfo(url) {
        try {
          // 通过文件扩展名判断文件类型
          let fileType = this.getFileTypeFromUrl(url);

          // 创建文件信息对象
          let fileInfo = {
            url: url,
            type: fileType,
            size: 0, // 前端无法直接获取文件大小
            duration: 0, // 前端无法直接获取视频时长
            width: null,
            height: null,
            format: this.getFileFormatFromUrl(url),
          };

          // 如果是图片，尝试获取尺寸
          if (fileType === 'image') {
            try {
              let dimensions = await this.getImageDimensions(url);
              fileInfo.width = dimensions.width;
              fileInfo.height = dimensions.height;
              this.form1.data.width = dimensions.width;
              this.form1.data.height = dimensions.height;
            } catch (error) {
              console.warn('无法获取图片尺寸:', error);
            }
          }

          return fileInfo;
        } catch (error) {
          console.error('解析文件信息失败:', error);
          return null;
        }
      },

      // 从URL获取文件类型
      getFileTypeFromUrl(url) {
        try {
          let urlObj = new URL(url);
          let pathname = urlObj.pathname.toLowerCase();
          let extension = pathname.split('.').pop();

          // 图片格式
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'jfif', 'dpg'].includes(extension)) {
            return 'image';
          }

          // 视频格式
          if (['mp4', 'mpg', 'mpeg', 'dat', 'asf', 'avi', 'rm', 'rmvb', 'mov', 'wmv', 'flv', 'mkv', 'm3u8', '3gp'].includes(extension)) {
            return 'video';
          }

          // 音频格式
          if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'ape', 'amr', 'mid', 'midi', 'opus'].includes(extension)) {
            return 'audio';
          }

          return this.value.item.currentType || 'other';
        } catch (error) {
          return 'other';
        }
      },

      // 从URL获取文件格式
      getFileFormatFromUrl(url) {
        try {
          let urlObj = new URL(url);
          let pathname = urlObj.pathname.toLowerCase();
          return pathname.split('.').pop();
        } catch (error) {
          return 'unknown';
        }
      },

      // 获取图片尺寸
      getImageDimensions(url) {
        return new Promise((resolve, reject) => {
          let img = new Image();
          img.onload = function () {
            resolve({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          };
          img.onerror = function () {
            reject(new Error('图片加载失败'));
          };
          img.src = url;
        });
      },

      // 更新表单数据
      updateFormData() {
        if (this.fileInfo) {
          // 从URL中提取文件名
          let fileName = this.extractFileNameFromUrl(this.fileInfo.url);
          this.form1.data.name = fileName;
          this.form1.data.url = this.fileInfo.url;
          this.form1.data.type = this.fileInfo.type;
          this.form1.data.size = this.fileInfo.size;
          this.form1.data.duration = this.fileInfo.duration;
        }
      },

      // 更新表单列配置
      updateFormColumns() {
        if (this.fileInfo) {
          // 根据文件类型显示/隐藏克隆图片选项
          let cloneColumn = this.form1.props.columns.find((col) => col.key === 'clone_image');
          if (cloneColumn) {
            cloneColumn.show = this.fileInfo.type === 'image';
          }
        }
      },

      // 从URL中提取文件名
      extractFileNameFromUrl(url) {
        try {
          let urlObj = new URL(url);
          let pathname = urlObj.pathname;
          let fileName = pathname.split('/').pop();

          // 如果没有文件名或文件名不包含扩展名，使用默认名称
          if (!fileName || !fileName.includes('.')) {
            let timestamp = new Date().getTime();
            fileName = `remote_file_${timestamp}`;
          }

          // 如果文件名超过50个字符，截取最后50个字符
          if (fileName.length > 50) {
            fileName = fileName.substring(fileName.length - 50);
          }

          return fileName;
        } catch (error) {
          let timestamp = new Date().getTime();
          return `remote_file_${timestamp}`;
        }
      },

      // 获取文件类型文本
      getFileTypeText(type) {
        const typeMap = {
          image: this.$t('vk.assetLibrary.image'),
          video: this.$t('vk.assetLibrary.video'),
          audio: this.$t('vk.assetLibrary.audio'),
          document: this.$t('vk.assetLibrary.document'),
          archive: this.$t('vk.assetLibrary.archive'),
          other: this.$t('vk.assetLibrary.other'),
        };
        return typeMap[type] || this.$t('vk.assetLibrary.unknown');
      },

      // 格式化文件大小
      formatFileSize(bytes) {
        if (!bytes) return this.$t('vk.assetLibrary.unknown');
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
      },

      // 格式化时长
      formatDuration(seconds) {
        if (!seconds) return this.$t('vk.assetLibrary.unknown');
        let h = Math.floor(seconds / 3600);
        let m = Math.floor((seconds % 3600) / 60);
        let s = Math.floor(seconds % 60);

        if (h > 0) {
          return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
          return `${m}:${s.toString().padStart(2, '0')}`;
        }
      },

      // 监听 - 页面打开
      onOpen() {
        let { item } = this.value;

        // 设置当前分类
        if (item.currentCategory) {
          this.form1.data.category_id = item.currentCategory;
        }
        if (item.currentCategoryName) {
          this.form1.data.category_name = item.currentCategoryName;
        }
        if (item.currentType) {
          this.form1.data.type = item.currentType;
        }

        // 自动聚焦到URL输入框
        this.$nextTick(() => {
          if (this.$refs.urlInput) {
            this.$refs.urlInput.focus();
          }
        });
      },

      // 监听 - 页面关闭
      onClose() {
        // 清理定时器
        if (this.autoFetchTimer) {
          clearTimeout(this.autoFetchTimer);
          this.autoFetchTimer = null;
        }
        this.resetForm();
      },

      // 重置表单
      resetForm() {
        this.form1.data = {
          url: '',
          name: '',
          description: '',
          clone_image: false,
          category_id: '',
          category_name: '',
        };
        this.fileInfo = null;
        this.isLoading = false;
        if (this.$refs.form1) {
          this.$refs.form1.resetForm();
        }
      },

      // 监听 - 提交成功后
      onFormSuccess() {
        this.value.show = false;
        this.$emit('success');
      },
    },
    watch: {
      'value.show': {
        handler(newValue, oldValue) {
          if (newValue) {
            this.onOpen();
          } else {
            this.onClose();
          }
        },
      },
    },
    computed: {},
  };
</script>

<style lang="scss" scoped>
  .body {
    padding: 20px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 10px;
    border-left: 4px solid #409eff;
    padding-left: 10px;
  }

  .url-section {
    margin-bottom: 10px;
  }

  .url-input-group {
    .el-input {
      width: 100%;
    }
  }

  .url-tips {
    margin-top: 8px;

    .tip-text {
      font-size: 12px;
      color: #909399;
      line-height: 1.4;
    }
  }

  .file-info-section {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .preview-area {
    margin-bottom: 20px;
    text-align: center;
  }

  .preview-container {
    display: inline-block;
    max-width: 100%;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .preview-image {
    width: 280px;
    height: 280px;
    display: block;
    border-radius: 8px;
    overflow: hidden;
  }

  ::v-deep .image-slot {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background-color: #f5f7fa;
    color: #909399;
    font-size: 14px;

    i {
      font-size: 48px;
      margin-bottom: 8px;
    }
  }

  .preview-video {
    width: 400px;
    height: 300px;
    display: block;
  }

  .preview-audio {
    width: 400px;
    display: block;
  }

  .preview-iframe {
    width: 600px;
    height: 400px;
    display: block;
  }

  .preview-other {
    width: 200px;
    height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
    border: 2px dashed #ddd;

    .file-type {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
    }
  }

  .file-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }

  .detail-item {
    display: flex;
    align-items: center;

    .label {
      font-weight: 500;
      color: #666;
      margin-right: 8px;
      min-width: 60px;
    }

    .value {
      color: #333;
      font-weight: 600;
    }
  }

  .settings-section {
    padding: 15px;
    background-color: #fff;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  // 表单样式调整
  ::v-deep .vk-data-form {
    .el-form-item {
      margin-bottom: 20px;
    }

    .el-form-item__label {
      font-weight: 500;
      color: #333;
    }

    .el-textarea__inner {
      min-height: 80px;
    }

    .el-switch {
      margin-top: 5px;
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    div {
      padding: 15px;
    }

    .file-details {
      grid-template-columns: 1fr;
    }

    .preview-image,
    .preview-video,
    .preview-audio {
      max-width: 100%;
    }
  }
</style>
