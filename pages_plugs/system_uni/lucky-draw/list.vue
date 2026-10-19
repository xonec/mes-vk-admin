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
      <!-- 操作按钮与表格标题区域 -->
      <div class="vk-page-card-toolbar">
        <div class="vk-page-card-title">抽奖活动列表</div>
        <div class="vk-page-card-actions">
          <el-button type="primary" :size="$global.size" icon="el-icon-circle-plus-outline" @click="addBtn">添加</el-button>
          <el-button type="success" :size="$global.size" icon="el-icon-circle-plus-outline" @click="showSetKey">设置key</el-button>
          <el-button :size="$global.size" icon="el-icon-download" @click="exportExcel">导出Excel</el-button>
          <el-button :size="$global.size" @click="showHelp">查看教程</el-button>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="vk-page-card-table">
        <vk-data-table
          ref="table1"
          :action="table1.action"
          :columns="table1.columns"
          :query-form-param="queryForm1"
          :right-btns="['update', 'delete']"
          :custom-right-btns="table1.customRightBtns"
          right-btns-align="right"
          :selection="true"
          :batch-btns="table1.batchBtns"
          :row-no="true"
          :pagination="true"
          :auto-action="false"
          :default-sort="{ name: 'sort', type: 'desc' }"
          :top="0"
          @update="updateBtn"
          @delete="deleteBtn"
          @current-change="currentChange"
          @table-mounted="init"
        >
          <!-- 排序值 -->
          <template v-slot:sort="{ row, column, index }">
            <el-input v-model="row.sort" size="mini" @change="sortChange($event, row)" />
          </template>
        </vk-data-table>
      </div>
    </div>

    <!-- 添加或编辑的弹窗 -->
    <vk-data-dialog v-model="form1.props.show" :title="form1.props.title" width="600px" mode="form" :close-on-click-modal="true">
      <vk-data-form
        v-model="form1.data"
        :rules="form1.props.rules"
        :action="form1.props.action"
        :form-type="form1.props.formType"
        :columns="form1.props.columns"
        label-width="120px"
        @success="
          form1.props.show = false;
          refresh();
        "
      >
        <template v-slot:qrcode="{ form, keyName, column }">
          <div class="qrcode-container">
            <div class="qrcode-card">
              <div class="qrcode-header">
                <span class="qrcode-title">创建活动</span>
              </div>
              <div class="qrcode-image-wrapper">
                <image :src="qrcode" mode="aspectFit" class="qrcode-image"></image>
              </div>
              <div class="qrcode-tips">
                <span class="tips-text">微信扫一扫上方小程序码</span>
                <span class="tips-sub">可创建活动，然后即可在此处选择</span>
              </div>
            </div>
          </div>
        </template>
      </vk-data-form>
    </vk-data-dialog>

    <setKey v-model="formDatas.setKey" @success="refresh"></setKey>
    <activityDetail v-model="formDatas.activityDetail"></activityDetail>
    <winList v-model="formDatas.winList"></winList>
    <help v-model="formDatas.help"></help>
  </div>
</template>

