<template>
  <vk-data-dialog v-model="value.show" :title="page.title" :top="page.top" :width="page.width" :close-on-click-modal="true" @open="onOpen" @closed="onClose">
    <vk-data-input-radio v-model="form1.level" :localdata="localdata" option-type="button" @change="onChange"></vk-data-input-radio>
    <!-- 页面主体内容结束 -->
  </vk-data-dialog>
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
          title: '修改权限分类',
          top: '20vh',
          width: '460px',
        },
        form1: {
          _id: '',
        },
        localdata: [
          { value: 1, label: '子弹级', tagType: 'success' },
          { value: 2, label: '炸弹级', tagType: '' },
          { value: 3, label: '榴弹级', tagType: 'warning' },
          { value: 4, label: '核弹级', tagType: 'danger' },
          { value: 0, label: '其他', tagType: 'info' },
        ],
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
        this.form1 = {
          _id: item._id,
          level: item.level,
        };
      },
      // 监听 - 页面关闭
      onClose() {
        //this.$refs.form1.resetForm(); // 关闭时，重置表单
      },
      onChange(value) {
        vk.callFunction({
          url: 'admin/system/permission/sys/updateLevel',
          title: '请求中...',
          data: this.form1,
          success: (data) => {
            this.$set(this.value.item, 'level', value);
            this.value.show = false; // 关闭页面
            this.$emit('success');
          },
        });
      },
    },
    // 监听属性
    watch: {},
    // 计算属性
    computed: {},
  };
</script>

<style lang="scss" scoped></style>
