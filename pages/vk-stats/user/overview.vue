<template>
  <view class="page-body">
    <!-- 页面内容开始 -->
    <stat-alert @refresh="refresh"></stat-alert>
    <getUserCount></getUserCount>
    <getLoginUserCount></getLoginUserCount>
    <el-row>
      <el-col :span="24">
        <vk-data-charts title="新增用户趋势图" url="admin/system_uni/sys.stats.getNewUserCountGroup"></vk-data-charts>
      </el-col>
    </el-row>

    <el-row>
      <el-col :span="24">
        <vk-data-charts title="登录用户趋势图" url="admin/system_uni/sys.stats.getUserLoginCountStat" :dimensions="['hour', 'day', 'month']"></vk-data-charts>
      </el-col>
    </el-row>

    <!-- 页面内容结束 -->
  </view>
</template>

<script>
  let vk = uni.vk; // vk实例
  import vkDataCharts from '@/pages/vk-stats/components/vk-data-charts';
  import statAlert from '@/pages/vk-stats/components/stat-alert';
  import getUserCount from '@/pages/vk-stats/user/components/getUserCount';
  import getLoginUserCount from '@/pages/vk-stats/user/components/getLoginUserCount';

  export default {
    components: {
      vkDataCharts,
      statAlert,
      getUserCount,
      getLoginUserCount,
    },
    data() {
      // 页面数据变量
      return {};
    },
    // 监听 - 页面每次【加载时】执行(如：前进)
    onLoad(options = {}) {
      vk = this.vk;
      this.options = options;
      this.init(options);
    },
    // 监听 - 页面【首次渲染完成时】执行。注意如果渲染速度快，会在页面进入动画完成前触发
    onReady() {},
    // 监听 - 页面每次【显示时】执行(如：前进和返回) (页面每次出现在屏幕上都触发，包括从下级页面点返回露出当前页面)
    onShow() {},
    // 监听 - 页面每次【隐藏时】执行(如：返回)
    onHide() {},
    // 函数
    methods: {
      // 页面数据初始化函数
      init(options) {},
      // 页面跳转
      pageTo(path) {
        vk.navigateTo(path);
      },
      refresh() {
        let { fullPath } = vk.pubfn.getCurrentPage();
        vk.redirectTo(fullPath);
      },
    },
    // 计算属性
    computed: {
      colCom() {
        return uni.vk.getVuex('$app.isPC') ? 8 : 24;
      },
    },
  };
</script>
