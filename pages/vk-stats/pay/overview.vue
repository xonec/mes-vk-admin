<template>
  <div class="pay-stat-page" v-loading="loading">
    <div class="stat-panel filter-panel">
      <vk-data-table-query v-model="queryForm1.formData" :columns="queryForm1.columns" :span="6" :collapse-rows="1" :collapse-default-expand="true" @search="search">
        <template v-slot:dateRange="{ form }">
          <div class="date-range-wrapper">
            <el-radio-group v-model="dateShortcut" @change="onDateShortcutChange">
              <el-radio-button v-for="item in dateShortcutOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio-button>
            </el-radio-group>
            <el-date-picker
              v-model="form.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              align="right"
              value-format="timestamp"
              :picker-options="datePickerOptions"
              class="date-picker"
              @change="onDateRangeChange"
            ></el-date-picker>
          </div>
        </template>
      </vk-data-table-query>
    </div>

    <div class="summary-grid">
      <div v-for="item in summaryCards" :key="item.key" class="stat-panel summary-card">
        <div class="summary-icon-box" :style="{ background: item.bgColor }">
          <vk-data-icon :name="item.icon" :size="20" color="#ffffff"></vk-data-icon>
        </div>
        <div class="summary-info">
          <div class="summary-name">{{ item.title }}</div>
          <div class="summary-number">{{ item.displayValue }}</div>
          <div class="summary-footer">
            <span class="summary-footer-label">较上周期</span>
            <span class="summary-footer-value" :class="item.trendClass">{{ item.compareText }}</span>
          </div>
        </div>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :xl="24">
        <div class="stat-panel chart-card trend-card">
          <div class="trend-header">
            <div class="panel-title">收入趋势</div>
            <div class="show-value-switch-box">
              <span class="show-value-switch-label">数值</span>
              <div class="show-value-switch">
                <vk-data-input-switch
                  v-model="showTrendLabel"
                  activeText="显示"
                  inactiveText="隐藏"
                  activeColor="#409EFF"
                  inactiveColor="#C0CCDA"
                  :inlinePrompt="true"
                  class="trend-label-switch"
                ></vk-data-input-switch>
              </div>
            </div>
            <el-radio-group v-model="queryForm1.formData.groupBy" size="mini" @change="onGroupByChange">
              <el-radio-button v-for="item in groupByOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-holder trend-chart-holder">
            <qiun-data-charts
              v-if="trendChartData.series.length"
              type="line"
              :chart-data="trendChartData"
              :eopts="trendChartOpts"
              :echarts-h5="true"
              :ontap="false"
              background="rgba(0,0,0,0)"
            ></qiun-data-charts>
            <div v-else class="chart-empty">当前筛选条件下暂无趋势数据</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :xl="12">
        <div class="stat-panel chart-card funnel-card">
          <div class="panel-title">支付漏斗</div>
          <div class="panel-subtitle">登录用户仅按日期范围统计，漏斗按固定分层口径计算</div>
          <div class="funnel-content">
            <div class="chart-holder funnel-chart-holder">
              <qiun-data-charts
                v-if="funnelChartData.series.length"
                type="funnel"
                :chart-data="funnelChartData"
                :eopts="funnelChartEopts"
                :echarts-h5="true"
                :ontap="false"
                background="rgba(0,0,0,0)"
              ></qiun-data-charts>
              <div v-else class="chart-empty">当前筛选条件下暂无漏斗数据</div>
            </div>

            <div class="funnel-stage-list">
              <div v-for="(item, index) in funnelDisplay" :key="item.key" class="funnel-stage-row">
                <div class="funnel-stage-head">
                  <span class="funnel-stage-index" :style="{ background: funnelColorList[index % funnelColorList.length] }">{{ index + 1 }}</span>
                  <div class="funnel-stage-meta">
                    <div class="funnel-stage-title">{{ item.label }}</div>
                    <div v-if="item.desc" class="funnel-stage-desc">{{ item.desc }}</div>
                  </div>
                </div>
                <div class="funnel-stage-value">{{ item.valueText }}</div>
                <div class="funnel-stage-rate">{{ item.rateText }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :sm="24" :xl="12">
        <div class="stat-panel chart-card share-card">
          <div class="panel-title">支付金额占比（按支付方式）</div>
          <div class="share-content">
            <div class="chart-holder share-chart-holder">
              <qiun-data-charts
                v-if="payTypeChartData.series.length && payTypeChartData.series[0].data.length"
                type="pie"
                :chart-data="payTypeChartData"
                :eopts="payTypeChartOpts"
                :echarts-h5="true"
                :ontap="false"
                background="rgba(0,0,0,0)"
              ></qiun-data-charts>
              <div v-else class="chart-empty">当前筛选条件下暂无支付方式数据</div>
            </div>

            <div class="share-legend-table">
              <div class="share-legend-head">
                <span>支付方式</span>
                <span class="text-right">支付金额(元)</span>
                <span class="text-right">占比</span>
              </div>
              <div v-for="(item, index) in payTypeShareDisplay" :key="item.key" class="share-legend-row">
                <div class="share-legend-name">
                  <span class="legend-dot" :style="{ backgroundColor: item.color || payTypeColorList[index % payTypeColorList.length] }"></span>
                  <span class="share-legend-text">{{ item.label }}</span>
                </div>
                <span class="share-legend-number">{{ formatMoney(item.amount) }}</span>
                <span class="share-legend-rate">{{ item.percentText }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :xl="12">
        <div class="stat-panel table-card">
          <div class="panel-title">收入概览（按平台）</div>
          <el-table :data="platformTableDisplay" stripe size="mini">
            <el-table-column prop="label" label="平台" min-width="120"></el-table-column>
            <el-table-column prop="payAmountText" label="支付金额(元)" min-width="120" align="right"></el-table-column>
            <el-table-column prop="payCount" label="支付笔数(笔)" min-width="110" align="right"></el-table-column>
            <el-table-column prop="refundAmountText" label="退款金额(元)" min-width="120" align="right"></el-table-column>
            <el-table-column prop="netIncomeText" label="净收入(元)" min-width="120" align="right"></el-table-column>
            <el-table-column label="操作" width="80" align="right">
              <template v-slot="scope">
                <el-button type="text" @click="applyTableFilter('platform', scope.row.key)">明细</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>

      <el-col :xs="24" :sm="24" :xl="12">
        <div class="stat-panel table-card">
          <div class="panel-title">收入概览（按订单类型）</div>
          <el-table :data="orderTypeTableDisplay" stripe size="mini">
            <el-table-column prop="label" label="订单类型" min-width="120"></el-table-column>
            <el-table-column prop="payAmountText" label="支付金额(元)" min-width="120" align="right"></el-table-column>
            <el-table-column prop="payCount" label="支付笔数(笔)" min-width="110" align="right"></el-table-column>
            <el-table-column prop="refundAmountText" label="退款金额(元)" min-width="120" align="right"></el-table-column>
            <el-table-column prop="netIncomeText" label="净收入(元)" min-width="120" align="right"></el-table-column>
            <el-table-column label="操作" width="80" align="right">
              <template v-slot="scope">
                <el-button type="text" @click="applyTableFilter('orderType', scope.row.key)">明细</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
  import { ORDER_TYPE_MAP, PAY_TYPE_MAP, PLATFORM_LABEL_MAP, payTypeSearchData, statusData } from './constants.js';

  let vk = uni.vk;

  const DATE_SHORTCUT_OPTIONS = [
    { label: '今日', value: 'today' },
    { label: '昨日', value: 'yesterday' },
    { label: '近7天', value: 'last7days' },
    { label: '近30天', value: 'last30days' },
    { label: '自定义', value: 'custom' },
  ];

  const DEFAULT_DATE_SHORTCUT = 'last7days';

  const GROUP_BY_OPTIONS = [
    { label: '按天', value: 'day' },
    { label: '按周', value: 'week' },
    { label: '按月', value: 'month' },
  ];

  const PAY_TYPE_COLOR_LIST = ['#2f6bff', '#34c38f', '#ffb020', '#8b5cf6', '#31c0cb', '#d5dbe5'];
  const FUNNEL_COLOR_LIST = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa'];

  export default {
    data() {
      return {
        loading: false,
        showTrendLabel: false,
        dateShortcut: DEFAULT_DATE_SHORTCUT,
        dateShortcutOptions: DATE_SHORTCUT_OPTIONS,
        payTypeColorList: PAY_TYPE_COLOR_LIST,
        funnelColorList: FUNNEL_COLOR_LIST,
        groupByOptions: GROUP_BY_OPTIONS,
        datePickerOptions: {
          disabledDate(time) {
            return time.getTime() > Date.now();
          },
        },
        queryForm1: {
          formData: {
            dateRange: getShortcutRange(DEFAULT_DATE_SHORTCUT),
            platform: '',
            payType: '',
            orderType: '',
            status: 'paid-success',
            groupBy: 'day',
            pid: '',
          },
          columns: [
            { key: 'dateRange', title: '', type: 'daterange', mode: '[]', placeholder: ' ', span: 12 },
            { key: 'platform', title: '平台', type: 'select', mode: '=', data: [] },
            { key: 'payType', title: '支付方式', type: 'select', mode: '%*', data: payTypeSearchData, filterable: true },
            { key: 'orderType', title: '订单类型', type: 'select', mode: '=', data: [] },
            { key: 'status', title: '支付状态', type: 'select', mode: '=', data: statusData },
            { key: 'pid', title: 'PID/商户', type: 'select', mode: '=', data: [], filterable: true },
          ],
        },
        summary: createEmptySummary(),
        trend: [],
        dailyTrend: [],
        refundByDay: [],
        payTypeShare: [],
        funnel: [],
        platformRows: [],
        orderTypeRows: [],
        remoteOptions: {
          platforms: [],
          payTypes: [],
          orderTypes: [],
          pids: [],
        },
      };
    },
    onLoad() {
      vk = this.vk;
      this.resetFilter();
    },
    methods: {
      search() {
        this.fetchData();
      },
      onDateShortcutChange(value) {
        if (value === 'custom') {
          return;
        }
        this.queryForm1.formData.dateRange = getShortcutRange(value);
        this.search();
      },
      onDateRangeChange() {
        const dateRange = this.queryForm1.formData.dateRange;
        if (Array.isArray(dateRange) && dateRange.length === 2) {
          const days = Math.ceil((dateRange[1] - dateRange[0]) / (1000 * 60 * 60 * 24));
          if (days > 31) {
            vk.toast('时间范围不允许超过31天', 'none');
            this.queryForm1.formData.dateRange = [];
            return;
          }
        }
        this.dateShortcut = 'custom';
        this.search();
      },
      onGroupByChange() {
        this.recomputeTrend();
      },
      resetFilter() {
        this.dateShortcut = DEFAULT_DATE_SHORTCUT;
        this.queryForm1.formData = {
          dateRange: getShortcutRange(DEFAULT_DATE_SHORTCUT),
          platform: '',
          payType: '',
          orderType: '',
          status: 'paid-success',
          groupBy: 'day',
          pid: '',
        };
        this.fetchData();
      },
      fetchData() {
        const formData = this.queryForm1.formData;
        const dateRange = normalizeDateRange(formData.dateRange);
        vk.callFunction({
          url: 'admin/system_uni/pay-orders/sys/getStat',
          loading: { that: this, name: 'loading' },
          data: {
            startTime: dateRange[0],
            endTime: dateRange[1],
            groupBy: formData.groupBy,
            status: formData.status,
            platform: formData.platform,
            payType: formData.payType,
            orderType: formData.orderType,
            pid: formData.pid,
          },
          success: (data) => {
            this.summary = data.summary || createEmptySummary();
            this.trend = data.trend || [];
            this.dailyTrend = data.dailyTrend || [];
            this.refundByDay = data.refundByDay || [];
            this.payTypeShare = data.payTypeShare || [];
            this.funnel = data.funnel || [];
            this.platformRows = data.platformRows || [];
            this.orderTypeRows = data.orderTypeRows || [];
            this.remoteOptions = data.options || {
              platforms: [],
              payTypes: [],
              orderTypes: [],
              pids: [],
            };
            this.syncQueryColumns();
          },
        });
      },
      applyTableFilter(fieldName, value) {
        const formData = this.queryForm1.formData;
        const dateRange = normalizeDateRange(formData.dateRange);
        // 跳转到列表页面，传递筛选参数
        const params = new URLSearchParams({
          [fieldName]: value,
          startTime: dateRange[0],
          endTime: dateRange[1],
          status: formData.status,
        });
        vk.navigateTo(`./list?${params.toString()}`);
      },
      syncQueryColumns() {
        const dataMap = {
          platform: this.platformOptions,
          payType: payTypeSearchData,
          orderType: this.orderTypeOptions,
          pid: this.pidOptions,
        };
        this.queryForm1.columns = this.queryForm1.columns.map((item) => {
          return dataMap[item.key] ? Object.assign({}, item, { data: dataMap[item.key] }) : item;
        });
      },
      formatMoney(value) {
        return formatDecimal(value);
      },
      /**
       * 用缓存的 dailyTrend 按当前 groupBy 重算趋势，不发请求
       */
      recomputeTrend() {
        const dailyRows = this.dailyTrend;
        const groupBy = this.queryForm1.formData.groupBy;

        // 构建日期数据映射 { 'yyyy-MM-dd': { payAmount, refundAmount } }
        const dateMap = {};

        // 填充支付数据
        if (Array.isArray(dailyRows)) {
          for (const row of dailyRows) {
            dateMap[row._id] = {
              payAmount: row.totalAmount || 0,
              refundAmount: 0,
            };
          }
        }

        // 填充退款数据（合并到对应日期）
        if (Array.isArray(this.refundByDay)) {
          for (const row of this.refundByDay) {
            if (!dateMap[row._id]) {
              dateMap[row._id] = { payAmount: 0, refundAmount: 0 };
            }
            dateMap[row._id].refundAmount = row.refundAmount || 0;
          }
        }

        const allDates = Object.keys(dateMap).sort();
        if (allDates.length === 0) {
          this.trend = [];
          return;
        }

        // 转为数组
        const dayItems = allDates.map((dateStr) => ({
          dateStr,
          ...dateMap[dateStr],
        }));

        if (groupBy === 'day') {
          this.trend = dayItems.map((item) => ({
            label: item.dateStr.slice(5),
            payAmount: formatAmount(item.payAmount),
            refundAmount: formatAmount(item.refundAmount),
            netIncome: formatAmount(item.payAmount - item.refundAmount),
          }));
          return;
        }

        if (groupBy === 'week') {
          const weekMap = {};
          for (const item of dayItems) {
            const weekStart = getWeekStart(item.dateStr);
            if (!weekMap[weekStart]) {
              const weekEnd = addDays(weekStart, 6);
              weekMap[weekStart] = { payAmount: 0, refundAmount: 0, label: `${weekStart.slice(5)} ~ ${weekEnd.slice(5)}` };
            }
            weekMap[weekStart].payAmount += item.payAmount;
            weekMap[weekStart].refundAmount += item.refundAmount;
          }
          this.trend = Object.keys(weekMap)
            .sort()
            .map((key) => ({
              label: weekMap[key].label,
              payAmount: formatAmount(weekMap[key].payAmount),
              refundAmount: formatAmount(weekMap[key].refundAmount),
              netIncome: formatAmount(weekMap[key].payAmount - weekMap[key].refundAmount),
            }));
          return;
        }

        // month
        const monthMap = {};
        for (const item of dayItems) {
          const monthKey = item.dateStr.slice(0, 7);
          if (!monthMap[monthKey]) {
            monthMap[monthKey] = { payAmount: 0, refundAmount: 0, label: `${Number(monthKey.slice(5))}月` };
          }
          monthMap[monthKey].payAmount += item.payAmount;
          monthMap[monthKey].refundAmount += item.refundAmount;
        }
        this.trend = Object.keys(monthMap)
          .sort()
          .map((key) => ({
            label: monthMap[key].label,
            payAmount: formatAmount(monthMap[key].payAmount),
            refundAmount: formatAmount(monthMap[key].refundAmount),
            netIncome: formatAmount(monthMap[key].payAmount - monthMap[key].refundAmount),
          }));
      },
    },
    computed: {
      platformOptions() {
        return mergeOptionList(this.remoteOptions.platforms, PLATFORM_LABEL_MAP);
      },
      orderTypeOptions() {
        return mergeOptionList(this.remoteOptions.orderTypes, ORDER_TYPE_MAP);
      },
      pidOptions() {
        return this.remoteOptions.pids || [];
      },
      summaryCards() {
        const summary = this.summary;
        return [
          createSummaryCard({
            key: 'payAmount',
            title: '支付金额(元)',
            icon: 'el-icon-money',
            bgColor: 'linear-gradient(135deg, #3b82f6 0%, #7aa6ff 100%)',
            metric: summary.payAmount,
            isMoney: true,
            isExpense: false,
          }),
          createSummaryCard({
            key: 'payCount',
            title: '支付笔数(笔)',
            icon: 'el-icon-s-order',
            bgColor: 'linear-gradient(135deg, #22c55e 0%, #5dd39e 100%)',
            metric: summary.payCount,
            isMoney: false,
            isExpense: false,
          }),
          createSummaryCard({
            key: 'refundAmount',
            title: '退款金额(元)',
            icon: 'el-icon-refresh-left',
            bgColor: 'linear-gradient(135deg, #f59e0b 0%, #ffcb6b 100%)',
            metric: summary.refundAmount,
            isMoney: true,
            isExpense: true,
          }),
          createSummaryCard({
            key: 'refundCount',
            title: '退款笔数(笔)',
            icon: 'el-icon-document-delete',
            bgColor: 'linear-gradient(135deg, #8b5cf6 0%, #b39bff 100%)',
            metric: summary.refundCount,
            isMoney: false,
            isExpense: true,
          }),
          createSummaryCard({
            key: 'netIncome',
            title: '净收入(元)',
            icon: 'el-icon-wallet',
            bgColor: 'linear-gradient(135deg, #14b8a6 0%, #5ad9ca 100%)',
            metric: summary.netIncome,
            isMoney: true,
            isExpense: false,
          }),
          createSummaryCard({
            key: 'avgOrderAmount',
            title: '客单价(元)',
            icon: 'el-icon-data-analysis',
            bgColor: 'linear-gradient(135deg, #2563eb 0%, #5f9bff 100%)',
            metric: summary.avgOrderAmount,
            isMoney: true,
            isExpense: false,
          }),
        ];
      },
      trendChartData() {
        return {
          categories: this.trend.map((item) => item.label),
          series: [
            { name: '支付金额(元)', data: this.trend.map((item) => item.payAmount), label: { show: this.showTrendLabel } },
            { name: '退款金额(元)', data: this.trend.map((item) => item.refundAmount), label: { show: this.showTrendLabel } },
            { name: '净收入(元)', data: this.trend.map((item) => item.netIncome), label: { show: this.showTrendLabel } },
          ],
        };
      },
      trendChartOpts() {
        return {
          color: ['#2f6bff', '#ffb020', '#34c38f'],
          legend: {
            top: 0,
            left: 0,
            itemGap: 24,
            textStyle: {
              color: '#566277',
            },
          },
          grid: {
            top: 76,
            left: 16,
            right: 16,
            bottom: 12,
            containLabel: true,
          },
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(14, 24, 45, 0.92)',
            borderWidth: 0,
            textStyle: {
              color: '#ffffff',
            },
          },
          xAxis: {
            type: 'category',
            axisLine: {
              lineStyle: {
                color: '#d9e2f2',
              },
            },
            axisLabel: {
              color: '#7a8799',
            },
          },
          yAxis: {
            type: 'value',
            splitLine: {
              lineStyle: {
                color: '#edf2fb',
              },
            },
            axisLabel: {
              color: '#7a8799',
            },
          },
          seriesTemplate: {
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: {
              width: 3,
            },
            itemStyle: {
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          },
        };
      },
      payTypeChartData() {
        return {
          categories: [],
          series: [
            {
              name: '支付金额占比',
              data: this.payTypeShareDisplay.map((item) => ({
                name: item.label,
                value: item.amount,
              })),
            },
          ],
        };
      },
      payTypeChartOpts() {
        return {
          color: this.payTypeColorList,
          tooltip: {
            trigger: 'item',
            confine: true,
            position: [12, 12],
            transitionDuration: 0,
            backgroundColor: 'rgba(14, 24, 45, 0.92)',
            borderWidth: 0,
            extraCssText: 'max-width: 180px; white-space: normal; line-height: 1.6;',
            textStyle: {
              color: '#ffffff',
            },
            formatter: '{b}\n支付金额：{c} 元',
          },
          legend: {
            show: false,
          },
          seriesTemplate: {
            type: 'pie',
            radius: ['32%', '74%'],
            label: {
              show: false,
            },
            labelLine: {
              show: false,
            },
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 4,
            },
          },
        };
      },
      funnelChartData() {
        const funnelDisplay = this.funnelDisplay;
        const maxValue = funnelDisplay.reduce((max, item) => {
          return item.value > max ? item.value : max;
        }, 0);
        if (!funnelDisplay.length || !maxValue) {
          return { series: [] };
        }
        return {
          series: [
            {
              name: '支付漏斗',
              data: funnelDisplay.map((item, index) => ({
                name: item.label,
                value: item.value,
                itemStyle: {
                  color: this.funnelColorList[index % this.funnelColorList.length],
                  borderColor: '#ffffff',
                  borderWidth: 2,
                },
                label: {
                  color: '#ffffff',
                },
              })),
            },
          ],
        };
      },
      funnelChartEopts() {
        const maxValue = this.funnelDisplay.reduce((max, item) => {
          return item.value > max ? item.value : max;
        }, 0);
        return {
          type: 'funnel',
          color: this.funnelColorList,
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(14, 24, 45, 0.92)',
            borderWidth: 0,
            textStyle: {
              color: '#ffffff',
            },
            formatter: (params) => {
              return `${params.name}\n${formatInteger(params.value)}`;
            },
          },
          legend: {
            show: false,
          },
          seriesTemplate: {
            left: '6%',
            top: 20,
            bottom: 20,
            width: '72%',
            min: 0,
            max: maxValue || 1,
            minSize: '8%',
            maxSize: '100%',
            sort: 'none',
            gap: 8,
            label: {
              show: true,
              position: 'inside',
              formatter: ({ value }) => formatInteger(value),
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
            },
            labelLine: {
              show: false,
            },
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 2,
            },
            emphasis: {
              label: {
                fontSize: 13,
              },
            },
          },
        };
      },
      funnelDisplay() {
        return (this.funnel || []).map((item, index) => {
          const value = Number(item.value || 0);
          const prevItem = index > 0 ? this.funnel[index - 1] : null;
          const prevValue = prevItem ? Number(prevItem.value || 0) : 0;
          let rateText = '基准';
          if (index > 0) {
            rateText = prevValue > 0 ? `较上一层 ${vk.pubfn.toDecimal((value / prevValue) * 100, 2)}%` : '-';
          }
          return {
            key: item.key || `stage-${index}`,
            label: item.label || `阶段${index + 1}`,
            desc: item.desc || '',
            value,
            valueText: formatInteger(value),
            rateText,
          };
        });
      },
      payTypeShareDisplay() {
        return this.payTypeShare.map((item, index) => ({
          key: item.key,
          label: getPayTypeLabel(item.key),
          amount: item.amount,
          percentText: `${item.percent.toFixed(2)}%`,
          color: getPayTypeColor(item.key, index),
        }));
      },
      platformTableDisplay() {
        return this.platformRows.map((item) => createTableDisplayRow(item, getPlatformLabel(item.key)));
      },
      orderTypeTableDisplay() {
        return this.orderTypeRows.map((item) => createTableDisplayRow(item, getOrderTypeLabel(item.key)));
      },
    },
  };

  function createEmptyMetric() {
    return {
      value: null,
      previousValue: null,
      diffValue: null,
      rate: null,
      isEmpty: true,
    };
  }

  function createEmptySummary() {
    return {
      payAmount: createEmptyMetric(),
      payCount: createEmptyMetric(),
      refundAmount: createEmptyMetric(),
      refundCount: createEmptyMetric(),
      netIncome: createEmptyMetric(),
      avgOrderAmount: createEmptyMetric(),
    };
  }

  /**
   * 获取某天所在周的周一日期字符串（yyyy-MM-dd）
   */
  function getWeekStart(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return formatDate(date);
  }

  function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return formatDate(date);
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatAmount(cents) {
    return vk.pubfn.toDecimal(cents / 100, 2);
  }

  function createSummaryCard({ key, title, icon, bgColor, metric, isMoney, isExpense }) {
    const isEmpty = metric && metric.isEmpty;
    const value = Number(metric && metric.value ? metric.value : 0);
    const rate = metric && metric.rate !== null && metric.rate !== undefined ? Number(metric.rate) : null;
    const isPositive = rate !== null ? rate >= 0 : Number(metric && metric.diffValue ? metric.diffValue : 0) >= 0;
    let trendClass = 'is-flat';
    let trendLabel = '持平';
    if (rate !== null) {
      trendLabel = `${isPositive ? '↑' : '↓'} ${Math.abs(rate).toFixed(2)}%`;
      trendClass = isExpense ? (isPositive ? 'is-up-good' : 'is-down-bad') : isPositive ? 'is-up-bad' : 'is-down-good';
    }
    return {
      key,
      title,
      icon,
      bgColor,
      displayValue: isEmpty ? '-' : isMoney ? `¥ ${formatDecimal(value)}` : formatInteger(value),
      compareText: isEmpty ? '-' : trendLabel,
      trendClass,
    };
  }

  function getShortcutRange(shortcut) {
    const offsetMap = { today: 0, yesterday: -1, last7days: -6, last30days: -29 };
    const count = offsetMap[shortcut];
    if (count === undefined) return [];
    const start = vk.pubfn.getDayOffsetStartAndEnd(count, new Date());
    const end = vk.pubfn.getDayOffsetStartAndEnd(0, new Date());
    return [start.startTime, end.endTime];
  }

  function normalizeDateRange(dateRange) {
    const now = Date.now();
    const startTs = Array.isArray(dateRange) && dateRange.length === 2 ? Number(dateRange[0]) : now;
    const endTs = Array.isArray(dateRange) && dateRange.length === 2 ? Number(dateRange[1]) : now;
    const start = vk.pubfn.getDayOffsetStartAndEnd(0, new Date(startTs));
    const end = vk.pubfn.getDayOffsetStartAndEnd(0, new Date(endTs));
    return [start.startTime, end.endTime];
  }

  function mergeOptionList(list, labelMap) {
    const optionMap = {};
    Object.keys(labelMap).forEach((key) => {
      const labelValue = labelMap[key];
      optionMap[key] = {
        value: key,
        label: typeof labelValue === 'string' ? labelValue : labelValue.label,
      };
    });
    (list || []).forEach((item) => {
      const labelValue = labelMap[item.value];
      optionMap[item.value] = {
        value: item.value,
        label: typeof labelValue === 'string' ? labelValue : labelValue && labelValue.label ? labelValue.label : item.label,
      };
    });
    return Object.values(optionMap);
  }

  function getPayTypeLabel(key) {
    return PAY_TYPE_MAP[key] ? PAY_TYPE_MAP[key].label : key;
  }

  function getPayTypeColor(key, index) {
    if (PAY_TYPE_MAP[key] && PAY_TYPE_MAP[key].color) {
      return PAY_TYPE_MAP[key].color;
    }
    return PAY_TYPE_COLOR_LIST[index % PAY_TYPE_COLOR_LIST.length];
  }

  function getOrderTypeLabel(key) {
    return ORDER_TYPE_MAP[key] || key;
  }

  function getPlatformLabel(key) {
    return PLATFORM_LABEL_MAP[key] || key;
  }

  function createTableDisplayRow(item, label) {
    return {
      key: item.key,
      label,
      payAmountText: formatDecimal(item.payAmount || 0),
      payCount: formatInteger(item.payCount || 0),
      refundAmountText: formatDecimal(item.refundAmount || 0),
      netIncomeText: formatDecimal(item.netIncome || 0),
    };
  }

  function formatDecimal(value) {
    return vk.pubfn.priceFilter(value, { format: 'thousandSeparator' });
  }

  function formatInteger(value) {
    return vk.pubfn.thousandSeparator(value);
  }
