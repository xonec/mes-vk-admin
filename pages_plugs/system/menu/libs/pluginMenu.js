export default function () {
  // 查找插件注册的菜单列表（目前仅在开发模式启用，仅限 admin 角色）
  const pluginMenuJsons = [];
  try {
    if (process.env.NODE_ENV === 'development') {
      // #ifdef VUE2
      const rootModules = require.context('../../../../', false, /-menu.json$/);
      rootModules.keys().forEach((key) => {
        const json = key.substr(2);
        rootModules(key).forEach((item) => {
          item._json = json;
          pluginMenuJsons.push(item);
        });
      });

      const pluginModules = require.context('../../../../uni_modules/', true, /menu.json$/);
      pluginModules.keys().forEach((key) => {
        const json = 'uni_modules' + key.substr(1);
        pluginModules(key).forEach((item) => {
          item._json = json;
          pluginMenuJsons.push(item);
        });
      });
      // #endif
    }
  } catch (err) {
    console.error('err: ', err);
  }
  return pluginMenuJsons;
}
