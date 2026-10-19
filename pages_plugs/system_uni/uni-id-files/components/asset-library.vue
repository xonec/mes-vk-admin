<template>
  <div class="asset-library-page">
    <aside class="asset-sidebar" v-loading="loading.nav">
      <div class="sidebar-header">
        <div>
          <div class="sidebar-title">{{ sidebarTitle }}</div>
          <div class="sidebar-subtitle">{{ sidebarSubtitle }}</div>
        </div>
        <el-button v-if="showCategoryActions" type="primary" plain size="small" icon="el-icon-plus" @click.stop="openAddCategory()">{{ $t('vk.assetLibrary.addGroup') }}</el-button>
      </div>

      <div class="sidebar-scroll">
        <el-tree
          ref="categoryTree"
          class="category-tree"
          :data="sidebarTreeData"
          node-key="_id"
          :props="treeProps"
          :expand-on-click-node="false"
          :highlight-current="true"
          :indent="8"
          :current-node-key="queryForm1.formData.category_id"
          :default-expanded-keys="defaultExpandedKeys"
          @node-click="handleTreeNodeClick"
        >
          <template v-slot:default="{ node, data }">
            <div class="tree-node">
              <div class="tree-node-main">
                <vk-data-icon :name="node.expanded ? 'el-icon-folder-opened' : 'el-icon-folder'" :size="13" class="tree-node-folder-icon"></vk-data-icon>
                <span class="tree-node-label text-one">{{ data.name }}</span>
              </div>
              <div v-if="showCategoryActions && !data.isFixed" class="tree-node-actions">
                <div class="nav-action-btn" @click.stop="openAddCategory(data._id)">
                  <vk-data-icon name="el-icon-plus" :size="12" color="var(--al-text-caption)"></vk-data-icon>
                </div>
                <div class="nav-action-btn" @click.stop="openUpdateCategory(data)">
                  <vk-data-icon name="el-icon-edit" :size="12" color="var(--al-text-caption)"></vk-data-icon>
                </div>
                <el-popconfirm :title="$t('vk.assetLibrary.deleteGroupTips')" @confirm="deleteCategory(data._id)">
                  <div slot="reference" class="nav-action-btn" @click.stop="stop">
                    <vk-data-icon name="el-icon-delete" :size="12" color="var(--al-text-caption)"></vk-data-icon>
                  </div>
                </el-popconfirm>
              </div>
              <span class="tree-node-count">{{ data.total_count || 0 }}</span>
            </div>
          </template>
        </el-tree>
      </div>
    </aside>

    <section class="asset-main" v-loading="loading.main">
      <div class="asset-main-header">
        <div v-if="isPageMode" class="title-row">
          <div>
            <div class="page-title">{{ pageTitle }}</div>
            <div class="page-subtitle">{{ pageSubtitle }}</div>
          </div>
          <div class="header-actions">
            <el-dropdown
              v-if="allowUpload"
              split-button
              type="primary"
              size="small"
              trigger="hover"
              placement="bottom-start"
              :show-timeout="0"
              @click="uploadFile"
              @command="uploadCommand"
            >
              <vk-data-icon name="el-icon-upload2" :size="12"></vk-data-icon>
              <span class="upload-btn-text">{{ $t('vk.assetLibrary.uploadAssets') }}</span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="local-file">{{ $t('vk.assetLibrary.uploadLocalFile') }}</el-dropdown-item>
                <el-dropdown-item command="remote-file" divided>{{ $t('vk.assetLibrary.uploadRemoteFile') }}</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
            <el-button type="success" plain size="small" icon="el-icon-video-play" @click="startSlideshow" :disabled="playableFiles.length === 0">{{
              $t('vk.assetLibrary.slideshow')
            }}</el-button>
          </div>
        </div>

        <div v-if="showTypeTabs" class="type-tab-row">
          <div
            v-for="item in typeTabs"
            :key="item.value || 'all'"
            class="type-tab"
            :class="queryForm1.formData.type === item.value ? 'active-tab' : ''"
            @click.stop="changeType(item.value)"
          >
            {{ item.label }}
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-box search-filter-box">
            <el-select v-model="searchField" size="small" class="search-field-select" @change="changeSearchField">
              <el-option v-for="item in searchFieldOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
            </el-select>
            <el-input
              v-if="searchField === 'display_name'"
              v-model="queryForm1.formData.display_name"
              clearable
              size="small"
              :placeholder="$t('vk.assetLibrary.searchFileName')"
              @keyup.enter.native="getList()"
              @clear="getList()"
            >
              <i slot="suffix" class="el-input__icon el-icon-search" @click.stop="getList()"></i>
            </el-input>
            <el-input
              v-else
              v-model="queryForm1.formData.url"
              clearable
              size="small"
              :placeholder="$t('vk.assetLibrary.searchUrl')"
              @keyup.enter.native="getList()"
              @clear="getList()"
            >
              <i slot="suffix" class="el-input__icon el-icon-search" @click.stop="getList()"></i>
            </el-input>
          </div>

          <div v-if="showDateFilter" class="filter-box date-filter-box">
            <div class="filter-prefix">{{ $t('vk.assetLibrary.time') }}</div>
            <el-date-picker
              v-model="queryForm1.formData._add_time"
              type="daterange"
              size="small"
              :picker-options="datePickerOptions"
              value-format="timestamp"
              :start-placeholder="$t('vk.assetLibrary.dateStart')"
              :end-placeholder="$t('vk.assetLibrary.dateEnd')"
              @change="normalizeAddTime"
            ></el-date-picker>
          </div>

          <el-button type="primary" size="small" icon="el-icon-search" @click="getList()">{{ $t('vk.table.search') }}</el-button>
          <el-button size="small" plain icon="el-icon-refresh-left" @click="resetFilters">{{ $t('vk.table.reset') }}</el-button>

          <div v-if="isSelectorMode" class="filter-row-spacer"></div>

          <div v-if="isSelectorMode" class="filter-row-actions">
            <el-dropdown
              v-if="allowUpload"
              split-button
              type="primary"
              size="small"
              trigger="hover"
              placement="bottom-start"
              :show-timeout="0"
              @click="uploadFile"
              @command="uploadCommand"
            >
              <vk-data-icon name="el-icon-upload2" :size="12"></vk-data-icon>
              <span class="upload-btn-text">{{ $t('vk.assetLibrary.uploadAssets') }}</span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="local-file">{{ $t('vk.assetLibrary.uploadLocalFile') }}</el-dropdown-item>
                <el-dropdown-item command="remote-file" divided>{{ $t('vk.assetLibrary.uploadRemoteFile') }}</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>
      </div>

      <div v-if="isPageMode" class="selection-bar">
        <label class="selection-info" @click.stop="selectAll">
          <span class="selection-checkbox" :class="isAllSelected ? 'checked' : ''">
            <vk-data-icon v-if="selectedIds.length" name="el-icon-check" :size="12" color="#ffffff"></vk-data-icon>
          </span>
          <span>{{ $t('vk.assetLibrary.selectedCount', { count: selectedIds.length }) }}</span>
        </label>

        <el-popconfirm :title="$t('vk.assetLibrary.batchDeleteTips')" :disabled="!selectedIds.length" @confirm="deleteFile(selectedIds)">
          <el-button slot="reference" type="danger" plain size="small" :disabled="!selectedIds.length">{{ $t('vk.assetLibrary.batchDelete') }}</el-button>
        </el-popconfirm>
        <el-button size="small" :disabled="!selectedIds.length" @click="openBatchCategory">{{ $t('vk.assetLibrary.moveToGroup') }}</el-button>

        <div class="selection-spacer"></div>

        <div class="view-switcher">
          <div class="view-switch-btn" :class="viewMode === 'grid' ? 'active-view' : ''" @click.stop="changeViewMode('grid')">
            <vk-data-icon name="el-icon-s-grid" :size="14" :color="viewMode === 'grid' ? 'var(--al-accent)' : 'var(--al-text-caption)'"></vk-data-icon>
          </div>
          <div class="view-switch-btn" :class="viewMode === 'list' ? 'active-view' : ''" @click.stop="changeViewMode('list')">
            <vk-data-icon name="el-icon-s-unfold" :size="14" :color="viewMode === 'list' ? 'var(--al-accent)' : 'var(--al-text-caption)'"></vk-data-icon>
          </div>
        </div>

        <el-select v-model="sortValue" size="small" class="sort-select" @change="changeSort">
          <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
        </el-select>
      </div>

      <div class="asset-content">
        <div v-if="data.content.rows.length" class="file-grid" :class="viewMode === 'list' ? 'list-mode' : ''">
          <div
            v-for="item in data.content.rows"
            :key="item._id"
            class="file-card"
            :class="selectedIds.includes(item._id) ? 'selected-card' : ''"
            @click.stop="handleFileClick(item)"
          >
            <div class="card-checker" :class="selectedIds.includes(item._id) ? 'checked' : ''">
              <vk-data-icon v-if="selectedIds.includes(item._id)" name="el-icon-check" :size="12" color="#ffffff"></vk-data-icon>
            </div>
            <div v-if="isSelectorMode && selectedOrderMap[item._id]" class="card-selection-order">{{ selectedOrderMap[item._id] }}</div>

            <div class="card-preview" :class="viewMode === 'list' ? 'list-preview' : ''">
              <template v-if="viewMode === 'list'">
                <div class="list-thumb">
                  <image :src="getFileUrl(item)" mode="aspectFill" v-if="item.type === 'image'" @error="imageLoadError(item)"></image>
                  <image :src="item | coverImageFilter" mode="aspectFill" v-else-if="isVideoFile(item)"></image>
                  <div class="list-thumb-audio" v-else-if="isAudioFile(item)">
                    <vk-data-icon name="el-icon-headset" :size="20" color="#916cff"></vk-data-icon>
                  </div>
                  <div class="list-thumb-badge" :class="getFileBadgeClass(item)" v-else>
                    <span>{{ getFileBadgeText(item) }}</span>
                  </div>
                </div>
                <div class="list-file-info">
                  <div class="list-file-name text-one">{{ item.display_name }}</div>
                  <div class="list-file-path text-one">{{ getFilePath(item) }}</div>
                </div>
              </template>
              <template v-else>
                <image :src="getFileUrl(item)" mode="aspectFill" v-if="item.type === 'image'" @error="imageLoadError(item)"></image>

                <div class="media-card media-video" v-else-if="isVideoFile(item)">
                  <image :src="item | coverImageFilter" mode="aspectFill"></image>
                  <div class="media-mask"></div>
                  <div class="play-indicator" @click.stop="preview(item)">
                    <vk-data-icon name="el-icon-video-play" :size="24" color="#ffffff"></vk-data-icon>
                  </div>
                  <div class="media-duration" v-if="item.duration">{{ formatDuration(item.duration) }}</div>
                </div>

                <div class="media-card media-audio" v-else-if="isAudioFile(item)">
                  <div class="audio-wave">
                    <span v-for="wave in 8" :key="wave" :class="'wave-' + wave"></span>
                  </div>
                  <div class="media-duration" v-if="item.duration">{{ formatDuration(item.duration) }}</div>
                </div>

                <div class="media-card file-type-card" v-else>
                  <div class="file-badge" :class="getFileBadgeClass(item)">{{ getFileBadgeText(item) }}</div>
                </div>

                <div class="card-subtitle text-one">
                  {{ getCardSubtitle(item) }}
                </div>
              </template>
            </div>

            <div class="card-body" :class="viewMode === 'list' ? 'list-card-body' : ''">
              <template v-if="viewMode === 'list'">
                <div class="card-title-row list-card-actions">
                  <el-dropdown v-if="showCardActions" trigger="click" @command="handleCardCommand">
                    <div class="card-more" @click.stop="stop">
                      <vk-data-icon name="el-icon-more" :size="14" color="var(--al-text-caption)"></vk-data-icon>
                    </div>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{ action: 'copy', item: item }">{{ $t('vk.assetLibrary.copyLink') }}</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'preview', item: item }">{{ $t('vk.assetLibrary.previewFile') }}</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'rename', item: item }">{{ $t('vk.assetLibrary.rename') }}</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'category', item: item }">{{ $t('vk.assetLibrary.moveToGroup') }}</el-dropdown-item>
                      <el-dropdown-item divided :command="{ action: 'delete', item: item }">{{ $t('vk.table.delete') }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>
              </template>
              <template v-else>
                <div class="card-title-row">
                  <div class="card-title text-one">{{ item.display_name }}</div>
                  <el-dropdown v-if="showCardActions" trigger="click" @command="handleCardCommand">
                    <div class="card-more" @click.stop="stop">
                      <vk-data-icon name="el-icon-more" :size="14" color="var(--al-text-caption)"></vk-data-icon>
                    </div>
                    <el-dropdown-menu slot="dropdown">
                      <el-dropdown-item :command="{ action: 'copy', item: item }">{{ $t('vk.assetLibrary.copyLink') }}</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'preview', item: item }">{{ $t('vk.assetLibrary.previewFile') }}</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'rename', item: item }">{{ $t('vk.assetLibrary.rename') }}</el-dropdown-item>
                      <el-dropdown-item :command="{ action: 'category', item: item }">{{ $t('vk.assetLibrary.moveToGroup') }}</el-dropdown-item>
                      <el-dropdown-item divided :command="{ action: 'delete', item: item }">{{ $t('vk.table.delete') }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </el-dropdown>
                </div>

                <div class="card-meta-row">
                  <span>{{ formatFileSize(item.size) }}</span>
                  <span>{{ formatDate(item._add_time) }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <el-empty v-else :description="$t('vk.assetLibrary.emptyAssets')"></el-empty>
      </div>

      <div class="pagination-bar">
        <div class="pagination-total">
          <span>{{ $t('vk.assetLibrary.totalCount', { count: data.content.total || 0 }) }}</span>
          <span v-if="isSelectorMode && multiple" class="pagination-total-tip">{{ selectorLimitText }}</span>
        </div>
        <div class="pagination-actions">
          <el-pagination
            background
            :total="data.content.total"
            :current-page="queryForm1.pageIndex"
            :page-size="queryForm1.pageSize"
            :page-sizes="pageSizeOptions"
            :pager-count="5"
            :layout="paginationLayout"
            @size-change="changePageSize"
            @current-change="changePageIndex"
          ></el-pagination>
          <el-button v-if="isSelectorMode && multiple" type="primary" size="small" :disabled="!selectedIds.length" @click="confirmSelection">{{ confirmSelectionText }}</el-button>
        </div>
      </div>

      <addCategory v-model="formDatas.addCategory" @success="handleCategoryChange"></addCategory>
      <updateCategory v-model="formDatas.updateCategory" @success="handleCategoryChange"></updateCategory>
      <updateFileCategory
        v-model="formDatas.updateFileCategory"
        @success="
          getList(false);
          getNavList();
          selectedIds = [];
        "
      ></updateFileCategory>
      <updateFileName v-model="formDatas.updateFileName" @success="getList(false)"></updateFileName>
      <updateVideo v-model="formDatas.updateVideo" @success="getList(false)"></updateVideo>
      <uploadProgress v-model="formDatas.uploadProgress" @success="handleUploadSuccess"></uploadProgress>
      <uploadRemoteFile v-model="formDatas.uploadRemoteFile" @success="handleUploadSuccess"></uploadRemoteFile>
      <el-dialog :title="$t('vk.assetLibrary.selectUploadType')" :visible.sync="uploadTypeDialog.visible" width="660px" :close-on-click-modal="false" :append-to-body="true">
        <div class="upload-type-grid">
          <div class="upload-type-card" @click="selectUploadType('image')">
            <div class="upload-type-icon upload-type-icon-image">
              <vk-data-icon name="el-icon-picture-outline" :size="28" color="var(--al-accent)"></vk-data-icon>
            </div>
            <div class="upload-type-label">{{ $t('vk.assetLibrary.image') }}</div>
            <div class="upload-type-hint">jpg, png, gif, webp...</div>
          </div>
          <div class="upload-type-card" @click="selectUploadType('video')">
            <div class="upload-type-icon upload-type-icon-video">
              <vk-data-icon name="el-icon-video-camera" :size="28" color="#7c3aed"></vk-data-icon>
            </div>
            <div class="upload-type-label">{{ $t('vk.assetLibrary.video') }}</div>
            <div class="upload-type-hint">mp4, avi, mov, mkv...</div>
          </div>
          <div class="upload-type-card" @click="selectUploadType('audio')">
            <div class="upload-type-icon upload-type-icon-audio">
              <vk-data-icon name="el-icon-headset" :size="28" color="#916cff"></vk-data-icon>
            </div>
            <div class="upload-type-label">{{ $t('vk.assetLibrary.audio') }}</div>
            <div class="upload-type-hint">mp3, wav, aac, flac...</div>
          </div>
          <div class="upload-type-card" @click="selectUploadType('other')">
            <div class="upload-type-icon upload-type-icon-other">
              <vk-data-icon name="el-icon-document" :size="28" color="#6b7280"></vk-data-icon>
            </div>
            <div class="upload-type-label">{{ $t('vk.assetLibrary.other') }}</div>
            <div class="upload-type-hint">pdf, doc, zip, psd...</div>
          </div>
        </div>
      </el-dialog>

      <slideShow v-model="formDatas.slideShow"></slideShow>
    </section>
  </div>
</template>

<script>
  let vk = uni.vk;

  import addCategory from '../form/addCategory';
  import updateCategory from '../form/updateCategory';
  import updateFileCategory from '../form/updateFileCategory';
  import updateFileName from '../form/updateFileName';
  import updateVideo from '../form/updateVideo';
  import uploadProgress from '../form/uploadProgress';
  import uploadRemoteFile from '../form/uploadRemoteFile';
  import slideShow from '../form/slideShow';

  export default {
    name: 'asset-library',
    components: {
      addCategory,
      updateCategory,
      updateFileCategory,
      updateFileName,
      updateVideo,
      uploadProgress,
      uploadRemoteFile,
      slideShow,
    },
    props: {
      mode: {
        type: String,
        default: 'page',
      },
      fileType: {
        type: String,
        default: '',
      },
      multiple: {
        type: Boolean,
        default: false,
      },
      multipleLimit: {
        type: Number,
        default: 9,
      },
      currentValueCount: {
        type: Number,
        default: 0,
      },
      defaultCategory: {
        type: String,
        default: '',
      },
      upload: {
        type: Boolean,
        default: true,
      },
      updateCategory: {
        type: Boolean,
        default: true,
      },
      returnType: {
        type: String,
        default: 'url',
      },
      cloudDirectory: {
        type: String,
        default: '',
      },
      cloudPathRemoveChinese: {
        type: Boolean,
        default: true,
      },
      provider: {
        type: String,
        default: '',
      },
      uniCloud: {
        type: Object,
      },
      env: {
        type: String,
        default: '',
      },
      fileSize: {
        type: Number,
      },
      sizeUnit: {
        type: String,
        default: 'MB',
      },
      encryptAction: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selectedIds: [],
        selectedRowMap: {},
        loading: {
          nav: false,
          main: false,
        },
        data: {
          navList: [],
          summary: {
            all_count: 0,
            ungrouped_count: 0,
          },
          content: {
            rows: [],
            total: 0,
          },
        },
        typeTabs: [
          { label: this.$t('vk.assetLibrary.allTypes'), value: '' },
          { label: this.$t('vk.assetLibrary.image'), value: 'image' },
          { label: this.$t('vk.assetLibrary.video'), value: 'video' },
          { label: this.$t('vk.assetLibrary.audio'), value: 'audio' },
          { label: this.$t('vk.assetLibrary.other'), value: 'other' },
        ],
        sortOptions: [
          { label: this.$t('vk.assetLibrary.sortLatest'), value: 'latest' },
          { label: this.$t('vk.assetLibrary.sortOldest'), value: 'oldest' },
          { label: `${this.$t('vk.assetLibrary.form.name')} A-Z`, value: 'name-asc' },
          { label: `${this.$t('vk.assetLibrary.form.name')} Z-A`, value: 'name-desc' },
          { label: `${this.$t('vk.assetLibrary.sortSize')} ↑`, value: 'size-asc' },
          { label: `${this.$t('vk.assetLibrary.sortSize')} ↓`, value: 'size-desc' },
        ],
        sortValue: 'latest',
        viewMode: 'grid',
        searchField: 'display_name',
        searchFieldOptions: [
          { label: this.$t('vk.assetLibrary.fileName'), value: 'display_name' },
          { label: 'URL', value: 'url' },
        ],
        datePickerOptions: {
          disabledDate: (time) => {
            let timeInfo = vk.pubfn.getCommonTime(Date.now());
            return time.getTime() > timeInfo.todayEnd;
          },
        },
        treeProps: {
          children: 'children',
          label: 'name',
        },
        queryForm1: {
          pageIndex: 1,
          pageSize: 20,
          sortRule: [{ name: '_add_time', type: 'desc' }],
          formData: {
            display_name: '',
            url: '',
            category_id: this.defaultCategory,
            category_ids: [],
            type: this.getInitialType(),
            _add_time: [],
          },
          columns: [
            { key: 'display_name', type: 'text', mode: '%%' },
            { key: 'url', type: 'text', mode: '%%' },
            { key: 'type', type: 'text', mode: '=' },
            { key: '_add_time', type: 'datetimerange', mode: '[]' },
          ],
        },
        uploadTypeDialog: {
          visible: false,
        },
        formDatas: {},
        fileMap: {},
        failedImageIds: [],
        getTempFileURLTimer: null,
      };
    },
    computed: {
      isPageMode() {
        return this.mode === 'page';
      },
      isSelectorMode() {
        return this.mode === 'selector';
      },
      sidebarTitle() {
        return this.isPageMode ? this.$t('vk.assetLibrary.groupTitle') : this.$t('vk.assetLibrary.categoryTitle');
      },
      sidebarSubtitle() {
        return this.isPageMode ? this.$t('vk.assetLibrary.groupSubtitle') : this.$t('vk.assetLibrary.categorySubtitle');
      },
      pageTitle() {
        return this.isPageMode ? this.$t('vk.assetLibrary.pageTitle') : this.$t('vk.assetLibrary.selectTitle');
      },
      pageSubtitle() {
        return this.isPageMode ? this.$t('vk.assetLibrary.pageSubtitle') : this.$t('vk.assetLibrary.selectSubtitle');
      },
      allowUpload() {
        return this.upload;
      },
      showCategoryActions() {
        return this.updateCategory;
      },
      showCardActions() {
        return this.isPageMode;
      },
      showDateFilter() {
        return this.isPageMode;
      },
      showTypeTabs() {
        return !(this.isSelectorMode && this.fileType);
      },
      categoryTree() {
        let rows = this.data.navList || [];
        let map = {};
        let roots = [];

        rows.forEach((item) => {
          map[item._id] = Object.assign({}, item, {
            parent_id: item.parent_id || '',
            file_count: item.file_count || 0,
            total_count: item.file_count || 0,
            children: [],
          });
        });

        rows.forEach((item) => {
          let current = map[item._id];
          if (current.parent_id && map[current.parent_id]) {
            map[current.parent_id].children.push(current);
          } else {
            roots.push(current);
          }
        });

        let countChildren = (node) => {
          let total = node.file_count || 0;
          node.children.forEach((child) => {
            total += countChildren(child);
          });
          node.total_count = total;
          return total;
        };

        roots.forEach((node) => {
          countChildren(node);
        });

        return roots;
      },
      categoryMap() {
        let map = {};
        let walk = (nodes) => {
          nodes.forEach((item) => {
            map[item._id] = item;
            if (item.children && item.children.length) {
              walk(item.children);
            }
          });
        };
        walk(this.categoryTree);
        return map;
      },
      sidebarTreeData() {
        return [
          {
            _id: '',
            name: this.$t('vk.assetLibrary.allAssets'),
            total_count: this.data.summary.all_count || 0,
            isFixed: true,
            children: [
              {
                _id: 'null',
                name: this.$t('vk.assetLibrary.ungrouped'),
                total_count: this.data.summary.ungrouped_count || 0,
                isFixed: true,
                children: [],
              },
            ].concat(this.categoryTree),
          },
        ];
      },
      defaultExpandedKeys() {
        let keys = ['', 'null'];
        let walk = (nodes) => {
          nodes.forEach((item) => {
            if (item.children && item.children.length) {
              keys.push(item._id);
              walk(item.children);
            }
          });
        };
        walk(this.categoryTree);
        return keys;
      },
      categorySelectList() {
        let result = [{ _id: '', name: this.$t('vk.assetLibrary.topGroup') }];
        let walk = (nodes, depth) => {
          nodes.forEach((item) => {
            result.push({
              _id: item._id,
              name: `${new Array(depth + 1).join('　')}${depth > 0 ? '└ ' : ''}${item.name}`,
            });
            if (item.children && item.children.length) {
              walk(item.children, depth + 1);
            }
          });
        };
        walk(this.categoryTree, 0);
        return result;
      },
      fileCategorySelectList() {
        let result = [{ _id: 'null', name: this.$t('vk.assetLibrary.ungrouped') }];
        this.categorySelectList.forEach((item) => {
          if (item._id) {
            result.push(item);
          }
        });
        return result;
      },
      isAllSelected() {
        return this.data.content.rows.length > 0 && this.selectedIds.length === this.data.content.rows.length;
      },
      currentCategoryText() {
        let categoryId = this.queryForm1.formData.category_id;
        if (categoryId === 'null') {
          return this.$t('vk.assetLibrary.ungrouped');
        }
        if (!categoryId) {
          return this.$t('vk.assetLibrary.allAssets');
        }
        let current = this.categoryMap[categoryId];
        return current ? current.name : this.$t('vk.assetLibrary.allAssets');
      },
      playableFiles() {
        return this.data.content.rows.filter((item) => item.type === 'image' || item.type === 'video');
      },
      screenWidth() {
        const vk = uni.vk;
        return Number(vk.getVuex('$app.width')) || 0;
      },
      pageSizeOptions() {
        let options = this.isPageMode ? [20, 30, 40, 50, 60, 100] : [20, 30, 40, 50];
        let current = this.queryForm1.pageSize;
        if (options.indexOf(current) === -1) {
          options.push(current);
          options.sort((a, b) => a - b);
        }
        return options;
      },
      remainSelectCount() {
        let count = this.multipleLimit - this.currentValueCount;
        return count > 0 ? count : 0;
      },
      currentSelectableCount() {
        let count = this.remainSelectCount - this.selectedIds.length;
        return count > 0 ? count : 0;
      },
      selectedOrderMap() {
        let map = {};
        this.selectedIds.forEach((id, index) => {
          map[id] = index + 1;
        });
        return map;
      },
      paginationLayout() {
        return this.isSelectorMode ? 'prev, pager, next' : 'prev, pager, next, sizes, jumper';
      },
      confirmSelectionText() {
        if (this.selectedIds.length === 0) {
          return this.$t('vk.assetLibrary.pleaseSelect');
        }
        return this.$t('vk.assetLibrary.confirmSelectCount', { count: this.selectedIds.length });
      },
      selectorLimitText() {
        if (this.currentValueCount > 0 || this.selectedIds.length > 0) {
          return this.$t('vk.assetLibrary.remainSelectCount', { count: this.currentSelectableCount });
        }
        return this.$t('vk.assetLibrary.maxSelectCount', { count: this.multipleLimit });
      },
    },
    watch: {
      screenWidth() {
        if (this.isPageMode) {
          this.queryForm1.pageSize = this.getDefaultPageSize();
          this.getList(false);
        }
      },
      defaultCategory(newValue) {
        this.queryForm1.formData.category_id = newValue || '';
      },
      fileType(newValue) {
        if (this.isSelectorMode) {
          this.queryForm1.formData.type = newValue || '';
          this.getList();
        }
      },
    },
    mounted() {
      vk = this.vk;
      this.init();
    },
    beforeDestroy() {
      if (this.getTempFileURLTimer) {
        clearTimeout(this.getTempFileURLTimer);
      }
    },
    methods: {
      getInitialType() {
        if (this.mode === 'selector' && this.fileType) {
          return this.fileType;
        }
        return '';
      },
      init() {
        this.queryForm1.pageSize = this.getDefaultPageSize();
        this.queryForm1.formData.category_id = this.defaultCategory || '';
        this.queryForm1.formData.type = this.getInitialType();
        this.getNavList();
        this.getList(false);
      },
      getDefaultPageSize() {
        if (this.isSelectorMode) {
          return 20;
        }
        let width = Number(uni.vk.getVuex('$app.width')) || window.innerWidth;
        if (width >= 2560) return 60;
        if (width >= 1920) return 40;
        if (width >= 1600) return 30;
        return 20;
      },
      getList(resetPage = true) {
        if (resetPage) {
          this.queryForm1.pageIndex = 1;
        }
        this.syncCategoryIds();
        if (this.isSelectorMode && this.fileType) {
          this.queryForm1.formData.type = this.fileType;
        }
        vk.callFunction({
          url: 'admin/system_uni/uni-id-files/files/kh/getList',
          loading: { that: this, name: 'loading.main' },
          data: this.queryForm1,
          encrypt: this.encryptAction,
          success: (data) => {
            this.data.content = {
              rows: data.rows || [],
              total: data.total || 0,
            };
            if (this.isSelectorMode) {
              this.data.content.rows.forEach((item) => {
                if (this.selectedIds.indexOf(item._id) > -1) {
                  this.$set(this.selectedRowMap, item._id, item);
                }
              });
            } else {
              this.selectedIds = [];
              this.selectedRowMap = {};
            }
          },
        });
      },
      getNavList() {
        vk.callFunction({
          url: 'admin/system_uni/uni-id-files/categories/kh/getList',
          loading: { that: this, name: 'loading.nav' },
          data: {
            pageIndex: 1,
            pageSize: 1000,
          },
          encrypt: this.encryptAction,
          success: (data) => {
            this.data.navList = data.rows || [];
            this.data.summary = data.summary || { all_count: 0, ungrouped_count: 0 };
          },
        });
      },
      handleCategoryChange() {
        this.getNavList();
        this.getList(false);
      },
      syncCategoryIds() {
        let categoryId = this.queryForm1.formData.category_id;
        if (categoryId && categoryId !== 'null') {
          this.queryForm1.formData.category_ids = this.getDescendantCategoryIds(categoryId);
        } else {
          this.queryForm1.formData.category_ids = [];
        }
      },
      getDescendantCategoryIds(categoryId) {
        let ids = [];
        let walk = (node) => {
          if (!node) {
            return;
          }
          ids.push(node._id);
          if (node.children && node.children.length) {
            node.children.forEach((child) => {
              walk(child);
            });
          }
        };
        walk(this.categoryMap[categoryId]);
        return ids;
      },
      handleTreeNodeClick(data) {
        this.queryByCategory(data._id);
      },
      queryByCategory(categoryId) {
        if (this.queryForm1.formData.category_id === categoryId) {
          return;
        }
        this.queryForm1.formData.category_id = categoryId;
        this.getList();
        this.$nextTick(() => {
          if (this.$refs.categoryTree) {
            this.$refs.categoryTree.setCurrentKey(categoryId);
          }
        });
      },
      changeType(type) {
        if (this.isSelectorMode && this.fileType) {
          return;
        }
        if (this.queryForm1.formData.type === type) {
          return;
        }
        this.queryForm1.formData.type = type;
        this.getList();
      },
      changeViewMode(mode) {
        this.viewMode = mode;
      },
      changeSort(value) {
        let map = {
          latest: [{ name: '_add_time', type: 'desc' }],
          oldest: [{ name: '_add_time', type: 'asc' }],
          'name-asc': [{ name: 'display_name', type: 'asc' }],
          'name-desc': [{ name: 'display_name', type: 'desc' }],
          'size-desc': [{ name: 'size', type: 'desc' }],
          'size-asc': [{ name: 'size', type: 'asc' }],
        };
        this.queryForm1.sortRule = map[value] || map.latest;
        this.getList(false);
      },
      changeSearchField(value) {
        if (value === 'display_name') {
          this.queryForm1.formData.url = '';
        }
        if (value === 'url') {
          this.queryForm1.formData.display_name = '';
        }
        this.getList();
      },
      normalizeAddTime(value) {
        if (value && value.length === 2) {
          let timeInfo = vk.pubfn.getCommonTime(value[1]);
          this.queryForm1.formData._add_time = [value[0], timeInfo.todayEnd];
        } else {
          this.queryForm1.formData._add_time = [];
        }
        this.getList();
      },
      resetFilters() {
        this.searchField = 'display_name';
        this.sortValue = 'latest';
        this.viewMode = 'grid';
        this.queryForm1.pageIndex = 1;
        this.queryForm1.pageSize = this.getDefaultPageSize();
        this.queryForm1.sortRule = [{ name: '_add_time', type: 'desc' }];
        this.queryForm1.formData = {
          display_name: '',
          url: '',
          category_id: this.defaultCategory || '',
          category_ids: [],
          type: this.getInitialType(),
          _add_time: [],
        };
        this.getList(false);
      },
      changePageSize(pageSize) {
        this.queryForm1.pageSize = pageSize;
        this.getList(false);
      },
      changePageIndex(pageIndex) {
        this.queryForm1.pageIndex = pageIndex;
        this.getList(false);
      },
      handleFileClick(item) {
        if (this.isSelectorMode) {
          this.selectFile(item);
          return;
        }
        this.clickFile(item);
      },
      clickFile(item) {
        let index = this.selectedIds.indexOf(item._id);
        if (index > -1) {
          this.selectedIds.splice(index, 1);
        } else {
          this.selectedIds.push(item._id);
        }
      },
      selectFile(item) {
        if (!this.checkFileSize(item)) {
          return;
        }
        if (!this.multiple) {
          this.$emit('select-single', item);
          return;
        }
        let index = this.selectedIds.indexOf(item._id);
        if (index > -1) {
          this.selectedIds.splice(index, 1);
          this.$delete(this.selectedRowMap, item._id);
          return;
        }
        if (this.selectedIds.length >= this.remainSelectCount) {
          vk.toast(this.$t('vk.form.fileSelect.selectLimit'));
          return;
        }
        this.selectedIds.push(item._id);
        this.$set(this.selectedRowMap, item._id, item);
      },
      confirmSelection() {
        if (!this.isSelectorMode || !this.multiple || !this.selectedIds.length) {
          return;
        }
        let rows = this.selectedIds.map((id) => this.selectedRowMap[id]).filter((item) => item);
        this.$emit('select-multiple', rows);
      },
      selectAll() {
        if (!this.data.content.rows.length) {
          return;
        }
        if (this.isAllSelected) {
          this.selectedIds = [];
        } else {
          this.selectedIds = this.data.content.rows.map((item) => item._id);
        }
      },
      openAddCategory(parentId) {
        let defaultParentId = '';
        if (parentId) {
          defaultParentId = parentId;
        } else if (this.queryForm1.formData.category_id && this.queryForm1.formData.category_id !== 'null') {
          defaultParentId = this.queryForm1.formData.category_id;
        }
        vk.pubfn.openForm(
          'addCategory',
          {
            item: {
              parent_id: defaultParentId,
            },
            list: this.categorySelectList,
          },
          this
        );
      },
      openUpdateCategory(item) {
        vk.pubfn.openForm(
          'updateCategory',
          {
            item,
            list: this.categorySelectList,
            disabledIds: this.getDescendantCategoryIds(item._id),
          },
          this
        );
      },
      deleteCategory(_id) {
        vk.callFunction({
          url: 'admin/system_uni/uni-id-files/categories/sys/delete',
          loading: { that: this, name: 'loading.nav' },
          data: {
            _id,
          },
          encrypt: this.encryptAction,
          success: () => {
            if (this.queryForm1.formData.category_id === _id) {
              this.queryForm1.formData.category_id = '';
            }
            this.getNavList();
            this.getList(false);
          },
        });
      },
      openBatchCategory() {
        vk.pubfn.openForm(
          'updateFileCategory',
          {
            item: {
              _id: this.selectedIds,
              category_id: this.queryForm1.formData.category_id,
            },
            list: this.fileCategorySelectList,
          },
          this
        );
      },
      uploadCommand(name) {
        if (name === 'local-file') {
          this.uploadFile();
        }
        if (name === 'remote-file') {
          this.openRemoteFileUpload();
        }
      },
      uploadFile() {
        let type = this.isSelectorMode && this.fileType ? this.fileType : this.queryForm1.formData.type;
        if (!type) {
          this.uploadTypeDialog.visible = true;
          return;
        }
        this.uploadFileByType(type);
      },
      selectUploadType(type) {
        this.uploadTypeDialog.visible = false;
        this.uploadFileByType(type);
      },
      uploadFileByType(type) {
        let fileType = '';
        let extension = [];
        if (type === 'image') {
          extension = ['jpg', 'jpeg', 'gif', 'png', 'svg', 'webp', 'jfif', 'bmp', 'dpg'];
          fileType = 'image';
        } else if (type === 'video') {
          extension = ['mp4', 'mpg', 'mpeg', 'dat', 'asf', 'avi', 'rm', 'rmvb', 'mov', 'wmv', 'flv', 'mkv', 'm3u8', '3gp'];
          fileType = 'video';
        } else if (type === 'audio') {
          extension = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'ape', 'amr', 'mid', 'midi', 'opus'];
          fileType = 'audio';
        } else {
          extension = ['txt', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx', 'doc', 'docx', 'rar', 'zip', 'psd', 'url'];
          fileType = 'other';
        }
        uni.chooseFile({
          extension,
          count: 10000,
          success: (res) => {
            let tempFilePaths = [];
            let tempFiles = [];
            for (let i = 0; i < res.tempFiles.length; i++) {
              let file = res.tempFiles[i];
              if (!this.checkFileSize(file)) {
                continue;
              }
              tempFiles.push(file);
              tempFilePaths.push(res.tempFilePaths[i]);
            }
            if (!tempFiles.length) {
              return;
            }
            let item = {
              tempFilePaths,
              tempFiles,
              categoryId: this.queryForm1.formData.category_id,
              fileType,
              cloudDirectory: this.cloudDirectory,
              cloudPathRemoveChinese: this.cloudPathRemoveChinese,
              provider: this.provider,
              uniCloud: this.uniCloud,
              env: this.env,
            };
            vk.pubfn.openForm('uploadProgress', { item }, this);
          },
        });
      },
      openRemoteFileUpload() {
        vk.pubfn.openForm(
          'uploadRemoteFile',
          {
            item: {
              currentType: this.queryForm1.formData.type || this.fileType || 'other',
              currentCategory: this.queryForm1.formData.category_id,
              currentCategoryName: this.currentCategoryText,
            },
          },
          this
        );
      },
      handleUploadSuccess() {
        this.getNavList();
        this.getList(false);
      },
      deleteFile(ids) {
        if (!ids || !ids.length) {
          return;
        }
        vk.callFunction({
          url: 'admin/system_uni/uni-id-files/files/sys/delete',
          title: this.$t('vk.common.loading'),
          data: {
            _id: ids,
          },
          encrypt: this.encryptAction,
          success: (data) => {
            if (data.num > 0) {
              this.getNavList();
              this.getList(false);
              this.selectedIds = [];
            }
          },
        });
      },
      handleCardCommand(command) {
        let action = command.action;
        let item = command.item;
        if (action === 'copy') {
          this.copyFileUrl(this.getFileUrl(item));
        } else if (action === 'preview') {
          this.preview(item);
        } else if (action === 'rename') {
          if (item.type === 'video') {
            vk.pubfn.openForm('updateVideo', { item }, this);
          } else {
            vk.pubfn.openForm('updateFileName', { item }, this);
          }
        } else if (action === 'category') {
          vk.pubfn.openForm('updateFileCategory', { item, list: this.fileCategorySelectList }, this);
        } else if (action === 'delete') {
          this.deleteFile([item._id]);
        }
      },
      copyFileUrl(url) {
        uni.setClipboardData({
          data: url,
          success: () => {
            this.$message({
              message: this.$t('vk.assetLibrary.linkCopied'),
              type: 'success',
            });
          },
        });
      },
      preview(item) {
        if (item.type === 'image' || item.type === 'video') {
          this.startSlideshowFromItem(item, false);
          return;
        }
        if (item.type === 'audio') {
          window.open(this.getFileUrl(item), '_blank');
          return;
        }
        window.open(this.getFileUrl(item), '_blank');
      },
      startSlideshow() {
        let mediaFiles = this.playableFiles;
        if (!mediaFiles.length) {
          this.$message.warning(this.$t('vk.assetLibrary.noPlayableFiles'));
          return;
        }
        let startIndex = 0;
        if (this.selectedIds.length > 0) {
          let firstSelected = this.selectedIds[0];
          let selectedIndex = mediaFiles.findIndex((item) => item._id === firstSelected);
          if (selectedIndex > -1) {
            startIndex = selectedIndex;
          }
        }
        mediaFiles.forEach((item) => {
          item.tempFileURL = this.getFileUrl(item);
        });
        vk.pubfn.openForm(
          'slideShow',
          {
            fileList: mediaFiles,
            currentIndex: startIndex,
            autoPlay: true,
          },
          this
        );
      },
      startSlideshowFromItem(item, autoPlay) {
        let mediaFiles = this.playableFiles;
        if (!mediaFiles.length) {
          return;
        }
        let startIndex = mediaFiles.findIndex((file) => file._id === item._id);
        if (startIndex === -1) {
          startIndex = 0;
        }
        mediaFiles.forEach((file) => {
          file.tempFileURL = this.getFileUrl(file);
        });
        vk.pubfn.openForm(
          'slideShow',
          {
            fileList: mediaFiles,
            currentIndex: startIndex,
            autoPlay,
          },
          this
        );
      },
      getTempFileURL(ids) {
        vk.callFunction({
          url: 'admin/system_uni/uni-id-files/files/sys/getTempFileURL',
          needAlert: false,
          data: {
            ids,
          },
          encrypt: this.encryptAction,
          success: (data) => {
            let fileList = data.fileList || [];
            let fileMap = fileList.reduce((acc, item, index) => {
              acc[item.fileID] = item.tempFileURL;
              acc[ids[index]] = item.tempFileURL;
              return acc;
            }, {});
            this.fileMap = Object.assign({}, this.fileMap, fileMap);
            this.$forceUpdate();
          },
        });
      },
      getFileUrl(item) {
        if (typeof item === 'object' && item.file_id) {
          return this.fileMap[item.file_id] || this.fileMap[item.url] || item.url;
        }
        return this.fileMap[item] || item;
      },
      imageLoadError(item) {
        if (item.tempFileURL) {
          this.$set(this.fileMap, item.file_id, item.tempFileURL);
          this.$set(this.fileMap, item.url, item.tempFileURL);
          return;
        }
        if (!this.failedImageIds.includes(item.file_id)) {
          this.failedImageIds.push(item.file_id);
        }
        if (!this.failedImageIds.includes(item.url)) {
          this.failedImageIds.push(item.url);
        }
        this.debouncedGetTempFileURL();
      },
      debouncedGetTempFileURL() {
        if (this.getTempFileURLTimer) {
          clearTimeout(this.getTempFileURLTimer);
        }
        this.getTempFileURLTimer = setTimeout(() => {
          if (this.failedImageIds.length > 0) {
            this.getTempFileURL([].concat(this.failedImageIds));
            this.failedImageIds = [];
          }
        }, 50);
      },
      getFilePath(item) {
        let text = '';
        if (typeof item === 'object') {
          text = item.url || this.getFileUrl(item);
        } else {
          text = item || '';
        }
        if (!text) {
          return '--';
        }
        if (/^(https?:)?\/\//i.test(text)) {
          text = text.replace(/^(https?:)?\/\/[^/]+/i, '');
          return text || '/';
        }
        return text;
      },
      isVideoFile(item) {
        return item.type === 'video';
      },
      isAudioFile(item) {
        return item.type === 'audio';
      },
      getTypeText(item) {
        if (item.type === 'image') {
          return this.$t('vk.assetLibrary.image');
        }
        if (item.type === 'video') {
          return this.$t('vk.assetLibrary.video');
        }
        if (item.type === 'audio') {
          return this.$t('vk.assetLibrary.audio');
        }
        return this.$t('vk.assetLibrary.file');
      },
      getFileSuffix(name) {
        let text = name || '';
        let arr = text.split('.');
        return (arr[arr.length - 1] || 'file').toUpperCase();
      },
      getFileBadgeText(item) {
        let suffix = this.getFileSuffix(item.original_name || item.display_name);
        return suffix.length > 4 ? suffix.slice(0, 4) : suffix;
      },
      getFileBadgeClass(item) {
        let suffix = this.getFileSuffix(item.original_name || item.display_name).toLowerCase();
        if (['pdf'].includes(suffix)) {
          return 'badge-pdf';
        }
        if (['xls', 'xlsx', 'csv'].includes(suffix)) {
          return 'badge-excel';
        }
        if (['doc', 'docx'].includes(suffix)) {
          return 'badge-word';
        }
        if (['zip', 'rar', '7z'].includes(suffix)) {
          return 'badge-zip';
        }
        if (['psd'].includes(suffix)) {
          return 'badge-psd';
        }
        if (['url', 'link'].includes(suffix)) {
          return 'badge-link';
        }
        return 'badge-file';
      },
      formatDate(value) {
        if (!value) {
          return '--';
        }
        return vk.pubfn.timeFormat(value, 'yyyy-MM-dd');
      },
      formatDuration(value) {
        let seconds = parseInt(value || 0);
        let hour = Math.floor(seconds / 3600);
        let minute = Math.floor((seconds % 3600) / 60);
        let second = Math.floor(seconds % 60);
        let minuteText = minute < 10 ? '0' + minute : '' + minute;
        let secondText = second < 10 ? '0' + second : '' + second;
        if (hour > 0) {
          let hourText = hour < 10 ? '0' + hour : '' + hour;
          return `${hourText}:${minuteText}:${secondText}`;
        }
        return `${minuteText}:${secondText}`;
      },
      formatFileSize(size) {
        let value = Number(size || 0);
        if (!value) {
          return '0 B';
        }
        let units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let index = 0;
        while (value >= 1024 && index < units.length - 1) {
          value = value / 1024;
          index++;
        }
        return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
      },
      getCardSubtitle(item) {
        let suffix = this.getFileSuffix(item.original_name || item.display_name || item.url || '').toLowerCase();
        return suffix === 'file' ? this.getTypeText(item) : suffix;
      },
      checkFileSize(file) {
        if (this.fileSize && file.size) {
          let fileSizeCalc = 0;
          let unit = (this.sizeUnit || 'MB').toLowerCase();
          if (unit === 'kb') {
            fileSizeCalc = this.fileSize * 1024;
          } else if (unit === 'mb') {
            fileSizeCalc = this.fileSize * 1024 * 1024;
          } else if (unit === 'gb') {
            fileSizeCalc = this.fileSize * 1024 * 1024 * 1024;
          } else if (unit === 'tb') {
            fileSizeCalc = this.fileSize * 1024 * 1024 * 1024 * 1024;
          }
          if (file.size > fileSizeCalc) {
            let name = file.name || file.display_name || file.original_name || this.$t('vk.assetLibrary.file');
            vk.toast(this.$t('vk.form.fileSelect.fileSizeLimit', { name, fileSize: this.fileSize, sizeUnit: this.sizeUnit }), 'none');
            return false;
          }
        }
        return true;
      },
      stop() {},
    },
    filters: {
      coverImageFilter(item) {
        let src = '';
        let cover_image = item.cover_image;
        let url = item.url;
        let width = item.width || 0;
        let height = item.height || 0;
        if (cover_image) {
          src = cover_image;
        } else {
          let aliyun = `x-oss-process=video/snapshot,t_1000,f_jpg,w_${width},h_${height},m_fast`;
          let qiniu = `vframe/jpg/offset/1/w/${width}/h/${height}`;
          src = url;
          src += src.indexOf('?') === -1 ? '?' : '&';
          src += `${aliyun}&${qiniu}`;
        }
        return src;
      },
    },
  };
</script>

<style lang="scss" scoped>
  .asset-library-page {
    --border-radius: 6px;

    /* ===== 背景色 ===== */
    --al-bg-card: #ffffff;
    --al-bg-muted: #f6f8fc;

    /* ===== 文字色 ===== */
    --al-text-primary: #1f2430;
    --al-text-gray: #556070;
    --al-text-caption: #8b93a5;

    /* ===== 边框色 ===== */
    --al-border: #e9edf5;

    /* ===== 主题色 ===== */
    --al-accent: #295dff;
    --al-accent-hover: #c8d8ff;

    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 288px minmax(0, 1fr);
    gap: 10px;
    background-color: #f5f5f5;
    box-sizing: border-box;
  }

  .asset-sidebar,
  .asset-main {
    background-color: var(--al-bg-card);
    border-radius: var(--border-radius);
    box-shadow: 0 8px 24px rgba(16, 24, 40, 0.06);
    border: 1px solid var(--al-border);
    min-height: 0;
  }

  .asset-sidebar {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--al-border);
  }

  .sidebar-title,
  .page-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--al-text-primary);
    line-height: 1;
  }

  .sidebar-subtitle,
  .page-subtitle {
    margin-top: 6px;
    font-size: 11px;
    color: var(--al-text-caption);
  }

  .sidebar-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 10px 8px 14px;
    user-select: none;
  }

  .category-tree {
    background-color: transparent;
  }

  .tree-node {
    width: 100%;
    min-width: 0;
    height: 36px;
    position: relative;
    display: flex;
    align-items: center;
    border-radius: var(--border-radius);
    gap: 8px;
    padding-right: 6px;
    box-sizing: border-box;
  }

  .tree-node-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tree-node-folder-icon {
    flex-shrink: 0;
    color: var(--al-text-caption);
  }

  .tree-node-label {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    color: var(--al-text-primary);
  }

  .tree-node-count {
    width: 42px;
    flex-shrink: 0;
    font-size: 12px;
    color: var(--al-text-caption);
    text-align: right;
  }

  .tree-node-actions {
    display: flex;
    align-items: center;
    position: absolute;
    right: 46px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    background-color: transparent;
    z-index: 1;
  }

  .sidebar-scroll::-webkit-scrollbar,
  .asset-content::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .sidebar-scroll::-webkit-scrollbar-thumb,
  .asset-content::-webkit-scrollbar-thumb {
    background-color: var(--al-border);
    border-radius: 999px;
  }

  .nav-action-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    cursor: pointer;
  }

  .nav-action-btn:hover {
    background-color: var(--al-bg-muted);
  }

  .asset-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .asset-main-header {
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--al-border);
  }

  .title-row,
  .filter-row,
  .selection-bar {
    display: flex;
    align-items: center;
  }

  .title-row {
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;

    ::v-deep {
      .el-dropdown,
      .el-dropdown .el-button-group {
        display: flex;
        align-items: center;
      }
    }
  }

  .upload-btn-text {
    margin-left: 6px;
    font-weight: 600;
  }

  .type-tab-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }

  .type-tab {
    min-width: 68px;
    height: 32px;
    padding: 0 14px;
    border-radius: var(--border-radius);
    border: 1px solid var(--al-border);
    font-size: 13px;
    color: var(--al-text-gray);
    background-color: var(--al-bg-card);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .active-tab {
    border-color: var(--al-accent-hover);
    background-color: var(--al-bg-muted);
    color: var(--al-accent);
    font-weight: 600;
  }

  .filter-row {
    gap: 10px;
    flex-wrap: wrap;
    ::v-deep {
      .el-button + .el-button,
      .el-checkbox.is-bordered + .el-checkbox.is-bordered {
        margin-left: 0;
      }
    }
  }

  .filter-row-spacer {
    flex: 1 1 auto;
    min-width: 0;
  }

  .filter-row-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-left: auto;

    ::v-deep {
      .el-dropdown,
      .el-dropdown .el-button-group {
        display: flex;
        align-items: center;
      }
    }
  }

  .filter-box {
    width: 292px;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    border: 1px solid var(--al-border);
    border-radius: var(--border-radius);
    overflow: hidden;
    background-color: var(--al-bg-card);
    height: 32px;

    ::v-deep {
      .el-input__inner {
        border: none;
        height: 30px;
        line-height: 30px;
        font-size: 12px;
        color: var(--al-text-primary);
        padding-right: 34px;
      }
    }
  }

  .search-filter-box {
    width: 360px;
  }

  .date-filter-box {
    width: 350px;

    ::v-deep {
      .el-date-editor {
        width: 100%;
        border: none;
      }
    }
  }

  .filter-prefix {
    width: 66px;
    height: 30px;
    border-right: 1px solid var(--al-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--al-text-gray);
    background-color: var(--al-bg-card);
    flex-shrink: 0;
  }

  .search-field-select {
    width: 96px;
    flex-shrink: 0;
    border-right: 1px solid var(--al-border);
  }

  .selection-bar {
    padding: 12px 20px;
    border-bottom: 1px solid var(--al-border);
    gap: 8px;
    flex-wrap: wrap;
  }

  .selection-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: 8px;
    padding: 0 12px;
    height: 32px;
    border: 1px solid var(--al-border);
    border-radius: var(--border-radius);
    background-color: var(--al-bg-card);
    color: var(--al-text-gray);
    cursor: pointer;
    user-select: none;
    font-size: 14px;
  }

  .selection-checkbox,
  .card-checker {
    width: 18px;
    height: 18px;
    border: 1px solid var(--al-border);
    border-radius: var(--border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--al-bg-card);
  }

  .selection-checkbox.checked,
  .card-checker.checked {
    background-color: var(--al-accent);
    border-color: var(--al-accent);
  }

  .selection-spacer {
    flex: 1;
  }

  .view-switcher {
    display: flex;
    align-items: center;
    background-color: var(--al-bg-muted);
    border: 1px solid var(--al-border);
    border-radius: var(--border-radius);
    padding: 2px;
  }

  .view-switch-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    cursor: pointer;
  }

  .active-view {
    background-color: var(--al-bg-card);
    box-shadow: 0 2px 8px rgba(16, 24, 40, 0.06);
  }

  .sort-select {
    width: 170px;
  }

  .asset-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px 12px;
    min-height: 0;
  }

  .file-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(174px, 1fr));
  }

  .file-grid.list-mode {
    grid-template-columns: 1fr;
  }

  .file-grid.list-mode .file-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 64px;
    align-items: stretch;
    min-height: 78px;
  }

  .file-grid.list-mode .card-preview {
    height: 100%;
    min-height: 78px;
  }

  .file-grid.list-mode .card-body {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 78px;
    padding: 0 12px 0 10px;
    border-left: 1px solid var(--al-border);
  }

  .file-grid.list-mode .card-checker {
    top: 50%;
    left: 14px;
    transform: translateY(-50%);
  }

  .file-grid.list-mode .card-selection-order {
    top: 50%;
    left: 42px;
    transform: translateY(-50%);
  }

  .file-grid.list-mode .list-preview {
    display: flex;
    align-items: center;
    padding: 0 16px 0 48px;
    background-color: var(--al-bg-card);
  }

  .file-grid.list-mode .list-card-body {
    padding-right: 12px;
  }

  .file-grid.list-mode .list-card-actions {
    width: 100%;
    min-height: auto;
    padding-right: 0;
    justify-content: flex-end;
  }

  .file-grid.list-mode .card-more {
    position: static;
  }

  .list-thumb {
    width: 52px;
    height: 52px;
    border-radius: var(--border-radius);
    overflow: hidden;
    flex-shrink: 0;
    margin-right: 14px;
    background-color: var(--al-bg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .list-thumb image {
    width: 100%;
    height: 100%;
  }

  .list-thumb-audio {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0ebff;
  }

  .list-thumb-badge {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    color: var(--al-bg-card);
    font-size: 12px;
    font-weight: 700;
  }

  .list-file-info {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .list-file-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--al-text-primary);
  }

  .list-file-path {
    font-size: 12px;
    color: var(--al-text-caption);
  }

  .file-card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 238px;
    height: 100%;
    border: 1px solid var(--al-border);
    border-radius: var(--border-radius);
    background-color: var(--al-bg-card);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .file-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(16, 24, 40, 0.06);
  }

  .selected-card {
    border-color: var(--al-accent-hover);
    box-shadow: 0 0 0 1px rgba(41, 93, 255, 0.14);
  }

  .card-checker {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
    box-shadow: 0 2px 8px rgba(16, 24, 40, 0.06);
  }

  .card-selection-order {
    position: absolute;
    top: 8px;
    left: 36px;
    z-index: 3;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: 11px;
    border: 1px solid var(--al-bg-card);
    background-color: var(--al-accent);
    color: var(--al-bg-card);
    font-size: 12px;
    font-weight: 700;
    line-height: 20px;
    text-align: center;
    box-sizing: border-box;
    box-shadow: 0 6px 16px rgba(16, 24, 40, 0.06);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
  }

  .card-preview {
    position: relative;
    height: 188px;
    background-color: var(--al-bg-muted);
    overflow: hidden;
  }

  .card-preview image {
    width: 100%;
    height: 100%;
  }

  .media-card {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background-color: #f2f5fb;
  }

  .media-video image {
    width: 100%;
    height: 100%;
  }

  .media-mask {
    position: absolute;
    inset: 0;
    background-color: rgba(17, 24, 39, 0.4);
  }

  .play-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background-color: rgba(17, 24, 39, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .media-duration {
    position: absolute;
    right: 10px;
    bottom: 10px;
    padding: 3px 8px;
    background-color: rgba(17, 24, 39, 0.68);
    border-radius: 999px;
    font-size: 11px;
    color: var(--al-bg-card);
  }

  .audio-wave {
    width: 88px;
    height: 50px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }

  .audio-wave span {
    width: 6px;
    border-radius: 999px;
    background-color: #916cff;
  }

  .audio-wave .wave-1,
  .audio-wave .wave-8 {
    height: 16px;
  }

  .audio-wave .wave-2,
  .audio-wave .wave-7 {
    height: 26px;
  }

  .audio-wave .wave-3,
  .audio-wave .wave-6 {
    height: 36px;
  }

  .audio-wave .wave-4,
  .audio-wave .wave-5 {
    height: 46px;
  }

  .file-badge {
    min-width: 64px;
    height: 74px;
    border-radius: calc(var(--border-radius) * 2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--al-bg-card);
    font-size: 18px;
    font-weight: 700;
    padding: 0 12px;
    box-sizing: border-box;
  }

  .badge-pdf {
    background-color: #f06050;
  }

  .badge-excel {
    background-color: #39b05c;
  }

  .badge-word {
    background-color: #5a8bf0;
  }

  .badge-zip {
    background-color: #f8a040;
  }

  .badge-psd {
    background-color: #1e3d80;
  }

  .badge-link {
    background-color: #5290ff;
  }

  .badge-file {
    background-color: #8c98b5;
  }

  .card-body {
    position: relative;
    flex: 1;
    height: 88px;
    padding: 12px 8px;
    box-sizing: border-box;
  }

  .card-title-row,
  .card-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-title-row {
    gap: 8px;
    min-height: 24px;
  }

  .card-title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--al-text-primary);
  }

  .card-more {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    background-color: var(--al-bg-muted);
    border: 1px solid var(--al-border);
  }

  .card-meta-row {
    margin-top: 8px;
    font-size: 11px;
    color: var(--al-text-caption);
    gap: 8px;
  }

  .card-meta-row span {
    white-space: nowrap;
  }

  .card-subtitle {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 3;
    max-width: calc(100% - 48px);
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 10px;
    color: var(--al-bg-card);
    background-color: rgba(17, 24, 39, 0.58);
    text-align: right;
    pointer-events: none;
  }

  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 18px;
    border-top: 1px solid var(--al-border);
    gap: 12px;
  }

  .pagination-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pagination-total {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--al-text-gray);
  }

  .pagination-total-tip {
    color: var(--al-accent);
    font-weight: 600;
  }

  .text-one {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  ::v-deep {
    .category-tree .el-tree-node {
      position: relative;
    }

    .category-tree .el-tree-node__content {
      height: 36px;
      border-radius: var(--border-radius);
      padding-right: 0;
      margin-bottom: 2px;
    }

    .category-tree .el-tree-node__expand-icon {
      color: var(--al-text-caption);
      font-size: 12px;
      padding: 4px;
      border-radius: var(--border-radius);
    }

    .category-tree .el-tree-node__expand-icon.is-leaf {
      color: transparent;
    }

    .category-tree .el-tree-node__label {
      width: 100%;
    }

    .category-tree .el-tree-node__content:hover .tree-node-actions {
      opacity: 1;
      pointer-events: auto;
    }
    .el-empty {
      padding: 80px 0;
    }

    .el-button--small {
      height: 32px;
      border-radius: var(--border-radius);
      padding-top: 0;
      padding-bottom: 0;
    }

    .el-button--primary.is-plain,
    .el-button--default,
    .el-button--success.is-plain,
    .el-button--danger.is-plain {
      border-color: #e4e9f2;
      color: var(--al-text-gray);
      background-color: #ffffff;
    }

    .el-button--primary {
      background-color: var(--al-accent, #295dff);
      border-color: var(--al-accent, #295dff);
    }

    .el-dropdown-menu {
      border-radius: var(--border-radius);
      padding: 6px;
      border: 1px solid #e8edf4;
      box-shadow: 0 14px 30px rgba(16, 24, 40, 0.06);
    }

    .el-dropdown-menu__item {
      border-radius: var(--border-radius);
      height: 34px;
      line-height: 34px;
    }

    .el-dialog {
      border-radius: var(--border-radius);
    }

    .el-dialog__header {
      padding: 18px 24px 14px;
      border-bottom: 1px solid #edf1f7;
    }

    .el-dialog__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--al-text-primary);
    }

    .el-dialog__body {
      padding: 20px 24px 24px;
    }

    .el-dialog__headerbtn {
      top: 18px;
      right: 20px;
    }

    .el-date-editor--daterange.el-input__inner,
    .sort-select .el-input__inner {
      height: 32px;
      line-height: 32px;
      border-color: #e4e9f2;
      background-color: #ffffff;
    }

    .sort-select .el-input__inner:hover,
    .el-date-editor--daterange.el-input__inner:hover,
    .el-select .el-input__inner:hover {
      border-color: #e4e9f2;
    }

    .el-pagination.is-background .btn-next,
    .el-pagination.is-background .btn-prev,
    .el-pagination.is-background .el-pager li {
      min-width: 30px;
      height: 30px;
      line-height: 30px;
      border-radius: var(--border-radius);
      background-color: #ffffff;
      border: 1px solid #edf1f7;
      color: var(--al-text-gray);
    }

    .el-pagination.is-background .el-pager li:not(.disabled).active {
      background-color: var(--al-accent);
      border-color: var(--al-accent);
      color: #ffffff;
    }

    .el-pagination__jump {
      margin-left: 0px;
    }
    .el-pagination__sizes .el-input .el-input__inner,
    .el-pagination__jump .el-input__inner {
      border-radius: var(--border-radius);
      border-color: #e4e9f2;
      height: 30px;
    }

    .el-button--danger.is-plain {
      color: #ff5d5d;
      border-color: #ffd8d8;
      background-color: #fff8f8;
    }

    .el-select .el-input__inner,
    .el-date-editor .el-range-input,
    .el-date-editor.el-input__inner,
    .el-date-editor .el-range-separator {
      font-size: 13px;
    }

    .sort-select .el-input__inner,
    .el-date-editor--daterange {
      border-radius: var(--border-radius);
    }
  }

  .upload-type-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .upload-type-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 12px 20px;
    border-radius: var(--border-radius);
    border: 1px solid var(--al-border);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .upload-type-card:hover {
    border-color: var(--al-accent-hover);
    background-color: var(--al-bg-card);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16, 24, 40, 0.06);
  }

  .upload-type-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }

  .upload-type-icon-image,
  .upload-type-icon-video,
  .upload-type-icon-audio,
  .upload-type-icon-other {
    background-color: var(--al-bg-muted);
  }

  .upload-type-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--al-text-primary);
    margin-bottom: 6px;
  }

  .upload-type-hint {
    font-size: 11px;
    color: var(--al-text-caption);
    text-align: center;
  }

  @media screen and (min-width: 1600px) {
    .file-grid:not(.list-mode) {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }

  @media screen and (min-width: 1920px) {
    .file-grid:not(.list-mode) {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
  }

  @media screen and (max-width: 1366px) {
    .asset-library-page {
      grid-template-columns: 270px minmax(0, 1fr);
    }

    .filter-box {
      width: 260px;
    }
  }
</style>
