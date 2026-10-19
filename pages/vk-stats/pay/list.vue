<template>
  <div>
    <!-- 搜索区域卡片 -->
    <div class="vk-page-card vk-page-search-card">
      <vk-data-table-query
        v-model="queryForm1.formData"
        :columns="queryForm1.columns"
        :span="4"
        :collapse-rows="1"
        :collapse-default-expand="true"
        @search="search"
        @collapse-change="collapseChange"
      ></vk-data-table-query>
    </div>

    <!-- 表格内容卡片 -->
    <div class="vk-page-card">
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">支付订单列表</div>
        <div class="vk-page-card-actions">
          <el-button :size="$global.size" icon="el-icon-data-line" @click="pageTo('./overview')">支付统计</el-button>
          <el-button :size="$global.size" icon="el-icon-s-data" @click="pageTo('./ranking')">用户价值排行</el-button>
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
          :right-btns="['detail']"
          :row-no="false"
          :pagination="true"
          :top="0"
          @current-change="currentChange"
          @selection-change="selectionChange"
          @detail="onDetail"
        >
          <template v-slot:button1="{ row }">
            <div v-if="row.status <= 0">-</div>
            <el-tag type="success" effect="dark" v-else-if="row.user_order_success">成功</el-tag>
            <el-button type="danger" size="mini" v-else-if="row.status === 1" @click="afreshNotice(row)">重新推送</el-button>
            <div v-else-if="row.refund_fee > 0">失败，但已退款</div>
            <div v-else>未知</div>
          </template>
        </vk-data-table>
      </div>
    </div>

    <!-- 自定义详情弹窗 -->
    <vk-pay-orders-detail ref="detailDialog" @afresh-notice="afreshNotice" @refresh="refresh"></vk-pay-orders-detail>
  </div>
</template>

<script>
  import vkPayOrdersDetail from './form/detail.vue';
  import { payTypeData, payTypeSearchData, platformData, orderTypeData, statusData } from './constants.js';

  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据

  export default {
    components: {
      vkPayOrdersDetail,
    },
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
          action: 'admin/system_uni/pay-orders/sys/getList',
          // 表格字段显示规则
          columns: [
            { key: 'button1', title: '回调通知状态', type: 'text', width: 120, fixed: 'right' },
            { key: 'out_trade_no', title: '商户单号', type: 'text', width: 200 },
            {
              key: 'type',
              title: '订单类型',
              type: 'select',
              width: 140,
              data: orderTypeData,
            },
            {
              key: 'pay_type',
              title: '支付类型',
              type: 'tag',
              width: 180,
              data: payTypeData,
            },
            {
              key: 'status',
              title: '订单状态',
              type: 'tag',
              width: 110,
              data: statusData,
            },
            { key: 'create_date', title: '创建时间', type: 'time', width: 160 },
            { key: 'pay_date', title: '支付时间', type: 'time', width: 160 },
            { key: 'total_fee', title: '订单金额', type: 'money', width: 110 },
            { key: 'refund_fee', title: '退款金额', type: 'money', width: 110, defaultValue: '-' },
            { key: 'refund_num', title: '退款次数', type: 'number', width: 80, defaultValue: '-' },
            { key: 'transaction_id', title: '支付单号', type: 'text', width: 260, defaultValue: '-' },
            { key: 'openid', title: 'openid', type: 'text', width: 280, show: ['detail'] },
            {
              key: 'refund_list',
              title: '退款详情',
              type: 'table',
              width: 360,
              show: ['detail'],
              columns: [
                { key: 'out_refund_no', title: '退款单号', type: 'text', minWidth: 200 },
                { key: 'refund_date', title: '退款时间', type: 'time', width: 180 },
                { key: 'refund_fee', title: '退款金额', type: 'money', width: 140 },
                { key: 'refund_desc', title: '退款备注', type: 'text', minWidth: 180 },
              ],
            },
            { key: 'original_data', title: '原始数据', type: 'json', width: 300, show: ['detail'] },
            //{ key: "wxpay_info", title: "微信支付特有数据", type: "json", width: 360, show: ["detail"] },
            //{ key: "alipay_info", title: "支付宝支付特有数据", type: "json", width: 300, show: ["detail"] },
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
          formData: {},
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            { key: 'out_trade_no', title: '商户单号', type: 'text', mode: '%%' },
            { key: 'transaction_id', title: '平台单号', type: 'text', mode: '%%' },
            { key: 'user_id', title: '用户ID', type: 'text', mode: '=' },
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
              title: '支付类型',
              type: 'select',
              mode: '%*',
              data: payTypeSearchData,
            },
            { key: 'total_fee', title: '金额范围', type: 'money', placeholder: ['最小金额', '最大金额'], range: true, mode: '[]', span: 8 },
            { key: 'pay_date', title: '支付时间', type: 'datetimerange', mode: '[]' },
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
      // 处理从统计页面传递过来的筛选参数
      if (options.platform || options.orderType || options.startTime || options.user_id || options.pay_type) {
        this.applyExternalFilter(options);
      }
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
      init(options) {
        originalForms['form1'] = vk.pubfn.copyObject(this.form1);
      },
      // 应用外部筛选参数（从统计页面跳转过来时）
      applyExternalFilter(options) {
        const formData = {};
        if (options.platform) {
          formData.platform = options.platform;
        }
        if (options.user_id) {
          formData.user_id = options.user_id;
        }
        if (options.pay_type) {
          formData.pay_type = options.pay_type;
        }
        if (options.orderType) {
          formData.type = options.orderType;
        }
        if (vk.pubfn.isNotNull(options.status)) {
          formData.status = isNaN(options.status) ? options.status : Number(options.status);
        }
        if (options.startTime && options.endTime) {
          formData.pay_date = [Number(options.startTime), Number(options.endTime)];
        }
        this.queryForm1.formData = formData;
        // 延迟执行搜索，确保表格组件已初始化
        this.$nextTick(() => {
          this.$refs.table1.search();
        });
      },
      // 页面跳转
      pageTo(path) {
        vk.navigateTo(path);
      },
      // 表单重置
      resetForm() {
        vk.pubfn.resetForm(originalForms, this);
      },
      // 搜索
      search(obj) {
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
      // 点击详情按钮，打开自定义详情弹窗
      onDetail({ row }) {
        this.$refs.detailDialog.open(row);
      },
      // 重新推送
      afreshNotice(row) {
        vk.callFunction({
          url: 'admin/system_uni/pay-orders/sys/afreshNotice',
          title: '请求中...',
          data: {
            _id: row._id,
          },
          success: (data) => {
            // 刷新数据
            this.refresh();
          },
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
</script>
<style lang="scss" scoped>
  page {
    background-color: var(--bgcolor);
  }
</style>
