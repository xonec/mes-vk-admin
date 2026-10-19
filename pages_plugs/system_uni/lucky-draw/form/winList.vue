<template>
  <vk-data-drawer v-model="value.show" :title="page.title" v-loading="page.loading" :width="page.width" :destroy-on-close="true" direction="rtl" @open="onOpen" @closed="onClose">
    <div class="drawer-content">
      <div class="drawer-actions">
        <el-button size="mini" type="primary" @click="batchdDeliveryPrize">提交发货信息</el-button>
        <el-button size="mini" @click="refresh">刷新</el-button>
      </div>
      <vk-data-table
        ref="table1"
        :action="table1.action"
        :columns="table1.columns"
        :query-form-param="queryForm1"
        :selection="false"
        :row-no="false"
        :pagination="true"
        :page-size="100"
        :page-sizes="[1, 10, 50, 100, 500]"
        :left-fixed="false"
        :right-fixed="false"
        :default-sort="{ name: '_add_time', type: 'desc' }"
        size="mini"
        @current-change="currentChange"
        @selection-change="selectionChange"
      >
        <template v-slot:receiver_name="{ row, column, index }">
          <el-input
            v-if="row.prize && !row.prize.delivery_method && row.express_info"
            v-model="row.express_info[column.key]"
            size="mini"
            @input="inputValue(row, column.key, $event)"
          />
          <div v-else>-</div>
        </template>
        <template v-slot:receiver_mobile="{ row, column, index }">
          <el-input
            v-if="row.prize && !row.prize.delivery_method && row.express_info"
            v-model="row.express_info[column.key]"
            size="mini"
            @input="inputValue(row, column.key, $event)"
          />
          <div v-else>-</div>
        </template>
        <template v-slot:formatted_address="{ row, column, index }">
          <el-input
            v-if="row.prize && !row.prize.delivery_method && row.express_info"
            v-model="row.express_info[column.key]"
            size="mini"
            @input="inputValue(row, column.key, $event)"
          />
          <div v-else>-</div>
        </template>
        <template v-slot:express_name="{ row, column, index }">
          <el-select
            v-if="row.prize && !row.prize.delivery_method && row.express_info"
            v-model="row.express_info[column.key]"
            placeholder="请选择"
            size="mini"
            @change="expressNameChange"
          >
            <el-option v-for="item in expressOptions" :key="item.label" :label="item.label" :value="item.label"> </el-option>
          </el-select>
          <div v-else>-</div>
        </template>
        <template v-slot:express_no="{ row, column, index }">
          <el-input
            v-if="row.prize && !row.prize.delivery_method && row.express_info"
            v-model="row.express_info[column.key]"
            size="mini"
            @input="inputValue(row, column.key, $event)"
          />
          <div v-else>-</div>
        </template>
      </vk-data-table>
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
          title: '中奖列表',
          submitText: '确定',
          cancelText: '关闭',
          showCancel: true,
          width: '85%',
        },
        loading: false,
        table1: {
          // 表格数据请求地址
          action: 'plugs/lucky-draw/admin/sys.luckyDraw.getActivityWinList',
          // 表格字段显示规则
          columns: [
            { key: 'userInfo', title: '中奖人', type: 'userInfo', width: 120 },
            {
              key: '',
              title: '奖品信息',
              type: 'group',
              minWidth: 280,
              align: 'left',
              columns: [
                { key: 'prize.name', title: '奖品名称', type: 'text', width: 180, align: 'left' },
                { key: 'status_text', title: '状态', type: 'text', width: 120 },
                { key: 'prize.delivery_method_text', title: '领取方式', type: 'text', width: 140, defaultValue: '快递邮寄' },
                { key: 'express_info.express_time', title: '发货时间', type: 'time', width: 160, defaultValue: '-' },
              ],
            },
            {
              key: 'confirm_address',
              title: '地址确认?',
              type: 'text',
              width: 100,
              formatter: (val, row, column, index) => {
                if (row.prize && !row.prize.delivery_method) {
                  let str = val ? '是' : '否';
                  return str;
                } else {
                  return '无需快递';
                }
              },
            },
            { key: 'receiver_name', title: '收货人', type: 'text', minWidth: 120 },
            { key: 'receiver_mobile', title: '手机号', type: 'text', minWidth: 120 },
            { key: 'formatted_address', title: '收货地址', type: 'text', minWidth: 240, align: 'left' },
            { key: 'express_name', title: '快递公司', type: 'text', minWidth: 130 },
            { key: 'express_no', title: '快递单号', type: 'text', minWidth: 150 },
            { key: '_add_time', title: '中奖时间', type: 'time', width: 160, sortable: 'custom' },
          ],
          // 多选框选中的值
          multipleSelection: [],
          // 当前高亮的记录
          selectItem: '',
        },
        queryForm1: {
          formData: {
            _id: '',
          },
        },
        expressOptions: [
          { label: '中通快递' },
          { label: '申通快递' },
          { label: '圆通快递' },
          { label: '顺丰速运' },
          { label: '天天快递' },
          { label: '中国邮政' },
          { label: '韵达速递' },
          { label: '德邦快递/物流' },
          { label: '其他/智能识别' },
        ],
      };
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
        this.queryForm1.formData._id = item._id;
      },
      // 监听 - 页面关闭
      onClose() {},
      // 搜索
      search() {
        this.$refs.table1.search();
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
      expressNameChange(val) {
        setTimeout(() => {
          let list = this.$refs.table1.getTableData();
          let rows = [];
          list.forEach((item) => {
            if (item.express_info && (!item.express_info.express_name || !item.express_info.express_no)) {
              let express_info = item.express_info;
              express_info.express_name = val;
              rows.push({ _id: item._id, express_info });
            }
          });
          this.$refs.table1.updateRows({
            mode: 'update', // update 局部字段更新 set 覆盖字段更新
            rows,
          });
        }, 100);
      },
      inputValue(item, key, value) {
        if (item && item.express_info) {
          item.express_info[key] = value;
          this.$refs.table1.updateRows({
            mode: 'update', // update 局部字段更新 set 覆盖字段更新
            rows: [{ _id: item._id, express_info: item.express_info }],
          });
        }
      },
      batchdDeliveryPrize() {
        let tableData = this.$refs.table1.getTableData();
        let list = [];
        tableData.forEach((item) => {
          if (
            (item.express_info && item.express_info.express_name && item.express_info.express_no) ||
            (item.express_info.receiver_name && item.express_info.receiver_mobile && item.express_info.formatted_address)
          ) {
            list.push({
              _id: item._id,
              receiver_name: item.express_info.receiver_name,
              receiver_mobile: item.express_info.receiver_mobile,
              formatted_address: item.express_info.formatted_address,
              express_name: item.express_info.express_name,
              express_no: item.express_info.express_no,
            });
          }
        });
        vk.callFunction({
          url: 'plugs/lucky-draw/admin/sys.luckyDraw.batchdDeliveryPrize',
          title: '请求中...',
          data: {
            _id: this.queryForm1.formData._id,
            list,
          },
          success: (data) => {
            this.$message.success('发货成功');
          },
        });
      },
    },
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped>
  .drawer-content {
    padding: 0 20px;
  }
</style>
