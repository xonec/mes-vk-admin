<!--
	图表展示组件，此组件当前仅支持折线图
	注意：此组件只能在 vk-admin 中使用
	功能：
	1、支持按小时、天、月、年纬度查询
	2、支持动态开关Y轴刻度
-->
<template>
  <el-card class="vk-data-charts">
    <view slot="header" class="header">
      <text class="header-title">{{ title }}</text>
      <view class="header-controls">
        <view class="show-value-switch-box" v-if="viewMode === 'chart'">
          <text class="show-value-switch-label">数值</text>
          <view class="show-value-switch">
            <vk-data-input-switch
              v-model="showValue"
              activeText="显示"
              inactiveText="隐藏"
              activeColor="#409EFF"
              inactiveColor="#C0CCDA"
              :inlinePrompt="true"
              @change="showValueChange"
            ></vk-data-input-switch>
          </view>
        </view>
        <view class="date-picker">
          <vk-data-input-date-time
            v-if="formData.mode === 'hour'"
            v-model="formData.date"
            type="date"
            size="small"
            format="yyyy-MM-dd"
            valueFormat="yyyy-MM-dd"
            :clearable="false"
            key="hour"
            :pickerOptions="pickerOptions"
            @change="getList"
          ></vk-data-input-date-time>
          <vk-data-input-date-time
            v-else-if="formData.mode === 'day'"
            v-model="formData.daterange"
            type="daterange"
            size="small"
            format="yyyy-MM-dd"
            valueFormat="yyyy-MM-dd"
            :clearable="false"
            key="day"
            :pickerOptions="pickerOptions"
            @change="getList"
          ></vk-data-input-date-time>
          <vk-data-input-date-time
            v-else-if="formData.mode === 'month'"
            v-model="formData.date"
            type="year"
            size="small"
            format="yyyy"
            valueFormat="yyyy"
            :clearable="false"
            key="month"
            :pickerOptions="pickerOptions"
            @change="getList"
          ></vk-data-input-date-time>
          <vk-data-input-date-time
            v-else-if="formData.mode === 'year'"
            v-model="formData.date"
            type="year"
            size="small"
            format="yyyy"
            valueFormat="yyyy"
            :clearable="false"
            key="year"
            :pickerOptions="pickerOptions"
            @change="getList"
          ></vk-data-input-date-time>
        </view>
        <vk-data-input-radio v-model="formData.mode" :localdata="modeDataCom" size="small" option-type="button" @change="modeChange"></vk-data-input-radio>
        <view class="view-mode-btns">
          <el-button :type="viewMode === 'chart' ? 'primary' : ''" class="icon-line" size="small" icon="el-icon-data-line" @click="viewMode = 'chart'"></el-button>
          <el-button :type="viewMode === 'table' ? 'primary' : ''" class="icon-grid" size="small" icon="el-icon-s-grid" @click="viewMode = 'table'"></el-button>
          <el-button type="success" size="small" icon="el-icon-download" @click="exportExcel" style="margin-left: 10px">导出</el-button>
        </view>
      </view>
    </view>
    <view class="box-card-body" :style="bodyStyleCom">
      <qiun-data-charts v-show="url && viewMode === 'chart'" :type="type" :echarts-h5="true" :eopts="data.eopts" :chartData="data.chartData" />
      <vk-data-table v-show="url && viewMode === 'table'" ref="table1" :data="tableData.data" :columns="tableData.columns" size="small" :max-height="300"></vk-data-table>
    </view>
  </el-card>
</template>

