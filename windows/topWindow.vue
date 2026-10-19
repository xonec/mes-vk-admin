<template>
  <div class="header no-user-select" :class="showMenuTabs ? 'show-menu-tabs' : 'hide-menu-tabs'" v-loading="!appInitedCom" :style="'--textColor' + textColorCom">
    <!-- 左侧 -->
    <div class="left">
      <!-- 模式一：纯图片 -->
      <navigator class="logo-mode-1" open-type="reLaunch" url="/" v-if="mode === 1">
        <image :src="logo1Com" mode="aspectFill" class="logo-image" v-show="leftCollapseCom"></image>
        <image :src="logo2Com" mode="aspectFill" class="logo-image" v-show="!leftCollapseCom"></image>
      </navigator>

      <!-- 模式二：图片+文字 -->
      <navigator class="logo-mode-2" open-type="reLaunch" url="/" v-else>
        <div class="logo-box" v-show="!leftCollapseCom">
          <image class="logo-image" :src="logoCom" mode="scaleToFill"></image>
          <div class="app-name">{{ titleCom }}</div>
        </div>
        <div class="logo-box" v-show="leftCollapseCom">
          <image class="logo-image" :src="logoCom" mode="aspectFit"></image>
        </div>
      </navigator>
    </div>
    <!-- 右侧 -->
    <div class="right">
      <!-- 右上 -->
      <div class="right-top" :style="topMenuStyleCom">
        <div class="navbar" :class="{ 'navbar-mini': !matchLeftWindow }">
          <vk-data-icon
            class="menu-collapse"
            :name="leftCollapseCom ? 'vk-icon-zhankaicaidan' : 'vk-icon-shouqicaidan'"
            :size="17"
            :color="textColorCom"
            :pointer="true"
            @click="menuCollapse"
          ></vk-data-icon>
          <!-- 面包屑 -->
          <breadcrumb></breadcrumb>

          <div class="navbar-left">
            <vk-data-icon @click="toggleSidebar" class="menu-icon pointer" name="vk-icon-sortlight" :size="30" :color="textColorCom"></vk-data-icon>
          </div>
          <div class="navbar-middle">
            <span class="title-text">{{ navigationBarTitleText }}</span>
          </div>
          <div class="navbar-right">
            <div class="navbar-menu">
              <!-- #ifdef WEB -->
              <div v-if="errorLogsCom.length" @click="openForm('errorLog')" class="menu-item debug pointer">
                <el-badge :value="errorLogsCom.length" class="item">
                  <vk-data-icon name="el-icon-message-solid" :size="22" :color="textColorCom"></vk-data-icon>
                </el-badge>
              </div>
              <!-- #endif -->
              <div v-if="appWidthCom >= 1100 && debug" v-for="link in links" :key="link.url" class="menu-item text-overflow">
                <vk-data-link :href="link.url" :text="link.text" />
              </div>
            </div>
            <el-dropdown v-if="isLoginCom" trigger="hover" @command="handleUserMenuCommand">
              <div class="menu-item user-info-item">
                <el-avatar :size="28" :src="avatarCom" icon="el-icon-user-solid" class="menu-avatar"></el-avatar>
                <span class="text-overflow">{{ nicknameCom }}</span>
                <i class="el-icon-arrow-down el-icon--right"></i>
              </div>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="updateUserInfo"><i class="el-icon-user"></i>{{ $t('vk.user.updateUserInfo') }}</el-dropdown-item>
                <el-dropdown-item command="updatePassword"><i class="el-icon-lock"></i>{{ $t('vk.user.updatePassword') }}</el-dropdown-item>
                <el-dropdown-item command="logout"><i class="el-icon-switch-button"></i>{{ $t('vk.user.logout') }}</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
            <div v-else class="menu-item user-info-item" @click="navigateToLogin">
              <vk-data-icon name="el-icon-user" :color="textColorCom" :size="16" style="margin-right: 4px"></vk-data-icon>
              <span>{{ $t('vk.user.login') }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 右下 -->
      <div class="right-bottom" v-show="showMenuTabs">
        <!-- tabs标签组 -->
        <vk-data-menu-tabs v-if="appInitedCom" ref="menuTabs"></vk-data-menu-tabs>
      </div>
    </div>
    <!-- 弹窗 - 错误日志 -->
    <errorLog v-model="formDatas.errorLog"></errorLog>
    <!-- 弹窗 - 修改密码 -->
    <updatePassword v-model="formDatas.updatePassword"></updatePassword>
    <!-- 弹窗 - 修改个人信息 -->
    <updateUserInfo v-model="formDatas.updateUserInfo"></updateUserInfo>
  </div>
</template>

<script>
  import config from '@/app.config.js';
  import breadcrumb from './components/breadcrumb';
  import errorLog from './components/errorLog';
  import updatePassword from './components/updatePassword';
  import updateUserInfo from './components/updateUserInfo';
  export default {
    components: {
      breadcrumb,
      errorLog,
      updatePassword,
      updateUserInfo,
    },
    props: {
      navigationBarTitleText: {
        type: String,
      },
      matchLeftWindow: {
        type: Boolean,
      },
      showLeftWindow: {
        type: Boolean,
      },
    },
    data() {
      return {
        debug: config.debug,
        // 主题配置
        theme: config.theme,
        // 右侧链接，只在开发模式时显示
        links: [
          {
            text: 'Admin框架文档',
            url: 'https://vkdoc.fsq.pub/admin/',
          },
          {
            text: '浏览更多VK插件',
            url: 'https://ext.dcloud.net.cn/search?q=vk',
          },
        ],
        mode: config.topBar.logoMode,
        showMenuTabs: true,
        formDatas: {},
      };
    },
    // 组件挂载完毕时
    mounted() {
      this.vk.menuTabs = this.$refs.menuTabs;
      this.checkMenuCollapse();
      this.checkMenuTabs();
    },
    methods: {
      // 跳转登录页
      navigateToLogin() {
        this.vk.navigateToLogin();
      },
      // 退出登录
      logout() {
        let { vk } = this;
        vk.userCenter.logout({
          success: (data) => {
            if (typeof this.$refs.menuTabs.clear === 'function') this.$refs.menuTabs.clear();
            uni.reLaunch({
              url: config.login.url,
            });
          },
        });
      },
      // 左侧菜单显示和隐藏
      toggleSidebar() {
        if (!this.showLeftWindow) {
          uni.showLeftWindow();
        } else {
          uni.hideLeftWindow();
        }
      },
      // 用户下拉菜单命令处理
      handleUserMenuCommand(command) {
        if (command === 'updateUserInfo') {
          this.openForm('updateUserInfo');
        } else if (command === 'updatePassword') {
          this.openForm('updatePassword');
        } else if (command === 'logout') {
          this.logout();
        }
      },
      // 打开表单
      openForm(name) {
        this.formDatas[name] = {
          show: true,
        };
      },
      // pc状态下菜单折叠
      menuCollapse() {
        let { vk } = this;
        let leftCollapse = vk.getVuex('$app.leftCollapse');
        vk.setVuex('$app.leftCollapse', !leftCollapse);
      },
      checkMenuCollapse() {
        let { vk } = this;
        let leftCollapse = vk.getVuex('$app.leftCollapse');
        if (!leftCollapse) {
          // 打开
          uni.setLeftWindowStyle({
            width: this.leftWidthCom,
          });
        } else {
          // 折叠
          uni.setLeftWindowStyle({
            width: '64px',
          });
        }
      },
      checkMenuTabs() {
        if (config.topBar.showMenuTabs === false) {
          this.showMenuTabs = false;
          uni.setTopWindowStyle({
            height: '60px',
          });
        }
      },
    },
    // 监听属性
    watch: {
      leftCollapseCom() {
        this.checkMenuCollapse();
      },
    },
    // 计算属性
    computed: {
      leftCollapseCom() {
        return this.vk.getVuex('$app.leftCollapse');
      },
      appInitedCom() {
        return this.vk.getVuex('$app.inited');
      },
      logo1Com() {
        return this.vk.getVuex('$app.config.staticUrl.navBar.logo1');
      },
      logo2Com() {
        return this.vk.getVuex('$app.config.staticUrl.navBar.logo2');
      },
      titleCom() {
        return this.vk.getVuex('$app.config.topBar.logoTitle');
      },
      logoCom() {
        return this.vk.getVuex('$app.config.staticUrl.navBar.logo');
      },
      nicknameCom() {
        const userInfo = this.vk.getVuex('$user.userInfo') || {};
        return userInfo.nickname || userInfo.username || '';
      },
      isLoginCom() {
        const userInfo = this.vk.getVuex('$user.userInfo');
        return userInfo && userInfo._id;
      },
      avatarCom() {
        const userInfo = this.vk.getVuex('$user.userInfo') || {};
        return userInfo.avatar || '';
      },
      errorLogsCom() {
        return this.vk.getVuex('$error.logs');
      },
      appWidthCom() {
        return this.vk.getVuex('$app.width');
      },
      topMenuStyleCom() {
        let theme = this.theme;
        if (theme && theme.use) {
          let topMenu = theme[theme.use].topMenu;
          let { backgroundColor, textColor } = topMenu;
          return {
            backgroundColor,
            color: textColor,
          };
        } else {
          return {};
        }
      },
      textColorCom() {
        let theme = this.theme;
        if (theme && theme.use) {
          return theme[theme.use].topMenu.textColor || '#999';
        } else {
          return '#999';
        }
      },
      leftWidthCom() {
        let theme = this.theme;
        if (theme && theme.use) {
          return theme[theme.use].leftMenu.width || '240px';
        } else {
          return '240px';
        }
      },
    },
  };
</script>

<style lang="scss">
  .header {
    height: 100px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    border-bottom: 1px solid darken($top-window-bg-color, 3%);
    color: $top-window-text-color;
    background-color: #f5f5f5;

    &.hide-menu-tabs {
      height: 60px;
    }

    /* 左侧 */
    .left {
      width: calc(var(--window-left));
    }

    /* 右侧 */
    .right {
      width: calc(100% - var(--window-left));

      .navbar {
        font-size: 13px;
        position: relative;
        height: 100%;
        padding: 0 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .menu-icon {
        width: 30px;
        height: 30px;
        line-height: 30px;
      }

      .menu-collapse {
        width: 30px;
        height: 30px;
        line-height: 30px;
      }

      .navbar-left,
      .navbar-middle,
      .navbar-right {
        flex: 1;
      }

      .navbar-middle,
      .username {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .navbar-middle {
        text-align: center;
      }

      .username {
        max-width: 150px;
      }

      .text-overflow {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .text-overflow {
        max-width: 150px;
      }

      .title-text {
        font-size: 13px;
        line-height: 30px;
      }

      .navbar-menu {
        display: flex;
      }

      .menu-item {
        padding: 5px;
        display: flex;
        align-items: center;
      }

      .user-info-item {
        cursor: pointer;
      }

      .menu-avatar {
        margin-right: 6px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .debug {
        display: inline-block;
        position: relative;
      }

      .debug-badge {
        position: absolute;
        top: 5px;
        right: 13px;
        transform: translateY(-50%) translateX(100%) scale(0.8);
      }

      .arrowdown {
        margin-top: 4px;
        margin-left: 3px;
      }

      .navbar-right {
        display: flex;
        justify-content: flex-end;
      }

      /* 大屏时，隐藏的内容 */
      .menu-icon,
      .navbar-middle,
      .navbar-user {
        display: none;
      }

      /* 小屏，显示的内容 */
      .navbar-mini .menu-icon,
      .navbar-mini .navbar-middle {
        display: block;
      }

      .navbar-mini .navbar-user {
        display: flex;
        align-items: center;
      }

      .navbar-mini .user-info {
        display: flex;
        align-items: center;
      }

      .user-avatar {
        margin-right: 8px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .login-btn {
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0 10px;
      }

      /* 小屏时，隐藏的内容 */
      .navbar-mini .menu-collapse,
      .navbar-mini .logo,
      .navbar-mini .debug,
      .navbar-mini .navbar-menu,
      .navbar-mini .navbar-menu .username,
      .navbar-mini .breadcrumb-view,
      .navbar-mini .mini-none {
        display: none;
      }
    }

    /* 右上 */
    .right-top {
      height: 50px;
    }

    /* 右下 */
    .right-bottom {
      padding: 0px 12px;
      height: 50px;
      background-color: #f5f5f5;
    }

    ::v-deep .navbar .top-bar .item-content {
      color: var(--textColor);
    }

    /* logo模式一开始 纯图片 */
    .logo-mode-1 {
      display: flex;
      align-items: center;
      justify-content: center;

      .logo-image {
        width: 100%;
        height: 50px;
        display: block;
      }
    }

    /* logo模式一结束 */

    /* logo模式二开始 logo+文字 */
    .logo-mode-2 {
      .logo-box {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #191a23;
        height: 50px;

        .logo-image {
          width: 38px;
          height: 38px;
          margin-left: 10px;
          margin-right: 10px;
          border-radius: 50%;
        }

        .app-name {
          width: 100%;
          text-align: left;
          flex: 1;
          line-height: 50px;
          font-size: 20px;
          background-image: -webkit-linear-gradient(left, #147b96, #e6d205 25%, #147b96 50%, #e6d205 75%, #147b96);
          -webkit-text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-background-size: 200% 100%;
          -webkit-animation: masked-animation 4s infinite linear;
          display: inline-block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @-webkit-keyframes masked-animation {
          0% {
            background-position: 0 0;
          }

          100% {
            background-position: -100% 0;
          }
        }
      }
    }

    /* logo模式二结束 */
  }
</style>
