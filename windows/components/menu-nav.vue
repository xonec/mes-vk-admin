<template>
  <div class="menu-nav">
    <el-menu
      class="el-menu-vertical-demo"
      :style="menuStyleCom"
      :mode="mode"
      :collapse="collapse"
      :background-color="themeConfigCom.backgroundColor || backgroundColor"
      :text-color="themeConfigCom.textColor || textColor"
      :active-text-color="themeConfigCom.activeTextColor || activeTextColor"
      :default-active="defaultActiveCom"
      :default-openeds="privateData.currentOpeneds"
      :unique-opened="uniqueOpened"
      :menu-trigger="menuTrigger"
      :router="router"
      :collapse-transition="collapseTransition"
      @open="open"
      @close="close"
    >
      <menu-sub
        v-for="(item, index) in visibleDataCom"
        :key="item.menu_id"
        :data="item"
        :default-menu-icon="defaultMenuIcon"
        :default-sub-menu-icon="defaultSubMenuIcon"
        @select="select"
      ></menu-sub>
    </el-menu>
  </div>
</template>

<script>
  import MenuSub from './menu-sub.vue';
  export default {
    name: 'menu-nav',
    components: {
      MenuSub,
    },
    props: {
      // 顶层菜单数据
      data: {
        type: Array,
        default: function () {
          return [];
        },
      },
      // 菜单展示模式
      mode: {
        type: String,
        default: 'vertical',
      },
      // 是否折叠菜单
      collapse: {
        type: Boolean,
        default: false,
      },
      // 主题配置对象
      theme: {
        type: [String, Object],
      },
      // 菜单背景色
      backgroundColor: {
        type: String,
        default: '#ffffff',
      },
      // 子菜单背景色
      subBackgroundColor: {
        type: String,
        default: '#ffffff',
      },
      // 菜单文字颜色
      textColor: {
        type: String,
        default: '#303133',
      },
      // 激活菜单文字颜色
      activeTextColor: {
        type: String,
        default: '#409EFF',
      },
      // 激活菜单背景色
      activeBackgroundColor: {
        type: String,
        default: '#ecf5ff',
      },
      // 是否只展开一个子菜单
      uniqueOpened: {
        type: Boolean,
        default: false,
      },
      // 默认展开的菜单项
      defaultOpeneds: {
        type: Array,
        default: function () {
          return [];
        },
      },
      // 子菜单触发方式
      menuTrigger: {
        type: String,
        default: 'hover',
      },
      // 是否启用路由模式
      router: {
        type: Boolean,
        default: false,
      },
      // 是否启用折叠动画
      collapseTransition: {
        type: Boolean,
        default: true,
      },
      // 默认父级菜单图标
      defaultMenuIcon: {
        type: String,
        default: 'el-icon-folder-opened',
      },
      // 默认子级菜单图标
      defaultSubMenuIcon: {
        type: String,
        default: 'el-icon-tickets',
      },
    },
    data: function () {
      return {
        privateData: {
          currentOpeneds: this.defaultOpeneds,
        },
      };
    },
    methods: {
      open(index) {
        this.$emit('open', index);
      },
      close(index) {
        this.$emit('close', index);
      },
      select(item) {
        let { menu_id } = item;
        this.$emit('select', item);
      },
      getMenuInfo(route) {
        let { vk, menuListCom: menuList } = this;
        if (vk.pubfn.isNull(route)) {
          return;
        }
        let { path, url } = route;
        if (vk.pubfn.isNull(menuList)) {
          return;
        }
        let item;
        if (url) item = vk.pubfn.getListItem(menuList, 'url', url);
        if (vk.pubfn.isNull(item) && path) {
          item = vk.pubfn.getListItem(menuList, 'url', path);
        }
        return item;
      },
    },
    computed: {
      menuListCom() {
        return this.vk.getVuex('$app.menuList');
      },
      themeConfigCom() {
        let theme = this.theme;
        let config = {
          backgroundColor: this.backgroundColor,
          subBackgroundColor: this.subBackgroundColor,
          textColor: this.textColor,
          activeTextColor: this.activeTextColor,
          activeBackgroundColor: this.activeBackgroundColor,
          collapseActiveTextColor: this.activeTextColor,
          collapseActiveBackgroundColor: this.activeBackgroundColor,
          hoverTextColor: '#303133',
          hoverBackgroundColor: '#efefef',
        };
        if (theme && theme.use && theme[theme.use] && theme[theme.use].leftMenu) {
          config = {
            ...config,
            ...theme[theme.use].leftMenu,
          };
        }
        return config;
      },
      visibleDataCom() {
        let { data } = this;
        if (!Array.isArray(data) || data.length === 0) {
          return [];
        }
        return data.filter((item) => !item.hiddenMenu && !item.hidden_menu);
      },
      menuStyleCom() {
        let { themeConfigCom } = this;
        return {
          '--activeTextColor': themeConfigCom.activeTextColor,
          '--activeBackgroundColor': themeConfigCom.activeBackgroundColor,
          '--collapseActiveTextColor': themeConfigCom.collapseActiveTextColor,
          '--collapseActiveBackgroundColor': themeConfigCom.collapseActiveBackgroundColor,
          '--backgroundColor': themeConfigCom.backgroundColor,
          '--subBackgroundColor': themeConfigCom.subBackgroundColor,
          '--hoverTextColor': themeConfigCom.hoverTextColor,
          '--hoverBackgroundColor': themeConfigCom.hoverBackgroundColor,
        };
      },
      defaultActiveCom() {
        let { vk } = this;
        let app = vk.getVuex('$app') || {};
        let menu = this.getMenuInfo(app.route);
        return menu ? menu.menu_id : '';
      },
    },
  };