</script>

<style lang="scss" scoped>
  page {
    background: #f5f5f5;
  }

  .date-range-wrapper {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .date-picker {
    margin-left: 8px;
    flex: 1;
  }

  .pay-stat-page {
    min-height: 100vh;
    padding-bottom: 18px;
  }

  .stat-panel {
    background: #ffffff;
    border: 1px solid #edf1f7;
    border-radius: 8px;
    box-shadow: 0 4px 18px rgba(26, 45, 86, 0.04);
  }

  .filter-panel {
    padding: 16px 20px 14px;
    margin-bottom: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .summary-card {
    min-height: 102px;
    padding: 16px 18px;
    display: flex;
    align-items: center;
  }

  .summary-icon-box {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-info {
    min-width: 0;
    flex: 1;
    margin-left: 14px;
  }

  .summary-name {
    color: #5f6b7a;
    font-size: 13px;
    line-height: 18px;
  }

  .summary-number {
    margin-top: 8px;
    color: #1f2d3d;
    font-size: 20px;
    font-weight: bold;
    line-height: 26px;
  }

  .summary-footer {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .summary-footer-label {
    color: #8893a5;
  }

  .summary-footer-value.is-up-bad {
    color: #f04438;
  }

  .summary-footer-value.is-down-good,
  .summary-footer-value.is-up-good {
    color: #12b76a;
  }

  .summary-footer-value.is-down-bad {
    color: #f04438;
  }

  .summary-footer-value.is-flat {
    color: #8893a5;
  }

  .el-col {
    margin-bottom: 16px;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .el-row:last-child {
    margin-bottom: 0;
  }

  .el-col:last-child {
    margin-bottom: 0;
  }

  .chart-card,
  .table-card {
    padding: 18px 18px 16px;
    min-height: 450px;
  }

  .panel-title {
    color: #1f2d3d;
    font-size: 18px;
    font-weight: 700;
    line-height: 24px;
  }

  .panel-subtitle {
    margin-top: 6px;
    color: #8a94a6;
    font-size: 12px;
    line-height: 18px;
  }

  .trend-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .trend-header .panel-title {
    margin-right: auto;
  }

  .show-value-switch-box {
    display: flex;
    align-items: center;

    .show-value-switch-label {
      margin-right: 5px;
      font-size: 15px;
      color: #303133;
    }

    .show-value-switch {
      margin-top: -4px;
    }
  }

  .trend-label-switch {
    margin-right: 12px;
  }

  .chart-holder {
    position: relative;
    margin-top: 10px;
    width: 100%;
  }

  .trend-chart-holder {
    height: 400px;
  }

  .funnel-content,
  .share-content {
    display: grid;
    grid-template-columns: 360px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    margin-top: 8px;
  }

  .funnel-chart-holder {
    height: 280px;
    display: flex;
    justify-content: center;
  }

  .funnel-stage-list {
    min-height: 280px;
    padding: 8px 4px 0 8px;
  }

  .funnel-stage-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 88px 110px;
    align-items: center;
    column-gap: 12px;
    min-height: 54px;
    color: #4e5968;
    border-bottom: 1px solid #f5f7fb;
  }

  .funnel-stage-row:last-child {
    border-bottom: 0;
  }

  .funnel-stage-head {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .funnel-stage-index {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .funnel-stage-meta {
    min-width: 0;
    margin-left: 10px;
  }

  .funnel-stage-title {
    color: #1f2d3d;
    font-size: 13px;
    font-weight: 600;
    line-height: 18px;
  }

  .funnel-stage-desc {
    margin-top: 2px;
    color: #8a94a6;
    font-size: 12px;
    line-height: 17px;
  }

  .funnel-stage-value,
  .funnel-stage-rate {
    text-align: right;
    font-size: 13px;
  }

  .funnel-stage-value {
    color: #1f2d3d;
    font-weight: 700;
  }

  .funnel-stage-rate {
    color: #8a94a6;
  }

  .share-chart-holder {
    height: 238px;
    display: flex;
    justify-content: center;
  }

  .chart-holder ::v-deep .chartsview,
  .chart-holder ::v-deep [id^='ChartBoxId'],
  .chart-holder ::v-deep > div,
  .chart-holder ::v-deep canvas {
    height: 100% !important;
    width: 100% !important;
  }

  .chart-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #98a2b3;
    font-size: 13px;
  }

  .share-legend-table {
    min-height: 246px;
    padding: 8px 6px 0 2px;
  }

  .share-legend-head,
  .share-legend-row {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) 110px 68px;
    align-items: center;
    column-gap: 10px;
    font-size: 13px;
  }

  .share-legend-head {
    padding: 10px 0 12px;
    color: #8a94a6;
    border-bottom: 1px solid #eef2f7;
  }

  .share-legend-head .text-right {
    text-align: right;
  }

  .share-legend-row {
    min-height: 34px;
    color: #4e5968;
    border-bottom: 1px solid #f5f7fb;
  }

  .share-legend-row:last-child {
    border-bottom: 0;
  }

  .share-legend-name {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .share-legend-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .share-legend-number,
  .share-legend-rate {
    text-align: right;
  }

  .table-card {
    padding-top: 16px;
  }

  .table-card ::v-deep .el-table {
    margin-top: 14px;
    border-radius: 6px;
    overflow: hidden;
  }

  .table-card ::v-deep .el-table th {
    background: #f8fbff;
    color: #5f6b7a;
    font-weight: 600;
  }

  .table-card ::v-deep .el-table td,
  .table-card ::v-deep .el-table th {
    padding: 10px 0;
  }

  @media screen and (max-width: 1680px) {
    .summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media screen and (max-width: 1280px) {
    .funnel-content,
    .share-content {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media screen and (max-width: 768px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
