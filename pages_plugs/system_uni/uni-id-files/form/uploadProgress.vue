<template>
  <vk-data-dialog
    v-model="value.show"
    :title="page.title"
    :top="page.top"
    :width="page.width"
    :close-on-click-modal="false"
    :show-fullscreen="false"
    :show-close="false"
    :destroy-on-close="true"
    mode="form"
  >
    <!-- 页面主体内容开始 -->
    <div class="body" v-if="total > 1">
      <div class="total-progress">
        <span class="span">{{
          $t('vk.assetLibrary.uploadProgress.totalProgress', { completed: completedCount + failedCount, total, success: completedCount, failed: failedCount })
        }}</span>
        <el-progress :percentage="totalPercentage"></el-progress>
      </div>

      <div class="progress-slots">
        <div v-for="(slot, index) in progressSlots" :key="index" class="progress-slot" :class="slot.status">
          <div class="slot-header">
            <span class="slot-title">{{ slot.fileName || $t('vk.assetLibrary.uploadProgress.file', { index: index + 1 }) }}</span>
            <span class="slot-status">{{ getStatusText(slot.status) }}</span>
          </div>
          <el-progress :percentage="slot.progress || 0" :status="getProgressStatus(slot.status) || undefined" :show-text="false"></el-progress>
          <span class="slot-progress-text">{{ slot.progress || 0 }}%</span>
        </div>
      </div>

      <div class="status-text">
        <span v-if="isUploading">{{ $t('vk.assetLibrary.uploadProgress.uploadingConcurrently') }}</span>
        <span v-else>{{ $t('vk.assetLibrary.uploadProgress.uploadComplete') }}</span>
      </div>
    </div>
    <div class="body" v-else>
      <div style="text-align: center">
        <el-progress :percentage="currentPercentage" type="circle"></el-progress>
        <div style="margin-top: 10px">
          <span v-if="isUploading">{{ $t('vk.assetLibrary.uploadProgress.uploading') }}</span>
          <span v-else>{{ $t('vk.assetLibrary.uploadProgress.uploadComplete') }}</span>
        </div>
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
      // 组件创建时，进行数据初始化
      return {
        page: {
          title: this.$t('vk.assetLibrary.uploadProgress.title'),
          submitText: this.$t('vk.form.submit'),
          cancelText: this.$t('vk.form.close'),
          showCancel: true,
          top: '10vh',
          width: '800px',
        },
        total: 0,
        totalPercentage: 0, // 总进度
        currentPercentage: 0, // 当前文件进度
        currentIndex: 0,
        // 并发上传相关
        CONCURRENT_LIMIT: 20, // 并发度
        uploadQueue: [], // 待上传文件队列
        activeUploads: new Set(), // 当前活跃的上传任务
        completedCount: 0, // 已完成数量
        failedCount: 0, // 失败数量
        fileProgress: {}, // 每个文件的进度 {fileId: progress}
        isUploading: false, // 是否正在上传
        // 进度条显示相关
        progressSlots: [], // 20个进度条槽位
        uploadTasks: {}, // 上传任务详情 {fileId: {index, fileName, progress, status}}
        queueMonitorTimer: null, // 队列监控定时器
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
        // 初始化20个进度条槽位
        this.initProgressSlots();
      },

      // 初始化进度条槽位
      initProgressSlots() {
        const slotCount = Math.min(this.total, this.CONCURRENT_LIMIT);
        this.progressSlots = Array.from({ length: slotCount }, (_, index) => ({
          index,
          fileName: '',
          progress: 0,
          status: 'idle', // idle, uploading, completed, failed
          fileId: null,
        }));
      },
      // 监听 - 页面打开
      onOpen() {
        let { item = {} } = this.value;
        this.upload(item);
      },
      // 监听 - 页面关闭
      onClose() {
        if (this.queueMonitorTimer) {
          clearInterval(this.queueMonitorTimer);
          this.queueMonitorTimer = null;
        }
      },
      async upload(item) {
        let { vk } = this;
        let { tempFilePaths, tempFiles, categoryId, fileType, cloudDirectory, cloudPathRemoveChinese, provider } = item;

        // 初始化上传状态
        this.total = tempFilePaths.length;
        this.page.top = this.total === 1 ? '30vh' : '10vh';
        this.totalPercentage = 0;
        this.completedCount = 0;
        this.failedCount = 0;
        this.fileProgress = {};
        this.uploadTasks = {};
        this.isUploading = true;

        // 重置进度条槽位
        this.initProgressSlots();

        // 构建上传队列
        this.uploadQueue = tempFilePaths.map((filePath, index) => ({
          filePath,
          file: tempFiles[index],
          index,
          fileId: `file_${index}_${Date.now()}`,
          progress: 0,
          fileName: tempFiles[index].name || this.$t('vk.assetLibrary.uploadProgress.file', { index: index + 1 }),
        }));

        // 启动并发上传
        this.startConcurrentUpload(item);
      },

      // 启动并发上传
      async startConcurrentUpload(item) {
        let { vk } = this;

        // 启动文件（不超过实际文件数量和并发限制）
        const initialCount = Math.min(this.CONCURRENT_LIMIT, this.uploadQueue.length, this.total);
        for (let i = 0; i < initialCount; i++) {
          this.startSingleUpload(item);
        }

        // 启动定期检查，确保队列中的文件能及时启动
        this.startQueueMonitor(item);
      },

      // 启动队列监控
      startQueueMonitor(item) {
        this.queueMonitorTimer = setInterval(() => {
          // 如果还有待上传文件且有空闲槽位，启动新的上传
          if (this.uploadQueue.length > 0 && this.activeUploads.size < this.CONCURRENT_LIMIT) {
            const idleSlots = this.progressSlots.filter((slot) => slot.status === 'idle');
            if (idleSlots.length > 0) {
              this.startSingleUpload(item);
            }
          }

          // 如果队列为空且没有活跃上传，停止监控
          if (this.uploadQueue.length === 0 && this.activeUploads.size === 0) {
            clearInterval(this.queueMonitorTimer);
            this.queueMonitorTimer = null;
          }
        }, 100); // 每100ms检查一次
      },

      // 单个文件上传
      async startSingleUpload(item) {
        let { vk } = this;

        // 检查是否还有待上传的文件
        if (this.uploadQueue.length === 0) {
          return;
        }

        // 从队列中取出一个文件
        const fileInfo = this.uploadQueue.shift();
        const uploadId = fileInfo.fileId;

        // 找到空闲的进度条槽位
        const availableSlot = this.progressSlots.find((slot) => slot.status === 'idle');
        if (!availableSlot) {
          // 如果没有空闲槽位，将文件放回队列
          this.uploadQueue.unshift(fileInfo);
          return;
        }

        // 占用槽位
        availableSlot.fileId = uploadId;
        availableSlot.fileName = fileInfo.fileName;
        availableSlot.progress = 0;
        availableSlot.status = 'uploading';

        // 添加到活跃上传列表
        this.activeUploads.add(uploadId);

        // 保存任务详情
        this.uploadTasks[uploadId] = {
          index: fileInfo.index,
          fileName: fileInfo.fileName,
          progress: 0,
          status: 'uploading',
          slotIndex: availableSlot.index,
        };

        // 更新当前上传的文件索引
        this.currentIndex = fileInfo.index;

        try {
          await new Promise((resolve, reject) => {
            vk.uploadFile({
              filePath: fileInfo.filePath,
              file: fileInfo.file,
              needSave: true,
              fileType: item.fileType,
              category_id: item.categoryId,
              cloudDirectory: item.cloudDirectory,
              cloudPathRemoveChinese: item.cloudPathRemoveChinese,
              provider: item.provider,
              uniCloud: item.uniCloud,
              env: item.env,
              onUploadProgress: (progressRes) => {
                // 更新单个文件进度
                this.fileProgress[uploadId] = progressRes.progress;
                this.currentPercentage = progressRes.progress;

                // 更新槽位进度
                availableSlot.progress = progressRes.progress;
                this.uploadTasks[uploadId].progress = progressRes.progress;

                this.updateTotalProgress();
              },
              addSuccess: (res) => {
                this.completedCount++;
                this.fileProgress[uploadId] = 100;
                availableSlot.progress = 100;
                availableSlot.status = 'completed';
                this.uploadTasks[uploadId].status = 'completed';
                this.updateTotalProgress();
                resolve(res);
              },
              fail: (res) => {
                this.failedCount++;
                availableSlot.status = 'failed';
                this.uploadTasks[uploadId].status = 'failed';
                reject(res);
              },
              addFail: (res) => {
                this.failedCount++;
                availableSlot.status = 'failed';
                this.uploadTasks[uploadId].status = 'failed';
                reject(res);
              },
            });
          });
        } catch (err) {
          console.error(`文件 ${fileInfo.index + 1} 上传失败:`, err);
        } finally {
          // 从活跃上传列表中移除
          this.activeUploads.delete(uploadId);

          // 立即释放槽位，但保持完成状态显示
          availableSlot.fileId = null;
          availableSlot.fileName = '';
          availableSlot.progress = 0;
          availableSlot.status = 'idle';

          // 检查是否还有待上传的文件，如果有则立即启动下一个
          if (this.uploadQueue.length > 0) {
            // 使用 setTimeout 确保在下一个事件循环中启动，避免递归调用问题
            setTimeout(() => {
              this.startSingleUpload(item);
            }, 0);
          } else if (this.activeUploads.size === 0) {
            // 所有文件都已完成（成功或失败）
            this.isUploading = false;
            this.onSuccess();
          }
        }
      },

      // 更新总进度
      updateTotalProgress() {
        // 计算总进度百分比：已完成文件数 / 总文件数 * 100
        if (this.total > 0) {
          this.totalPercentage = Math.round(((this.completedCount + this.failedCount) / this.total) * 100);
        } else {
          this.totalPercentage = 0;
        }
      },
      // 获取状态文本
      getStatusText(status) {
        const statusMap = {
          idle: this.$t('vk.assetLibrary.uploadProgress.statusIdle'),
          uploading: this.$t('vk.assetLibrary.uploadProgress.statusUploading'),
          completed: this.$t('vk.common.complete'),
          failed: this.$t('vk.common.fail'),
        };
        return statusMap[status] || this.$t('vk.assetLibrary.unknown');
      },

      // 获取进度条状态
      getProgressStatus(status) {
        const statusMap = {
          idle: null,
          uploading: null,
          completed: 'success',
          failed: 'exception',
        };
        return statusMap[status] || null;
      },

      // 监听 - 提交成功后
      onSuccess() {
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
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped>
  .body {
    padding: 20px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .total-progress {
    margin-bottom: 15px;

    .span {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #333;
    }
  }

  .progress-slots {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    grid-gap: 12px;
    margin-bottom: 20px;
    max-width: 100%;
  }

  .progress-slot {
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    padding: 12px;
    background-color: #fafafa;
    transition: all 0.3s ease;

    &.idle {
      background-color: #f5f7fa;
      border-color: #e4e7ed;
    }

    &.uploading {
      background-color: #ecf5ff;
      border-color: #b3d8ff;
      box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
    }

    &.completed {
      background-color: #f0f9ff;
      border-color: #67c23a;
    }

    &.failed {
      background-color: #fef0f0;
      border-color: #f56c6c;
    }
  }

  .slot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .slot-title {
    font-size: 12px;
    color: #606266;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .slot-status {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    background-color: #f4f4f5;
    color: #909399;

    .progress-slot.uploading & {
      background-color: #409eff;
      color: white;
    }

    .progress-slot.completed & {
      background-color: #67c23a;
      color: white;
    }

    .progress-slot.failed & {
      background-color: #f56c6c;
      color: white;
    }
  }

  .slot-progress-text {
    display: block;
    text-align: center;
    font-size: 11px;
    color: #909399;
    margin-top: 4px;
  }

  .status-text {
    text-align: center;
    font-size: 14px;
    color: #666;
    margin-top: 10px;
  }

  // 进度条样式调整
  ::v-deep .el-progress {
    .el-progress-bar__outer {
      height: 6px;
      border-radius: 3px;
    }

    .el-progress-bar__inner {
      border-radius: 3px;
    }
  }
</style>
