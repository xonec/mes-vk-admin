<template>
  <div>
    <!-- 搜索区域卡片 -->
    <div class="vk-page-card vk-page-search-card">
      <vk-data-table-query
        v-model="queryForm1.formData"
        :columns="queryForm1.columns"
        :span="3"
        :collapse-rows="1"
        :collapse-default-expand="true"
        @search="search"
        @collapse-change="collapseChange"
      ></vk-data-table-query>
    </div>

    <!-- 表格内容卡片 -->
    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">用户价值排行</div>
        <div class="vk-page-card-actions">
          <el-button :size="$global.size" icon="el-icon-data-line" @click="pageTo('./overview')">支付统计</el-button>
          <el-button :size="$global.size" icon="el-icon-tickets" @click="pageTo('./list')">订单明细</el-button>
          <el-button :size="$global.size" icon="el-icon-download" @click="exportExcel">导出Excel</el-button>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="vk-page-card-table">
        <vk-data-table
          ref="table1"
          :action="table1.action"
          :columns="table1.columns"
          :query-form-param="queryForm1"
          :custom-right-btns="table1.customRightBtns"
          :default-sort="table1.defaultSort"
          :row-no="false"
          :pagination="true"
          get-count="auto"
          :top="0"
          :data-preprocess="dataPreprocess"
          @current-change="currentChange"
          @selection-change="selectionChange"
        ></vk-data-table>
      </div>
    </div>
  </div>
</template>

