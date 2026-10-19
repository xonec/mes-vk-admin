<template>
  <div v-if="value.show" class="slideshow-container" @click="onContainerClick">
    <!-- 全屏背景 -->
    <div class="slideshow-backdrop" @click="closeSlideshow"></div>

    <!-- 主要内容区域 -->
    <div class="slideshow-content" @click.stop>
      <!-- 媒体显示区域 -->
      <div class="media-container">
        <!-- 图片显示 -->
        <image
          v-if="currentFile && currentFile.type === 'image'"
          :src="currentFileURL"
          mode="aspectFit"
          class="media-item"
          :style="getImageStyle(currentFile)"
          @error="onMediaError"
        ></image>

        <!-- 视频显示 -->
        <iframe
          v-else-if="currentFile && ['html', 'htm'].indexOf(getFileFormatFromUrl(currentFileURL)) > -1"
          :src="currentFileURL"
          class="media-item preview-iframe"
          :style="getVideoStyle(currentFile)"
        ></iframe>
        <video
          v-else-if="currentFile && currentFile.type === 'video'"
          ref="videoPlayer"
          :src="currentFileURL"
          :autoplay="false"
          :controls="false"
          object-fit="contain"
          class="media-item"
          :style="getVideoStyle(currentFile)"
          @error="onMediaError"
          @ended="onVideoEnded"
          @play="onVideoPlay"
          @pause="onVideoPause"
        ></video>
      </div>

      <!-- 播放信息 - 放在最上面 -->
      <div class="play-info-top" :class="{ 'play-info-hidden': !showControls }">
        <span class="file-name">{{ currentFile ? currentFile.display_name : '' }}</span>
        <span class="play-progress">{{ currentIndex + 1 }} / {{ currentFileList.length }}</span>
      </div>

      <!-- 播放控制栏 -->
      <div class="control-bar" :class="{ 'control-bar-hidden': !showControls }">
        <!-- 左侧播放设置 -->
        <div class="play-settings">
          <!-- 图片模式下的控制项 -->
          <template v-if="!currentFile || currentFile.type !== 'video'">
            <div class="setting-item">
              <span class="setting-label">{{ $t('vk.assetLibrary.slideShow.autoPlay') }}</span>
              <el-switch v-model="autoPlay" size="mini" @change="onAutoPlayChange"></el-switch>
            </div>
            <div class="setting-item" v-if="autoPlay">
              <span class="setting-label">{{ $t('vk.assetLibrary.slideShow.interval') }}</span>
              <el-input-number v-model="playInterval" :min="1" :max="99" size="mini" @change="onIntervalChange"></el-input-number>
              <span class="setting-label">{{ $t('vk.assetLibrary.slideShow.seconds') }}</span>
            </div>
            <div class="setting-item">
              <span class="setting-label">{{ $t('vk.assetLibrary.slideShow.loopPlay') }}</span>
              <el-switch v-model="loopPlay" size="mini"></el-switch>
            </div>
          </template>

          <!-- 视频模式下的控制项 -->
          <template v-else>
            <div class="setting-item">
              <span class="setting-label">{{ $t('vk.assetLibrary.slideShow.videoMode') }}</span>
              <span class="setting-label" style="opacity: 0.7">{{ $t('vk.assetLibrary.slideShow.manualControl') }}</span>
            </div>
          </template>
        </div>

        <!-- 播放控制按钮 - 固定在中间 -->
        <div class="control-buttons">
          <div class="control-btn" @click="previous" :disabled="!loopPlay && currentFileList.length <= 1">
            <vk-data-icon name="el-icon-arrow-left" size="20" color="#ffffff"></vk-data-icon>
          </div>

          <div class="control-btn play-btn" @click="togglePlay">
            <vk-data-icon :name="isPlaying ? 'el-icon-video-pause' : 'el-icon-video-play'" size="24" color="#ffffff"></vk-data-icon>
          </div>

          <div class="control-btn" @click="next" :disabled="!loopPlay && currentFileList.length <= 1">
            <vk-data-icon name="el-icon-arrow-right" size="20" color="#ffffff"></vk-data-icon>
          </div>
        </div>

        <!-- 右侧图片缩放控制按钮 - 仅在显示图片时显示 -->
        <div class="control-right">
          <div class="zoom-controls" v-if="currentFile && currentFile.type === 'image'">
            <div class="zoom-btn" @click="zoomOut" :disabled="imageZoomScale <= minZoomScale">
              <vk-data-icon name="el-icon-zoom-out" size="16" color="#ffffff"></vk-data-icon>
            </div>
            <div class="zoom-info">{{ Math.round(imageZoomScale * 100) }}%</div>
            <div class="zoom-btn" @click="zoomIn" :disabled="imageZoomScale >= maxZoomScale">
              <vk-data-icon name="el-icon-zoom-in" size="16" color="#ffffff"></vk-data-icon>
            </div>
            <div class="zoom-btn" @click="resetZoom">
              <vk-data-icon name="el-icon-refresh" size="16" color="#ffffff"></vk-data-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <div class="close-btn" @click="closeSlideshow">
        <vk-data-icon name="el-icon-close" size="24" color="#ffffff"></vk-data-icon>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar" v-if="currentFileList.length > 1">
        <div class="progress-fill" :style="{ width: ((currentIndex + 1) / currentFileList.length) * 100 + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
      value: {
        type: Object,
        default: function () {
          return {
            show: false,
            fileList: [],
            currentIndex: 0,
            autoPlay: true,
          };
        },
      },
    },
    data() {
      return {
        // 播放状态
        isPlaying: false,
        autoPlay: true,
        playInterval: 3,
        loopPlay: true,
        showControls: true,
        manualPlayMode: false, // 手动播放模式

        // 定时器
        playTimer: null,
        controlTimer: null,

        // 当前播放的文件
        currentFile: null,

        // 图片缩放相关
        imageZoomScale: 1, // 当前缩放比例
        minZoomScale: 0.1, // 最小缩放比例
        maxZoomScale: 5, // 最大缩放比例
        zoomStep: 0.2, // 每次缩放的步长
      };
    },
    computed: {
      // 当前文件列表
      currentFileList() {
        return this.value.fileList || [];
      },
      // 当前索引
      currentIndex() {
        return this.value.currentIndex || 0;
      },
      currentFileURL() {
        if (this.currentFile) {
          return this.currentFile.tempFileURL || this.currentFile.url;
        }
        return '';
      },
    },
    mounted() {
      this.init();
    },
    methods: {
      // 初始化
      init() {
        this.updateCurrentFile();
        this.bindKeyboardEvents();
      },

      // 更新当前文件
      updateCurrentFile() {
        if (this.currentFileList.length > 0 && this.value.currentIndex >= 0 && this.value.currentIndex < this.currentFileList.length) {
          this.currentFile = this.currentFileList[this.value.currentIndex];
          // 切换到新文件时重置缩放比例
          this.resetZoom();
          // 如果是视频文件，重置播放状态
          if (this.currentFile && this.currentFile.type === 'video') {
            this.isPlaying = false;
          }
        } else {
          this.currentFile = null;
        }
      },

      // 绑定键盘事件
      bindKeyboardEvents() {
        document.addEventListener('keydown', this.handleKeydown);
      },

      // 解绑键盘事件
      unbindKeyboardEvents() {
        document.removeEventListener('keydown', this.handleKeydown);
      },

      // 键盘事件处理
      handleKeydown(event) {
        if (!this.value.show) return;

        switch (event.key) {
          case 'Escape':
            this.closeSlideshow();
            break;
          case 'ArrowLeft':
            this.previous();
            break;
          case 'ArrowRight':
            this.next();
            break;
          case ' ':
            event.preventDefault();
            this.togglePlay();
            break;
          case 'f':
          case 'F':
            this.toggleFullscreen();
            break;
        }
      },

      // 容器点击事件
      onContainerClick() {
        this.toggleControls();
      },

      // 切换控制栏显示
      toggleControls() {
        this.showControls = !this.showControls;
        if (this.showControls) {
          this.startControlTimer();
        } else {
          this.clearControlTimer();
        }
      },

      // 开始控制栏定时器
      startControlTimer() {
        this.clearControlTimer();
        this.controlTimer = setTimeout(() => {
          this.showControls = false;
        }, 3000);
      },

      // 清除控制栏定时器
      clearControlTimer() {
        if (this.controlTimer) {
          clearTimeout(this.controlTimer);
          this.controlTimer = null;
        }
      },

      // 上一张
      previous() {
        if (this.value.currentIndex > 0) {
          this.value.currentIndex--;
        } else if (this.loopPlay && this.currentFileList.length > 1) {
          this.value.currentIndex = this.currentFileList.length - 1;
        }
        this.updateCurrentFile();
        this.resetPlayState();
      },

      // 下一张
      next() {
        if (this.value.currentIndex < this.currentFileList.length - 1) {
          this.value.currentIndex++;
          this.updateCurrentFile();
          this.resetPlayState();
        } else if (this.loopPlay) {
          this.value.currentIndex = 0;
          this.updateCurrentFile();
          this.resetPlayState();
        }
      },

      // 切换播放状态
      togglePlay() {
        // 如果是视频文件，直接控制video元素
        if (this.currentFile && this.currentFile.type === 'video') {
          this.toggleVideoPlay();
        } else {
          // 图片轮播的逻辑
          this.isPlaying = !this.isPlaying;
          if (this.isPlaying) {
            // 如果自动播放开启，使用自动播放模式
            if (this.autoPlay) {
              this.manualPlayMode = false;
              this.startAutoPlay();
            } else {
              // 如果自动播放关闭，使用手动播放模式
              this.manualPlayMode = true;
              this.startManualPlay();
            }
          } else {
            this.stopAutoPlay();
            this.manualPlayMode = false;
          }
        }
      },

      // 切换视频播放状态
      toggleVideoPlay() {
        if (this.$refs.videoPlayer) {
          if (this.isPlaying) {
            this.$refs.videoPlayer.pause();
          } else {
            this.$refs.videoPlayer.play();
          }
        }
      },

      // 开始自动播放
      startAutoPlay() {
        if (!this.autoPlay) return;
        // 如果是视频文件，不启动自动切换
        if (this.currentFile && this.currentFile.type === 'video') return;

        this.stopAutoPlay();
        this.playTimer = setTimeout(() => {
          this.next();
          if (this.isPlaying && !this.manualPlayMode) {
            this.startAutoPlay();
          }
        }, this.playInterval * 1000);
      },

      // 开始手动播放
      startManualPlay() {
        // 如果是视频文件，不启动自动切换
        if (this.currentFile && this.currentFile.type === 'video') return;

        this.stopAutoPlay();
        this.playTimer = setTimeout(() => {
          this.next();
          if (this.isPlaying && this.manualPlayMode) {
            this.startManualPlay();
          }
        }, this.playInterval * 1000);
      },

      // 停止自动播放
      stopAutoPlay() {
        if (this.playTimer) {
          clearTimeout(this.playTimer);
          this.playTimer = null;
        }
      },

      // 重置播放状态
      resetPlayState() {
        this.stopAutoPlay();
        // 如果是视频文件，不启动自动切换
        if (this.currentFile && this.currentFile.type === 'video') return;

        if (this.isPlaying) {
          if (this.autoPlay && !this.manualPlayMode) {
            this.startAutoPlay();
          } else if (this.manualPlayMode) {
            this.startManualPlay();
          }
        }
      },

      // 自动播放设置改变
      onAutoPlayChange(value) {
        // 如果是视频文件，不启动自动切换
        if (this.currentFile && this.currentFile.type === 'video') {
          this.stopAutoPlay();
          this.manualPlayMode = false;
          return;
        }

        if (value && this.isPlaying) {
          this.manualPlayMode = false;
          this.startAutoPlay();
        } else if (!value && this.isPlaying) {
          // 如果关闭自动播放但正在播放，切换到手动播放模式
          this.manualPlayMode = true;
          this.startManualPlay();
        } else {
          this.stopAutoPlay();
          this.manualPlayMode = false;
        }
      },

      // 播放间隔改变
      onIntervalChange(value) {
        // 如果是视频文件，不启动自动切换
        if (this.currentFile && this.currentFile.type === 'video') return;

        if (this.isPlaying) {
          this.resetPlayState();
        }
      },

      // 视频播放结束
      onVideoEnded() {
        // 视频模式下不自动切换到下一张，让用户手动控制
        // 如果需要自动切换，可以取消下面的注释
        // if (this.autoPlay || this.manualPlayMode) {
        // 	this.next();
        // }
      },

      // 视频开始播放
      onVideoPlay() {
        this.isPlaying = true;
      },

      // 视频暂停
      onVideoPause() {
        this.isPlaying = false;
      },

      // 媒体加载错误
      onMediaError() {
        this.$message.error(this.$t('vk.assetLibrary.slideShow.mediaLoadFailed'));
      },

      // 切换全屏
      toggleFullscreen() {
        this.$message.info(this.$t('vk.assetLibrary.slideShow.fullscreenNotImplemented'));
      },

      // 关闭幻灯片
      closeSlideshow() {
        this.stopAutoPlay();
        this.clearControlTimer();
        this.unbindKeyboardEvents();
        this.manualPlayMode = false;
        this.value.show = false; // 关闭页面
      },

      // 获取图片样式
      getImageStyle(item) {
        if (!item || !item.width || !item.height) {
          return {};
        }

        let { width, height } = item;
        let maxWidth = window.innerWidth * 0.9;
        let maxHeight = window.innerHeight * 0.8;

        let showWidth = width;
        let showHeight = height;

        // 先计算基础缩放比例
        if (width > maxWidth || height > maxHeight) {
          let scale = Math.min(maxWidth / width, maxHeight / height);
          showWidth = width * scale;
          showHeight = height * scale;
        }

        // 应用用户设置的缩放比例
        showWidth = showWidth * this.imageZoomScale;
        showHeight = showHeight * this.imageZoomScale;

        return {
          width: `${showWidth}px`,
          height: `${showHeight}px`,
        };
      },

      // 放大图片
      zoomIn() {
        if (this.imageZoomScale < this.maxZoomScale) {
          this.imageZoomScale = Math.min(this.imageZoomScale + this.zoomStep, this.maxZoomScale);
        }
      },

      // 缩小图片
      zoomOut() {
        if (this.imageZoomScale > this.minZoomScale) {
          this.imageZoomScale = Math.max(this.imageZoomScale - this.zoomStep, this.minZoomScale);
        }
      },

      // 重置缩放
      resetZoom() {
        this.imageZoomScale = 1;
      },

      // 获取视频样式
      getVideoStyle(item) {
        if (!item || !item.width || !item.height) {
          return {};
        }

        let { width, height } = item;
        let maxWidth = window.innerWidth * 0.9;
        let maxHeight = window.innerHeight * 0.8;

        let showWidth = width;
        let showHeight = height;

        if (width > maxWidth || height > maxHeight) {
          let scale = Math.min(maxWidth / width, maxHeight / height);
          showWidth = width * scale;
          showHeight = height * scale;
        }

        return {
          width: `${showWidth}px`,
          height: `${showHeight}px`,
        };
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
    },
    watch: {
      'value.show': {
        handler(newValue) {
          if (newValue) {
            this.updateCurrentFile();
            this.bindKeyboardEvents();
            if (this.value.autoPlay !== undefined) {
              this.autoPlay = this.value.autoPlay;
            }
            // 只有在非视频模式下才启动自动播放
            if (this.autoPlay && (!this.currentFile || this.currentFile.type !== 'video')) {
              this.isPlaying = true;
              this.startAutoPlay();
            }
          } else {
            this.unbindKeyboardEvents();
            this.stopAutoPlay();
            this.clearControlTimer();
          }
        },
      },
      'value.currentIndex': {
        handler() {
          this.updateCurrentFile();
        },
      },
      'value.autoPlay': {
        handler(newValue) {
          if (newValue !== undefined) {
            this.autoPlay = newValue;
          }
        },
      },
    },
    beforeDestroy() {
      this.unbindKeyboardEvents();
      this.stopAutoPlay();
      this.clearControlTimer();
    },
  };