<script>
  export default {
    name: 'vk-data-charts',
    props: {
      type: {
        type: String,
        default: 'line',
      },
      title: {
        type: String,
        default: '',
      },
      url: {
        type: String,
        default: '',
        require: true,
      },
      height: {
        type: [String, Number],
        default: 300,
      },
      useCache: {
        type: Boolean,
        default: true,
      },
      dimensions: {
        type: Array,
        default() {
          return ['hour', 'day', 'month', 'year'];
        },
      },
    },
    data() {
      return {
        viewMode: 'chart',
        formData: {
          daterange: [],
          date: '',
          mode: 'day',
        },
        data: {
          chartData: {},
          eopts: {
            // 默认颜色，仅限chartData内未设置color时生效
            color: ['#1890FF', '#ffa7a7', '#91CB74', '#FAC858', '#73C0DE', '#3CA272', '#FC8452', '#9A60B4', '#ea7ccc'],
            padding: [15, 10, 0, 15],
            yAxis: {
              name: '',
              nameTextStyle: {
                color: '#7d7d7d',
              },
              axisLine: {
                show: true, // 开启轴线
                lineStyle: {
                  color: '#dbdee4', // 轴线颜色（可选，自定义）
                  width: 1, // 轴线宽度（可选）
                  type: 'solid', // 轴线类型（可选，solid/dashed/dotted）
                },
              },
            },
          },
        },
        tableData: {
          data: [],
          columns: [],
        },
        pickerOptions: {
          disabledDate: (date) => {
            return date.getTime() > Date.now();
          },
        },
        loading: false,
        showValue: false,
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        this.modeChange();
      },
      modeChange(mode) {
        if (!mode) {
          mode = this.formData.mode;
        }
        let { vk } = this;
        let nowDate = new Date();
        const timeFormat = (type, count) => {
          let formatMap = {
            day: 'yyyy-MM-dd',
            month: 'yyyy-MM',
            year: 'yyyy',
          };
          return vk.pubfn.timeFormat(
            vk.pubfn.getOffsetTime(nowDate, {
              [type]: count,
              mode: 'before',
            }),
            formatMap[type]
          );
        };
        if (mode === 'hour') {
          this.formData.date = timeFormat('day', 0);
        } else if (mode === 'day') {
          let time1 = timeFormat('day', 30);
          let time2 = timeFormat('day', 0);
          this.formData.daterange = [time1, time2];
        } else if (mode === 'month') {
          let time1 = timeFormat('year', 0);
          this.formData.date = time1;
        } else if (mode === 'year') {
          let time1 = timeFormat('year', 0);
          this.formData.date = time1;
        }
        this.getList();
      },
      getList() {
        let { vk, useCache } = this;
        const successFn = (data) => {
          this.data.chartData = data.chartData;
          if (data.options) {
            if (data.options.yName) {
              this.data.eopts.yAxis.name = data.options.yName;
            }
          }
          this.showValueChange();
          this.convertToTableData();
        };
        if (useCache) {
          let cacheData = this.getCache();
          if (cacheData) {
            successFn(cacheData);
            return;
          }
        }
        vk.callFunction({
          url: this.url,
          data: this.formData,
          success: (data) => {
            successFn(data);
            if (useCache) {
              this.setCache(data);
            }
          },
        });
      },
      exportExcel() {
        let timeRanges = '';
        const modeMap = {
          hour: '小时统计',
          day: '日统计',
          month: '月统计',
          year: '年统计',
        };
        const modeLabel = modeMap[this.formData.mode] || '';
        if (this.formData.mode === 'day') {
          if (this.formData.daterange && this.formData.daterange.length === 2) {
            timeRanges = `${modeLabel}（${this.formData.daterange[0]}至${this.formData.daterange[1]}）`;
          }
        } else if (this.formData.mode === 'hour') {
          timeRanges = `${modeLabel}（${this.formData.date}）`;
        } else if (this.formData.mode === 'month' || this.formData.mode === 'year') {
          timeRanges = `${modeLabel}（${this.formData.date}）`;
        }
        this.$refs.table1.exportExcel({
          fileName: `${this.title}-${timeRanges}`,
          showNo: false,
        });
      },
      getCacheKey() {
        return `pub-${this.url}-${JSON.stringify(this.formData)}`;
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
      showValueChange() {
        try {
          let { showValue } = this;
          let series = this.data.chartData.series;
          for (let i = 0; i < series.length; i++) {
            let serie = series[i];
            serie.label.show = showValue;
          }
        } catch (err) {}
      },
      convertToTableData() {
        try {
          const { chartData } = this.data;
          if (!chartData || !chartData.categories || !chartData.series) {
            this.tableData = { data: [], columns: [] };
            return;
          }

          // 构建列配置
          const columns = [{ key: 'category', title: '时间', type: 'text', width: 150 }];

          chartData.series.forEach((serie, index) => {
            columns.push({
              key: `series_${index}`,
              title: serie.name || `系列${index + 1}`,
              type: 'text',
              minWidth: 150,
            });
          });

          // 构建数据
          const data = chartData.categories.map((category, categoryIndex) => {
            const row = { category };
            chartData.series.forEach((serie, serieIndex) => {
              row[`series_${serieIndex}`] = serie.data[categoryIndex];
            });
            return row;
          });

          this.tableData = { data, columns };
        } catch (err) {
          console.error('转换表格数据失败:', err);
          this.tableData = { data: [], columns: [] };
        }
      },
    },
    watch: {},
    computed: {
      bodyStyleCom() {
        let height = isNaN(this.height) ? this.height : `${this.height}px`;
        return {
          height,
        };
      },
      modeDataCom() {
        let { dimensions = [] } = this;
        const map = { hour: '时', day: '日', month: '月', year: '年' };
        return dimensions.filter((k) => map[k]).map((k) => ({ value: k, label: map[k] }));
      },
    },
  };
</script>
<style lang="scss" scoped>
  .vk-data-charts {
    margin: 5px;

    .header {
      display: flex;
      align-items: center;

      .header-title {
        flex: 1;
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: 10px;

        .view-mode-btns {
          display: flex;

          .icon-line {
            border-radius: 3px 0px 0px 3px;
          }

          .icon-grid {
            border-radius: 0px 3px 3px 0px;
            margin-left: -1px;
          }
        }

        .show-value-switch-box {
          display: flex;
          align-items: center;

          .show-value-switch-label {
            margin-right: 5px;
            font-size: 15px;
          }

          .show-value-switch {
            margin-top: -4px;
          }
        }

        .date-picker {
          flex-shrink: 0;
        }
      }
    }
  }

  ::v-deep {
    .el-card__header {
      padding: 12px 20px;
      border-bottom: 1px solid #ebeef5;
      -webkit-box-sizing: border-box;
      box-sizing: border-box;
    }
  }

  @media (max-width: 768px) {
    .vk-data-charts {
      margin: 5px 0;
      min-width: 500px;

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;

        .header-title {
          font-size: 15px;
          margin-bottom: 5px;
        }

        .header-controls {
          flex-direction: column;
          gap: 8px;

          .date-picker {
            width: 100%;
            display: flex;
            justify-content: center;
          }
        }
      }
    }

    ::v-deep {
      .el-card__header {
        padding: 10px 12px;
      }

      .el-card__body {
        padding: 12px;
      }
    }
  }
</style>
