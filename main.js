import Vue from 'vue';
import App from './App';
import store from './store';
import config from '@/app.config.js';

// 引入 elementUI
import elementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

// 加载 Element UI 的语言包
import enLocale from 'element-ui/lib/locale/lang/en';
import zhHansLocale from 'element-ui/lib/locale/lang/zh-CN';
import zhHantLocale from 'element-ui/lib/locale/lang/zh-TW';

const elLocale = {
  en: enLocale,
  'zh-Hans': zhHansLocale,
  'zh-Hant': zhHantLocale,
};
// 加载 vk 语言包
import vkLocale from './locale/index';

const messages = {
  // 英文
  en: {
    ...elLocale['en'],
    ...vkLocale['en'],
  },
  // 简体中文
  'zh-Hans': {
    ...elLocale['zh-Hans'],
    ...vkLocale['zh-Hans'],
  },
  // 繁体中文
  'zh-Hant': {
    ...elLocale['zh-Hant'],
    ...vkLocale['zh-Hant'],
  },
};

// 引入 vue-i18n
import VueI18n from 'vue-i18n';
Vue.use(VueI18n);

const i18n = new VueI18n({
  locale: uni.getLocale() || 'zh-Hans', // 页面上通过执行 uni.setLocale('en') 可设置为英文（需要刷新页面才生效）
  messages,
});

Vue.use(elementUI, {
  i18n: (key, value) => i18n.t(key, value),
});

// 引入 高性能表格UI 组件
import UmyUi from 'umy-ui';
import 'umy-ui/lib/theme-chalk/index.css';
Vue.use(UmyUi);

// 引入 vk 实例
import vk from 'uni_modules/vk-unicloud';
config.i18n = i18n;
Vue.use(vk, config);

// 引入 vkAdminUI 组件
import vkAdminUI from 'vk-unicloud-admin-ui';
import 'vk-unicloud-admin-ui/theme/index.css';
Vue.use(vkAdminUI);

// 自动注册全局组件（必须加在Vue.use(vkAdminUI);的后面）
const modulesFiles = require.context('./components', true, /\.vue$/);
modulesFiles.keys().map((modulePath, index) => {
  const moduleNames = modulePath.replace(/^\.\/(.*)\.\w+$/, '$1');
  const moduleSplit = moduleNames.split('/');
  const moduleName = moduleSplit[0];
  if (moduleSplit.length === 2 && moduleName === moduleSplit[1]) {
    const value = modulesFiles(modulePath);
    let moduleItem = value.default;
    Vue.component(moduleName, moduleItem);
  }
});

// 引入 自定义全局css 样式
import '@/common/css/app.scss';

Vue.config.productionTip = false;

App.mpType = 'app';

const app = new Vue({
  i18n,
  store,
  ...App,
});
app.$mount();
