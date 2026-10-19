<template>
  <scroll-view class="sidebar" :class="classCom" scroll-y="true" v-loading="!initedCom" :style="styleCom">
    <menu-nav
      v-if="initedCom"
      :data="navMenuCom"
      :unique-opened="true"
      :collapse="leftCollapseCom"
      :collapse-transition="false"
      :theme="theme"
      default-menu-icon="el-icon-folder-opened"
      default-sub-menu-icon="el-icon-tickets"
      :defaultOpeneds="defaultOpeneds"
      @select="select"
    ></menu-nav>
  </scroll-view>
</template>

<script>
  import config from '@/app.config.js';
  import MenuNav from './components/menu-nav.vue';
  export default {
    components: {
      MenuNav,
    },
    data() {
      return {
        theme: config.theme,
        defaultOpeneds: config.sideBar.defaultOpeneds,
      };
    },
    methods: {
      select(e) {},
    },
    // 监听属性
    watch: {
      $route: {
        immediate: true,
        handler(newRoute, oldRoute) {
          let { vk } = this;
          let { path, query } = newRoute;
          let url = path + vk.pubfn.queryParams(query);
          let route = { path, query, url };
          vk.setVuex('$app.route', route);
        },
      },
    },
    // 计算属性
    computed: {
      isPC() {
        return this.vk.getVuex('$app.isPC');
      },
      initedCom() {
        return this.vk.getVuex('$app.inited');
      },
      navMenuCom() {
        return this.vk.getVuex('$app.navMenu');
      },
      leftCollapseCom() {
        return this.vk.getVuex('$app.leftCollapse');
      },
      styleCom() {
        let theme = this.theme;
        if (theme && theme.use) {
          if (this.leftCollapseCom) {
            return {
              ...theme[theme.use].leftMenu,
              width: '64px',
            };
          } else {
            return theme[theme.use].leftMenu;
          }
        } else {
          return {};
        }
      },
      classCom() {
        return {
          pc: this.isPC,
          mobile: !this.isPC,
          collapse: this.leftCollapseCom,
        };
      },
    },
  };
</script>

<style lang="scss">
  .sidebar {
    position: fixed;
    top: var(--window-top);
    width: 240px;
    height: calc(100vh - (var(--window-top)) + 50px);
    box-sizing: border-box;
    box-shadow: var(--boxShadow, 2px 0 0px rgba(0, 21, 4, 0.2));
    border-top: var(--borderTop);
    background-color: $left-window-bg-color;
    padding-bottom: 10px;
    top: 50px;
    z-index: 998;
  }
  .sidebar.collapse {
    width: 64px;
  }
  .title {
    margin-left: 5px;
  }
  .center {
    text-align: center;
    margin-top: 100px;
  }
</style>
