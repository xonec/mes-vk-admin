<template>
  <el-select v-model="selectedIds" multiple filterable allow-create default-first-option v-loading="loading" placeholder="请选择或输入标签" style="width: 100%" @change="onChange">
    <el-option v-for="item in tagList" :key="item._id" :label="item.name" :value="item._id">
      <span>{{ item.name }}</span>
      <i class="el-icon-close tag-delete-icon" @click.stop="deleteTag(item)"></i>
    </el-option>
  </el-select>
</template>

<script>
  let vk = uni.vk;

  export default {
    props: {
      value: {
        type: Array,
        default: function () {
          return [];
        },
      },
    },
    data() {
      return {
        loading: false,
        tagList: [],
        selectedIds: [],
        lastIds: [],
      };
    },
    mounted() {
      this.getTagList();
    },
    methods: {
      getTagList() {
        this.loading = true;
        vk.callFunction({
          url: 'admin/system/sys.tag.getList',
          data: {
            pageIndex: 1,
            pageSize: 500,
          },
          success: (data) => {
            this.tagList = data.rows || [];
            this.syncFromValue(this.value);
          },
          complete: () => {
            this.loading = false;
          },
        });
      },
      syncFromValue(val) {
        let ids = vk.pubfn.copyObject(val || []);
        this.selectedIds = ids;
        this.lastIds = ids;
      },
      onChange(newVal) {
        if (this.loading) return;
        let tagIdSet = new Set(this.tagList.map((item) => item._id));
        // 找出新增的非 _id 值（用户手动输入的新标签名）
        let textItem = newVal.find((item) => !tagIdSet.has(item));
        if (!textItem) {
          // 全部是已有标签的 _id（选择或删除操作），直接同步
          this.lastIds = vk.pubfn.copyObject(newVal);
          this.$emit('input', newVal);
          return;
        }
        let tagName = textItem.trim();
        if (!tagName) {
          // 空文本，移除
          let filtered = newVal.filter((item) => item !== textItem);
          this.selectedIds = filtered;
          this.lastIds = vk.pubfn.copyObject(filtered);
          this.$emit('input', filtered);
          return;
        }
        // 检查是否已有同名标签
        let existTag = this.tagList.find((item) => item.name === tagName);
        if (existTag) {
          // 替换文本为 _id
          let idx = this.selectedIds.indexOf(textItem);
          if (idx > -1) {
            this.$set(this.selectedIds, idx, existTag._id);
          }
          this.lastIds = vk.pubfn.copyObject(this.selectedIds);
          this.$emit('input', this.selectedIds);
          return;
        }
        // 新标签，调接口创建
        // 先移除文本占位，避免显示异常
        let filtered = newVal.filter((item) => item !== textItem);
        this.selectedIds = filtered;
        vk.callFunction({
          url: 'admin/system/sys.tag.save',
          title: '创建标签中...',
          loading: { that: this, name: 'loading' },
          data: { name: tagName },
          success: (data) => {
            this.tagList.push({ _id: data._id, name: tagName });
            // 先清空再设置，强制 el-select 重新渲染，避免显示文本而非 name
            let newIds = this.selectedIds.concat([data._id]);
            this.selectedIds = [];
            this.$nextTick(() => {
              this.selectedIds = newIds;
              this.lastIds = vk.pubfn.copyObject(newIds);
              this.$emit('input', newIds);
            });
          },
          complete: () => {
            this.loading = false;
          },
        });
      },
      deleteTag(item) {
        this.$confirm('此操作会同步删除其他用户该标签，是否继续？如只删除该用户此标签，只需要不选中标签即可', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
          .then(() => {
            vk.callFunction({
              url: 'admin/system/sys.tag.delete',
              title: '删除中...',
              data: { _id: item._id },
              success: () => {
                // 从标签列表中移除
                let idx = this.tagList.indexOf(item);
                if (idx > -1) {
                  this.tagList.splice(idx, 1);
                }
                // 从已选中移除
                let selIdx = this.selectedIds.indexOf(item._id);
                if (selIdx > -1) {
                  this.selectedIds.splice(selIdx, 1);
                  this.lastIds = vk.pubfn.copyObject(this.selectedIds);
                  this.$emit('input', this.selectedIds);
                }
                this.$message.success('删除成功');
              },
            });
          })
          .catch(() => {});
      },
    },
    watch: {
      value(val) {
        // 避免循环：只有外部值与内部不同时才同步
        let newValStr = JSON.stringify(val || []);
        let lastStr = JSON.stringify(this.lastIds);
        if (newValStr !== lastStr) {
          this.syncFromValue(val);
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  .el-select-dropdown__item .el-icon-close.tag-delete-icon {
    display: none;
    float: right;
    margin-top: 10px;
    color: #999999;
    font-size: 12px;
  }
  .el-select-dropdown__item:hover .el-icon-close.tag-delete-icon {
    display: inline-block;
  }
</style>
