<template>
  <div v-if="shouldRenderCom" class="menu-sub">
    <el-submenu :index="data.menu_id" v-if="hasChildrenCom" popper-class="vk-submenu">
      <template slot="title">
        <i :class="iconCom"></i>
        <span class="menu-name">{{ data.name }}</span>
      </template>
      <menu-sub
        v-for="(item, index) in visibleChildrenCom"
        :key="item.menu_id"
        :data="item"
        :default-menu-icon="defaultMenuIcon"
        :default-sub-menu-icon="defaultSubMenuIcon"
        @select="handleSelect"
      ></menu-sub>
    </el-submenu>
    <el-menu-item :index="data.menu_id" v-else @click="clickMenuItem(data)">
      <i :class="iconCom"></i>
      <span slot="title" class="menu-name">{{ data.name }}</span>
    </el-menu-item>
  </div>
</template>

<script>
  export default {
    name: 'menu-sub',
    components: {
      MenuSub: () => import('./menu-sub.vue'),
    },
    props: {
      // 当前菜单项数据
      data: {
        type: Object,
        default: function () {
          return {};
        },
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
      return {};
    },
    methods: {
      isMenuNavigable(menu) {
        return typeof menu.url === 'string' && menu.url.trim().length > 0;
      },
      handleSelect(item) {
        this.$emit('select', item);
      },
      clickMenuItem(menu) {
        let { vk, navigateModeCom } = this;
        if (!this.isMenuNavigable(menu)) {
          return false;
        }
        let { url } = menu;
        this.handleSelect(menu);
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return window.open(url);
        }
        let pageTo = navigateModeCom === 'navigateTo' ? vk.navigateTo : vk.redirectTo;
        pageTo({
          url,
          fail: (err) => {
            uni.showModal({
              title: this.$t('vk.common.tip'),
              content: this.$t('vk.menuSub.navigateFailed', { url }),
              showCancel: false,
            });
            console.error(err);
          },
        });
      },
    },
    computed: {
      navigateModeCom() {
        return this.vk.getVuex('$app.config.sideBar.navigateMode') || 'redirectTo';
      },
      shouldRenderCom() {
        return this.hasChildrenCom || this.isMenuNavigable(this.data);
      },
      visibleChildrenCom() {
        let { data } = this;
        let list = data.children;
        if (!Array.isArray(list) || list.length === 0) {
          return [];
        }
        return list.filter((item) => !item.hiddenMenu && !item.hidden_menu);
      },
      iconCom() {
        let { data, defaultMenuIcon, defaultSubMenuIcon, visibleChildrenCom } = this;
        let name = '';
        if (data.icon) {
          name = data.icon;
        } else {
          if (visibleChildrenCom.length > 0) {
            name = defaultMenuIcon;
          } else {
            name = defaultSubMenuIcon;
          }
        }
        let s = '';
        let index = name.lastIndexOf('-icon-');
        if (index > -1 && name.indexOf('el-icon-') !== 0) {
          let prefix = name.substring(0, index + 5);
          s = `menu-custom-icon ${prefix} ${name}`;
        } else {
          s = `menu-custom-icon ${name}`;
        }
        return s;
      },
      hasChildrenCom() {
        return this.visibleChildrenCom.length > 0;
      },
    },
  };
</script>

<style lang="scss" scoped>
  .menu-sub {
    user-select: none;

    .menu-custom-icon {
      vertical-align: middle;
      margin-right: 5px;
      width: 24px;
      text-align: center;
      font-size: 16px;
      display: inline-block;
      font-weight: 400;
      font-variant: normal;
      text-transform: none;
      line-height: 1;
    }
  }
</style>