<script>
  import { payTypeSearchData, platformData, orderTypeData, statusData } from './constants.js';

  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据

  export default {
    data() {
      // 页面数据变量
      return {
        // 页面是否请求中或加载中
        loading: false,
        // init请求返回的数据
        data: {},
        // 表格相关开始 -----------------------------------------------------------
        table1: {
          // 表格数据请求地址
          action: 'admin/system_uni/pay-orders/sys/getRanking',
          // 表格字段显示规则
          columns: [
            { key: 'rank', title: '排行', type: 'number', width: 70, fixed: 'left' },
            { key: 'user', title: '用户', type: 'text', width: 220 },
            { key: 'userInfo.mobile', title: '手机号', type: 'text', width: 140, defaultValue: '-' },
            { key: 'payAmount', title: '支付金额', type: 'money', width: 120, sortable: 'custom' },
            { key: 'refundAmount', title: '退款金额', type: 'money', width: 120, sortable: 'custom' },
            { key: 'netIncome', title: '净收入', type: 'money', width: 120, sortable: 'custom' },
            { key: 'payCount', title: '支付笔数', type: 'number', width: 100, sortable: 'custom' },
            { key: 'avgOrderAmount', title: '客单价', type: 'money', width: 110 },
            { key: 'lastPayDate', title: '最近支付时间', type: 'time', width: 170, sortable: 'custom' },
          ],
          defaultSort: { name: 'netIncome', type: 'desc' },
          customRightBtns: [
            {
              title: '订单明细',
              type: 'primary',
              icon: 'el-icon-tickets',
              onClick: (row) => {
                this.pageToOrderList(row);
              },
            },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
        },
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始 -----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {
            status: 'paid-success',
            pay_date: getDefaultPayDateRange(),
          },
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            {
              key: 'user_id',
              title: '用户',
              type: 'table-select',
              placeholder: '请选择用户',
              action: 'admin/system/user/sys/getList',
              columns: [
                { key: 'avatar', title: '头像', type: 'image', width: 80 },
                { key: 'nickname', title: '用户昵称', type: 'text', minWidth: 200, nameKey: true },
                { key: 'mobile', title: '手机号', type: 'text', minWidth: 140 },
                { key: '_id', title: '用户ID', type: 'text', width: 240, idKey: true },
              ],
              queryColumns: [
                { key: 'nickname', title: '用户昵称', type: 'text', width: 150, mode: '%%' },
                { key: 'mobile', title: '手机号', type: 'text', width: 150, mode: '%%' },
                { key: '_id', title: '用户ID', type: 'text', width: 150, mode: '=' },
              ],
            },
            {
              key: 'platform',
              title: '平台',
              type: 'select',
              mode: '=',
              data: platformData,
            },
            {
              key: 'type',
              title: '订单类型',
              type: 'select',
              mode: '=',
              data: orderTypeData,
            },
            {
              key: 'status',
              title: '订单状态',
              type: 'select',
              mode: 'custom',
              data: statusData,
            },
            {
              key: 'pay_type',
              title: '支付方式',
              type: 'select',
              mode: '%*',
              data: payTypeSearchData,
            },
            { key: 'pay_date', title: '支付时间', type: 'datetimerange', mode: '[]', minWidth: 400, clearable: false },
          ],
        },
        // 表单相关结束 -----------------------------------------------------------
      };
    },
    // 监听 - 页面每次【加载时】执行(如：前进)
    onLoad(options = {}) {
      vk = this.vk;
      this.options = options;
      this.init(options);
    },
    // 函数
    methods: {
      // 页面数据初始化函数
      init(options) {
        originalForms['queryForm1'] = vk.pubfn.copyObject(this.queryForm1);
      },
      // 页面跳转
      pageTo(path) {
        vk.navigateTo(path);
      },
      // 跳转订单明细
      pageToOrderList(row) {
        const formData = this.queryForm1.formData;
        const params = {
          user_id: row.user_id,
          platform: formData.platform,
          orderType: formData.type,
          status: formData.status,
          pay_type: formData.pay_type,
        };
        if (Array.isArray(formData.pay_date) && formData.pay_date.length === 2) {
          params.startTime = formData.pay_date[0];
          params.endTime = formData.pay_date[1];
        }
        const query = Object.keys(params)
          .filter((key) => vk.pubfn.isNotNull(params[key]))
          .map((key) => `${key}=${encodeURIComponent(params[key])}`)
          .join('&');
        vk.navigateTo(`./list?${query}`);
      },
      // 表单重置
      resetForm() {
        vk.pubfn.resetForm(originalForms, this);
      },
      // 搜索
      search(obj = {}) {
        if (!isValidDateRange(this.queryForm1.formData.pay_date)) {
          this.queryForm1.formData.pay_date = getDefaultPayDateRange();
          if (obj.formData) {
            obj.formData.pay_date = this.queryForm1.formData.pay_date;
          }
        }
        this.$refs.table1.query(obj);
      },
      // 监听 - 查询表单折叠面板变化事件
      collapseChange() {
        // 执行表格重新布局
        this.$refs.table1.doLayout();
      },
      // 刷新
      refresh() {
        this.$refs.table1.refresh();
      },
      // 获取当前选中的行的数据
      getCurrentRow() {
        return this.$refs.table1.getCurrentRow();
      },
      // 监听 - 行的选中高亮事件
      currentChange(val) {
        this.table1.selectItem = val;
      },
      // 当选择项发生变化时会触发该事件
      selectionChange(list) {
        this.table1.multipleSelection = list;
      },
      // 给当前页数据补排行序号
      dataPreprocess(list) {
        if (!Array.isArray(list)) return list;
        const table = this.$refs.table1 || {};
        const pageIndex = Number(table.pageIndex || 1);
        const pageSize = Number(table.pageSize || list.length || 10);
        return list.map((item, index) => {
          item.rank = (pageIndex - 1) * pageSize + index + 1;
          item.user = getUserDisplayName(item);
          return item;
        });
      },
      // 导出Excel
      exportExcel() {
        this.$refs.table1.exportExcel({
          showColumnSelector: true,
        });
      },
    },
    watch: {},
    // 计算属性
    computed: {},
  };

  function getUserDisplayName(row) {
    const userInfo = row.userInfo || {};
    return userInfo.nickname || row.user_id || '-';
  }

  function getDefaultPayDateRange() {
    const start = vk.pubfn.getDayOffsetStartAndEnd(-29, new Date());
    const end = vk.pubfn.getDayOffsetStartAndEnd(0, new Date());
    return [start.startTime, end.endTime];
  }

  function isValidDateRange(value) {
    return Array.isArray(value) && value.length === 2 && Number(value[0]) > 0 && Number(value[1]) > 0;
  }
</script>
<style lang="scss" scoped>
  page {
    background-color: var(--bgcolor);
  }
</style>