</script>

<style lang="scss" scoped>
  .menu-nav {
    ::v-deep {
      .el-menu-item,
      .el-submenu__title {
        display: flex;
        align-items: center;
      }

      /* 子菜单背景色 */
      .menu-sub .el-menu-item {
        background-color: var(--subBackgroundColor) !important;
      }

      /* 菜单点击后的颜色 */
      .el-menu-item:focus,
      .el-menu-item:hover,
      .el-menu-item.is-active,
      .menu-sub .el-menu-item:focus,
      .menu-sub .el-menu-item:hover,
      .menu-sub .el-menu-item.is-active {
        background-color: var(--activeBackgroundColor) !important;
      }

      /* 子菜单标题focus和hover的背景色 */
      .el-submenu__title:focus,
      .el-submenu__title:hover {
        background-color: var(--backgroundColor) !important;
      }

      /* 菜单hover的背景色 */
      .el-menu-item:hover,
      .menu-sub .el-menu-item:hover {
        background-color: var(--hoverBackgroundColor) !important;
        color: var(--hoverTextColor) !important;
      }

      /* 菜单is-active后的hover的背景色 */
      .el-menu-item.is-active:hover,
      .menu-sub .el-menu-item.is-active:hover {
        background-color: var(--activeBackgroundColor) !important;
        color: var(--activeTextColor) !important;
      }

      /* 菜单is-active后的hover的背景色 */
      .el-menu-item i,
      .el-submenu i,
      .el-submenu__title i {
        color: inherit;
      }

      /* 菜单collapse后 主菜单hover的背景色 */
      .el-menu--collapse .el-submenu__title:focus,
      .el-menu--collapse .el-submenu__title:hover {
        background-color: var(--hoverBackgroundColor) !important;
        color: var(--hoverTextColor) !important;
      }

      /* 菜单collapse后 菜单点击后的颜色 */
      .el-menu--collapse .el-submenu .el-submenu__title:focus,
      .el-menu--collapse .el-submenu .el-submenu__title:hover,
      .el-menu--collapse .el-submenu.is-active .el-submenu__title {
        background-color: var(--collapseActiveBackgroundColor) !important;
        color: var(--collapseActiveTextColor) !important;
      }
    }
  }
</style>
