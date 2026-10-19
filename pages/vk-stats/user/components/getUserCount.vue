<template>
  <el-row>
    <el-col :xs="24" :md="12" :lg="6">
      <el-card class="box-card" v-loading="loading">
        <view slot="header" class="header">
          <text class="header-title">今日新增用户</text>
          <el-tag size="small">今日</el-tag>
        </view>
        <view class="box-card-body num-view">
          <text>{{ data.today }}</text>
          <text class="unit">人</text>
        </view>
        <view class="box-card-contrast">
          <view>
            <text class="label">较昨日</text>
            <text class="value" :class="contrastFn(data.today, data.yesterday).symbol === '+' ? 'up' : 'down'">{{ contrastFn(data.today, data.yesterday).value }}</text>
          </view>
          <view>
            <text class="label ml10">较7日平均</text>
            <text class="value" :class="contrastFn(data.today, data.day7 / 7).symbol === '+' ? 'up' : 'down'">{{ contrastFn(data.today, data.day7 / 7).value }}</text>
          </view>
        </view>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="12" :lg="6">
      <el-card class="box-card" v-loading="loading">
        <view slot="header" class="header">
          <text class="header-title">昨日新增用户</text>
          <el-tag size="small">昨日</el-tag>
        </view>
        <view class="box-card-body num-view">
          <text>{{ data.yesterday }}</text>
          <text class="unit">人</text>
        </view>
        <view class="box-card-contrast">
          <view>
            <text class="label">较前日</text>
            <text class="value" :class="contrastFn(data.yesterday, data.beforeYesterday).symbol === '+' ? 'up' : 'down'">{{
              contrastFn(data.yesterday, data.beforeYesterday).value
            }}</text>
          </view>
          <view>
            <text class="label ml10">较7日平均</text>
            <text class="value" :class="contrastFn(data.yesterday, data.day7 / 7).symbol === '+' ? 'up' : 'down'">{{ contrastFn(data.yesterday, data.day7 / 7).value }}</text>
          </view>
        </view>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="12" :lg="6">
      <el-card class="box-card" v-loading="loading">
        <view slot="header" class="header">
          <text class="header-title">近7日新增用户</text>
          <el-tag size="small">7日内</el-tag>
        </view>
        <view class="box-card-body num-view">
          <text>{{ data.day7 }}</text>
          <text class="unit">人</text>
        </view>
        <view class="box-card-contrast">
          <view>
            <text class="label">本日占比</text>
            <text class="value up">{{ $fn.percentageFilter(data.today / (data.day7 || 1)) || '-' }}</text>
          </view>
          <view>
            <text class="label ml10">昨日占比</text>
            <text class="value up">{{ $fn.percentageFilter(data.yesterday / (data.day7 || 1)) || '-' }}</text>
          </view>
        </view>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="12" :lg="6">
      <el-card class="box-card" v-loading="loading">
        <view slot="header" class="header">
          <text class="header-title">总用户数</text>
          <el-tag size="small">总</el-tag>
        </view>
        <view class="box-card-body num-view">
          <text>{{ data.all }}</text>
          <text class="unit">人</text>
        </view>
        <view class="box-card-contrast">
          <view>
            <text class="label">本月新增</text>
            <text class="value up">{{ data.thisMonth }}人</text>
          </view>
          <view>
            <text class="label ml10">本年新增</text>
            <text class="value up">{{ data.thisYear }}人</text>
          </view>
        </view>
      </el-card>
    </el-col>
  </el-row>
</template>

<script>
  export default {
    name: 'getUserCount',
    props: {},
    data() {
      return {
        url: 'admin/system_uni/sys.stats.getUserCount',
        data: {
          all: '-', // 总
          today: '-', // 今日
          yesterday: '-', // 昨日
          day7: '-', // 近7日
          beforeYesterday: '-', // 前日
          thisMonth: '-', // 本月
          thisYear: '-', // 本年
        },
        loading: false,
        complete: false,
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        let { vk } = this;
        let cache = this.getCache();
        if (cache) {
          this.data = cache.result;
          this.complete = true;
          return;
        }
        this.getList();
      },
      getList() {
        let { vk } = this;
        vk.callFunction({
          url: this.url,
          loading: { that: this, name: 'loading' },
          data: {},
          success: (data) => {
            this.data = data.result;
            this.complete = true;
            this.setCache(data);
          },
        });
      },
      getCacheKey() {
        return `pub-${this.url}`;
      },
      getCache() {
        let { vk } = this;
        let cache = vk.getSessionStorageSync(this.getCacheKey());
        if (cache && Date.now() < cache.expire) {
          return cache.data;
        } else {
          return null;
        }
      },
      setCache(data) {
        let { vk } = this;
        vk.setSessionStorageSync(this.getCacheKey(), {
          data,
          expire: Date.now() + 1000 * 60 * 5,
        });
      },
      contrastFn(v1, v2) {
        let { vk } = this;
        if (!this.complete) {
          return {
            value: `-`,
            symbol: '+',
          };
        }
        if (v2 === 0) {
          return {
            value: `-`,
            symbol: '+',
          };
        }
        let diff = v1 - v2;
        if (diff >= 0) {
          return {
            value: `+${vk.pubfn.percentageFilter(diff / v2)}`,
            symbol: '+',
          };
        } else {
          return {
            value: vk.pubfn.percentageFilter(diff / v2),
            symbol: '-',
          };
        }
      },
    },
    watch: {},
    computed: {},
  };
</script>
<style lang="scss" scoped>
  @import '@/pages/vk-stats/common/css/index.scss';
</style>