</script>

<style lang="scss" scoped>
  .slideshow-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .slideshow-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
  }

  .slideshow-content {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .media-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-sizing: border-box;
  }

  .media-item {
    object-fit: contain;
    min-width: 0;
    min-height: 0;
  }

  .preview-iframe {
    width: 80vw;
    height: 75vh;
    display: block;
  }
  // 顶部播放信息
  .play-info-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(rgba(0, 0, 0, 0.8), transparent);
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    z-index: 10;

    &.play-info-hidden {
      transform: translateY(-100%);
      opacity: 0;
    }

    .file-name {
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80%;
      text-align: center;
    }

    .play-progress {
      font-size: 14px;
      color: #ffffff;
      opacity: 0.8;
    }
  }

  .control-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 80px;
    transition: all 0.3s ease;

    &.control-bar-hidden {
      transform: translateY(100%);
      opacity: 0;
    }
  }

  .control-right {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .control-buttons {
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 0 0 auto;
  }

  .control-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;

      &:hover {
        transform: none;
        background-color: rgba(255, 255, 255, 0.2);
      }
    }

    &.play-btn {
      width: 60px;
      height: 60px;
      background-color: rgba(255, 255, 255, 0.3);
    }
  }

  // 图片缩放控制按钮样式
  .zoom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 8px 12px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
  }

  .zoom-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;

      &:hover {
        transform: none;
        background-color: rgba(255, 255, 255, 0.2);
      }
    }
  }

  .zoom-info {
    color: #ffffff;
    font-size: 14px;
    font-weight: bold;
    min-width: 50px;
    text-align: center;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    border-radius: 12px;
  }

  .play-settings {
    display: flex;
    align-items: center;
    gap: 20px;
    color: #ffffff;
    flex: 0 0 auto;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 8px 12px;
    border-radius: 20px;
    backdrop-filter: blur(10px);
  }

  .setting-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .setting-label {
      font-size: 14px;
      white-space: nowrap;
    }
  }

  .close-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 99;

    &:hover {
      background-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
  }

  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background-color: rgba(255, 255, 255, 0.3);
  }

  .progress-fill {
    height: 100%;
    background-color: #409eff;
    transition: width 0.3s ease;
  }

  // 美化间隔(秒)输入框样式
  ::v-deep .el-input-number {
    width: 100px !important;
    height: 32px !important;

    .el-input__inner {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05)) !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      border-radius: 16px !important;
      color: #ffffff !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      text-align: center !important;
      backdrop-filter: blur(10px) !important;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
      transition: all 0.3s ease !important;
      height: 32px !important;
      line-height: 30px !important;

      &:hover {
        border-color: rgba(255, 255, 255, 0.5) !important;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1)) !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
        transform: translateY(-1px) !important;
      }

      &:focus {
        border-color: #409eff !important;
        background: linear-gradient(135deg, rgba(64, 158, 255, 0.2), rgba(255, 255, 255, 0.1)) !important;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3), 0 6px 20px rgba(0, 0, 0, 0.3) !important;
        transform: translateY(-1px) !important;
      }

      &::placeholder {
        color: rgba(255, 255, 255, 0.6) !important;
      }
    }

    .el-input-number__decrease,
    .el-input-number__increase {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05)) !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      color: #ffffff !important;
      width: 24px !important;
      height: 24px !important;
      line-height: 22px !important;
      border-radius: 50% !important;
      transition: all 0.3s ease !important;
      backdrop-filter: blur(10px) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;

      &:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1)) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
      }

      &:active {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.2)) !important;
        border-color: rgba(255, 255, 255, 0.7) !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
      }
    }

    .el-input-number__decrease {
      left: 4px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
    }

    .el-input-number__increase {
      right: 4px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
    }

    &:hover .el-input-number__decrease,
    &:hover .el-input-number__increase {
      opacity: 1 !important;
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    .media-container {
      padding: 10px;
    }

    // 移动端顶部播放信息样式调整
    .play-info-top {
      padding: 15px;

      .file-name {
        font-size: 16px;
        max-width: 90%;
      }

      .play-progress {
        font-size: 12px;
      }
    }

    .control-bar {
      flex-direction: column;
      gap: 15px;
      padding: 15px;
    }

    .control-right {
      max-width: 100%;
      justify-content: center;
    }

    .play-settings {
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      max-width: 100%;
    }

    .control-buttons {
      position: relative;
      left: auto;
      top: auto;
      transform: none;
      justify-content: center;
      gap: 10px;
    }

    .control-btn {
      width: 40px;
      height: 40px;

      &.play-btn {
        width: 50px;
        height: 50px;
      }
    }

    // 移动端缩放控制按钮样式调整
    .zoom-controls {
      padding: 6px 10px;
      gap: 6px;
    }

    .zoom-btn {
      width: 28px;
      height: 28px;
    }

    .zoom-info {
      font-size: 12px;
      min-width: 40px;
      padding: 2px 6px;
    }

    // 移动端输入框样式调整
    ::v-deep .el-input-number {
      width: 90px !important;
      height: 28px !important;

      .el-input__inner {
        height: 28px !important;
        line-height: 26px !important;
        font-size: 12px !important;
      }

      .el-input-number__decrease,
      .el-input-number__increase {
        width: 20px !important;
        height: 20px !important;
        line-height: 18px !important;
      }
    }
  }
</style>