<script>
  let vk = uni.vk; // vk实例
  let originalForms = {}; // 表单初始化数据
  import setKey from './form/setKey';
  import activityDetail from './form/activityDetail';
  import winList from './form/winList';
  import help from './form/help';
  import { qrcodeAdd } from './image.json';
  export default {
    components: {
      setKey,
      activityDetail,
      winList,
      help,
    },
    data() {
      // 页面数据变量
      return {
        qrcode: qrcodeAdd,
        // 页面是否请求中或加载中
        loading: false,
        // init请求返回的数据
        data: {},
        // 表格相关开始 -----------------------------------------------------------
        table1: {
          // 表格数据请求地址
          action: 'plugs/lucky-draw/admin/sys.luckyDraw.getList',
          // 表格字段显示规则
          columns: [
            { key: 'sort', title: '排序', type: 'number', width: 80, defaultValue: '0', sortable: 'custom' },
            { key: 'cover_image', title: '封面图', type: 'image', width: 120 },
            { key: 'title', title: '活动标题', type: 'text', width: 340, align: 'left' },
            {
              key: 'enable',
              title: '是否启用',
              type: 'switch',
              width: 80,
              watch: (res) => {
                let { value, row, change } = res;
                vk.callFunction({
                  url: 'plugs/lucky-draw/admin/sys.luckyDraw.update',
                  title: '请求中...',
                  data: {
                    _id: row._id,
                    enable: value,
                  },
                  success: (data) => {
                    if (data.num > 0) {
                      change(value);
                    }
                  },
                });
              },
            },
            { key: '_add_time', title: '添加时间', type: 'time', width: 160, sortable: 'custom' },
            { key: '_add_time', title: '距离现在', type: 'dateDiff', width: 120 },
            { key: 'activity_id', title: '活动ID', type: 'text', width: 200 },
          ],
          // 底部批量操作按钮
          batchBtns: [
            {
              title: '批量启用',
              confirm: true,
              onClick: (items) => {
                let ids = items.map((item) => item._id);
                vk.callFunction({
                  url: 'plugs/lucky-draw/admin/sys.luckyDraw.update',
                  title: '请求中...',
                  data: {
                    _id: ids,
                    enable: true,
                  },
                  success: (data) => {
                    if (data.num > 0) {
                      let list = this.$refs.table1.getMultipleSelection();
                      list.forEach((item) => {
                        item.enable = true;
                      });
                    }
                  },
                });
              },
            },
            {
              title: '批量停用',
              confirm: true,
              onClick: (items) => {
                let ids = items.map((item) => item._id);
                vk.callFunction({
                  url: 'plugs/lucky-draw/admin/sys.luckyDraw.update',
                  title: '请求中...',
                  data: {
                    _id: ids,
                    enable: false,
                  },
                  success: (data) => {
                    if (data.num > 0) {
                      let list = this.$refs.table1.getMultipleSelection();
                      list.forEach((item) => {
                        item.enable = false;
                      });
                    }
                  },
                });
              },
            },
            {
              title: '批量删除',
              type: 'danger',
              icon: 'el-icon-delete',
              confirm: true,
              onClick: (items) => {
                let ids = items.map((item) => item._id);
                vk.callFunction({
                  url: 'plugs/lucky-draw/admin/sys.luckyDraw.delete',
                  title: '请求中...',
                  data: {
                    _id: ids,
                  },
                  success: (data) => {
                    this.$message({
                      message: data.msg,
                      type: data.num > 0 ? 'success' : 'error',
                    });
                    if (data.num > 0) {
                      this.refresh();
                    }
                  },
                });
              },
            },
          ],
          // 当前高亮的记录
          selectItem: '',
          customRightBtns: [
            {
              title: '活动数据',
              onClick: (item) => {
                vk.callFunction({
                  url: 'plugs/lucky-draw/admin/sys.luckyDraw.getActivityInfo',
                  title: '请求中...',
                  data: {
                    _id: item._id,
                  },
                  success: (data) => {
                    vk.pubfn.openForm('activityDetail', { item: data.info });
                  },
                });
              },
            },
            {
              title: '中奖名单',
              type: 'success',
              onClick: (item) => {
                vk.pubfn.openForm('winList', { item });
              },
            },
          ],
        },
        // 表格相关结束 -----------------------------------------------------------
        // 表单相关开始 -----------------------------------------------------------
        // 查询表单请求数据
        queryForm1: {
          // 查询表单数据源，可在此设置默认值
          formData: {
            enable: '',
            status: '',
          },
          // 查询表单的字段规则 fieldName:指定数据库字段名,不填默认等于key
          columns: [
            {
              key: 'enable',
              title: '是否启用',
              type: 'select',
              mode: '=',
              clearable: false,
              data: [
                { value: '', label: '全部' },
                { value: true, label: '启用' },
                { value: false, label: '停用' },
              ],
            },
            { key: 'title', title: '活动标题', type: 'text', mode: '%%' },
          ],
        },
        form1: {
          // 表单请求数据，此处可以设置默认值
          data: {
            list: [],
            sort: 0,
            enable: true,
          },
          // 表单属性
          props: {
            // 表单请求地址
            action: '',
            // 表单字段显示规则
            columns: [
              {
                key: 'list',
                title: '请选择活动',
                type: 'table-select',
                placeholder: '请选择活动',
                show: ['add'],
                action: 'plugs/lucky-draw/admin/sys.luckyDraw.getActivityList',
                multiple: true,
                multipleLimit: 500,
                valueFields: ['_id', '_add_time', 'title', 'prize_list', 'prize_text', 'start_time', 'end_time', 'max_people', 'lottery_type', 'mode'],
                columns: [
                  { key: 'title', title: '活动标题', type: 'text', minWidth: 200, nameKey: true, align: 'left' },
                  {
                    key: 'status',
                    title: '活动状态',
                    type: 'tag',
                    minWidth: 100,
                    data: [
                      { value: 0, label: '未开始', tagType: 'info' },
                      { value: 1, label: '进行中', tagType: 'success' },
                      { value: 2, label: '已结束', tagType: 'danger' },
                    ],
                  },
                  { key: '_id', title: '活动ID', type: 'text', idKey: true, show: ['none'] }, // idKey:true 代表此字段为主键字段，若设置show:["none"],则可以在表格中隐藏该字段的显示
                ],
                formData: {
                  status: 1,
                },
                queryColumns: [
                  {
                    key: 'status',
                    title: '活动状态',
                    type: 'select',
                    width: 150,
                    mode: '=',
                    clearable: false,
                    data: [
                      { value: '', label: '全部' },
                      { value: 0, label: '未开始' },
                      { value: 1, label: '进行中' },
                      { value: 2, label: '已结束' },
                    ],
                  },
                  { key: 'title', title: '活动标题', type: 'text', width: 150, mode: '%%' },
                ],
              },
              { key: 'enable', title: '是否启用', type: 'switch' },
              { key: 'sort', title: '排序', type: 'number', width: 150, precision: 0, controls: true, step: 1, stepStrictly: true },
              { key: 'cover_image', title: '活动封面', type: 'file-select', placeholder: '请选择图片', fileType: 'image', multiple: false, multipleLimit: 1, imageFit: 'cover' },
              { key: 'qrcode', title: '', type: 'text', showLabel: false },
            ],
            // 表单验证规则
            rules: {
              list: [{ required: true, type: 'array', min: 1, message: '请选择活动', trigger: 'blur' }],
              cover_image: [{ required: true, message: '请上传活动封面图', trigger: 'blur' }],
            },
            // add 代表添加 update 代表修改
            formType: '',
            // 是否显示表单的弹窗
            show: false,
          },
        },
        // 其他弹窗表单
        formDatas: {},
        // 表单相关结束 -----------------------------------------------------------
        key: '',
      };
    },
    // 监听 - 页面每次【加载时】执行(如：前进)
    onLoad(options = {}) {
      vk = this.vk;
      this.options = options;
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
      init() {
        let options = this.options;
        originalForms['form1'] = vk.pubfn.copyObject(this.form1);
        this.checkKey();
        this.search();
      },
      // 查看是否设置了key
      checkKey() {
        vk.callFunction({
          url: 'plugs/lucky-draw/admin/sys.luckyDraw.getKey',
          data: {},
          success: (data) => {
            if (data.key) {
              this.key = data.key;
            } else {
              this.showSetKey();
            }
          },
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
      search() {
        this.$refs.table1.search();
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
      // 显示添加页面
      addBtn() {
        this.resetForm();
        this.form1.props.action = 'plugs/lucky-draw/admin/sys.luckyDraw.add';
        this.form1.props.formType = 'add';
        this.form1.props.title = '添加';
        this.form1.props.show = true;
      },
      // 显示修改页面
      updateBtn({ item }) {
        this.resetForm();
        this.form1.props.action = 'plugs/lucky-draw/admin/sys.luckyDraw.update';
        this.form1.props.formType = 'update';
        this.form1.props.title = '修改';
        this.form1.data = vk.pubfn.copyObject(item);
        this.form1.props.show = true;
      },
      // 删除按钮
      deleteBtn({ item, deleteFn }) {
        deleteFn({
          action: 'plugs/lucky-draw/admin/sys.luckyDraw.delete',
          data: {
            _id: item._id,
          },
        });
      },
      // 监听 - 排序值发生变化时触发
      sortChange(sort, item) {
        vk.callFunction({
          url: 'plugs/lucky-draw/admin/sys.luckyDraw.update',
          data: {
            _id: item._id,
            sort: Number(sort),
          },
          success: (data) => {},
        });
      },
      // 显示设置key的弹窗
      showSetKey() {
        vk.pubfn.openForm('setKey', {
          item: {
            key: this.key,
          },
        });
      },
      // 显示帮助弹窗
      showHelp() {
        vk.pubfn.openForm('help', {});
      },
      // 导出Excel
      exportExcel() {
        this.$refs.table1.exportExcel({
          showColumnSelector: true,
        });
      },
    },
    // 监听属性
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped>
  page {
    background-color: var(--bgcolor);
  }
  .qrcode-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px 0;

    .qrcode-card {
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      max-width: 280px;
      width: 100%;
      border: 1px solid #ebebeb;

      .qrcode-header {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;

        .qrcode-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          letter-spacing: 0.5px;
        }
      }

      .qrcode-image-wrapper {
        position: relative;
        display: flex;
        justify-content: center;
        margin-bottom: 20px;

        .qrcode-image {
          width: 160px;
          height: 160px;
          border-radius: 12px;
          border: 1px solid #ebebeb;
          padding: 5px;
        }
      }

      .qrcode-tips {
        text-align: center;

        .tips-text {
          display: block;
          font-size: 15px;
          font-weight: 500;
          color: #34495e;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .tips-sub {
          display: block;
          font-size: 13px;
          color: #7f8c8d;
          line-height: 1.4;
        }
      }
    }
  }
</style>
