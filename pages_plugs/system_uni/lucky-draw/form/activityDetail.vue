<template>
  <vk-data-drawer v-model="value.show" :title="page.title" v-loading="page.loading" :width="page.width" direction="rtl" @open="onOpen" @closed="onClose">
    <div class="drawer-content">
      <!-- 活动基本信息 -->
      <div class="module-container">
        <el-card shadow="never">
          <span class="h2">{{ activityData.title }}</span>
        </el-card>

        <div class="tags-group">
          <el-tag type="warning">{{ activityData.status_text }}</el-tag>
          <el-tag type="success">{{ activityData.mode_text }}</el-tag>
          <el-tag type="info">{{ activityData.lottery_type_text }}</el-tag>
        </div>

        <div class="time-info" v-if="activityData.lottery_type === 1">活动时间: {{ activityData.start_time_text }} - {{ activityData.end_time_text }}</div>

        <div v-if="activityData.lottery_type === 2" class="people-limit">开奖人数要求: {{ activityData.max_people }}</div>
      </div>

      <!-- 数据统计 -->
      <div class="module-container">
        <div class="h3">活动数据</div>
        <el-row :gutter="16">
          <el-col :span="6" v-for="(item, key) in statItems" :key="key">
            <div class="stat-card">
              <div class="stat-value" v-if="activityData.stat_data">{{ activityData.stat_data[key] }}</div>
              <div class="stat-label">{{ item.label }}</div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 奖品信息 -->
      <div class="module-container">
        <div class="h3">奖品列表</div>
        <el-table :data="activityData.prize_list" size="small">
          <el-table-column prop="name" label="奖品名称">
            <template slot-scope="scope">
              <div class="tags-group">
                <el-tag>{{ scope.row.lv_text ? scope.row.lv_text + '：' : '' }} {{ scope.row.name }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="num" label="数量" width="80"></el-table-column>
        </el-table>
      </div>

      <!-- 预览二维码 -->
      <div class="module-container" v-if="activityData.qrcode">
        <div class="h3">活动二维码</div>
        <vk-data-qrcode :text="activityData.qrcode" :size="400"></vk-data-qrcode>
        <div class="tips">使用微信扫一扫进入活动详情</div>
      </div>
    </div>
  </vk-data-drawer>
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
          title: '活动详情',
          submitText: '确定',
          cancelText: '关闭',
          showCancel: true,
          width: '600px',
        },
        activityData: {},
        loading: false,
        statItems: {
          pv: { label: '浏览' },
          sc: { label: '参与' },
          uc: { label: '分享' },
          wc: { label: '中奖' },
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
      // 监听 - 页面打开
      onOpen() {
        let { item = {} } = this.value;
        // 每次打开时，重新设置表单的值 = value.item 的值，item通过 vk.pubfn.openForm('表单名',{ item:{ _id:"1" } }) 传递值
        this.activityData = item;
      },
      // 监听 - 页面关闭
      onClose() {},
    },
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped>
  .drawer-content {
    padding: 0 20px;

    .h2 {
      font-size: 24px;
      margin-bottom: 12px;
      font-weight: bold;
    }

    .h3 {
      font-size: 20px;
      margin-bottom: 12px;
      font-weight: bold;
    }

    .module-container {
      margin-bottom: 24px;
    }

    .tags-group {
      margin: 12px 0;
    }

    .tags-group .el-tag {
      margin-right: 8px;
    }

    .time-info {
      color: #666;
      font-size: 14px;
      margin: 12px 0;
    }

    .people-limit {
      color: #e6a23c;
      font-size: 14px;
    }

    .stat-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .stat-value {
      font-size: 25px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .stat-label {
      color: #666;
      font-size: 12px;
    }

    .tips {
      margin-top: 10px;
      color: #666;
      font-size: 14px;
    }
  }
</style>
