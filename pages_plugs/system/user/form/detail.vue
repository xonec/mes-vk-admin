<!-- 此处 :destroy-on-close="false" 必须是 false，否则关闭弹窗后复杂布局再次打开容易闪烁 -->
<template>
  <vk-data-dialog
    v-model="value.show"
    :title="page.title"
    :top="page.top"
    :width="page.width"
    :destroy-on-close="false"
    custom-class="vk-user-detail-dialog"
    mode="form"
    @open="onOpen"
    @closed="onClose"
  >
    <div v-loading="page.loading" class="user-detail-dialog-body">
      <div v-if="detailData._id" class="detail-panel">
        <div class="detail-summary-actions">
          <el-button size="small" type="primary" @click="onEditUser">编辑用户</el-button>
          <el-button size="small" type="primary" @click="onBindRole">绑定角色</el-button>
          <el-button size="small" type="warning" @click="onResetPassword">重置密码</el-button>
        </div>

        <div class="detail-summary-card">
          <div class="summary-block summary-main">
            <div class="summary-user">
              <el-avatar :size="106" class="summary-user-avatar" :src="detailData.avatar" icon="el-icon-user-solid"></el-avatar>
              <div class="summary-user-content">
                <div class="summary-user-title">
                  <span class="summary-user-name">{{ displayName }}</span>
                  <el-tag :type="statusInfo.tagType" size="mini" effect="light">{{ statusInfo.label }}</el-tag>
                </div>
                <div class="summary-line">
                  <span class="summary-label">用户名：</span>
                  <span class="summary-value">{{ detailData.username || '-' }}</span>
                  <i v-if="detailData.username" class="el-icon-document-copy copy-icon" @click="copyText(detailData.username)"></i>
                </div>
                <div class="summary-line">
                  <span class="summary-label">用户ID：</span>
                  <span class="summary-value">{{ detailData._id || '-' }}</span>
                  <i v-if="detailData._id" class="el-icon-document-copy copy-icon" @click="copyText(detailData._id)"></i>
                </div>
                <div class="summary-line">
                  <span class="summary-label">昵称：</span>
                  <span class="summary-value">{{ detailData.nickname || '-' }}</span>
                </div>
                <div class="summary-line summary-line-tags">
                  <span class="summary-label">用户角色：</span>
                  <div class="tag-list">
                    <el-tag v-for="item in roleTagList" :key="item.value" size="mini" effect="plain">{{ item.label }}</el-tag>
                    <span v-if="roleTagList.length === 0" class="summary-empty">暂无角色</span>
                  </div>
                </div>
                <div class="summary-line">
                  <span class="summary-label">备注：</span>
                  <span class="summary-value">{{ detailData.comment || '-' }}</span>
                  <i v-if="detailData.comment" class="el-icon-edit-outline copy-icon" @click="onEditComment"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="summary-block summary-meta">
            <div class="summary-info-item">
              <vk-data-icon name="vk-icon-phone" :size="16" color="#6b7687"></vk-data-icon>
              <span class="summary-info-label">手机号：</span>
              <span class="summary-info-value">{{ detailData.mobile }}</span>
              <el-tag v-if="Number(detailData.mobile_confirmed) === 1" type="success" size="mini" effect="light">已验证</el-tag>
            </div>
            <div class="summary-info-item">
              <vk-data-icon name="vk-icon-mail" :size="16" color="#6b7687"></vk-data-icon>
              <span class="summary-info-label">邮箱：</span>
              <span class="summary-info-value">{{ detailData.email || '-' }}</span>
              <el-tag v-if="Number(detailData.email_confirmed) === 1" type="success" size="mini" effect="light">已验证</el-tag>
            </div>
            <div class="summary-info-item">
              <vk-data-icon name="vk-icon-time" :size="16" color="#6b7687"></vk-data-icon>
              <span class="summary-info-label">注册时间：</span>
              <span class="summary-info-value">{{ formatTime(detailData.register_date) }}</span>
            </div>
            <div class="summary-info-item">
              <vk-data-icon name="vk-icon-timefill" :size="16" color="#6b7687"></vk-data-icon>
              <span class="summary-info-label">最后登录：</span>
              <span class="summary-info-value">{{ formatTime(detailData.last_login_date) }}</span>
            </div>
            <div class="summary-info-item">
              <vk-data-icon name="vk-icon-location" :size="16" color="#6b7687"></vk-data-icon>
              <span class="summary-info-label">注册IP：</span>
              <span class="summary-info-value">{{ detailData.register_ip || '-' }}</span>
            </div>
            <div class="summary-info-item">
              <vk-data-icon name="vk-icon-locationfill" :size="16" color="#6b7687"></vk-data-icon>
              <span class="summary-info-label">最后登录IP：</span>
              <span class="summary-info-value">{{ detailData.last_login_ip || '-' }}</span>
            </div>
          </div>

          <div class="summary-block summary-extra">
            <div class="summary-info-item summary-info-top">
              <span class="summary-info-label">所属应用：</span>
              <div class="tag-list">
                <el-tag v-for="item in appTagList" :key="item.value" size="mini" effect="plain">{{ item.label }}</el-tag>
                <span v-if="appTagList.length === 0" class="summary-empty">全部应用</span>
              </div>
            </div>
            <div class="summary-info-item">
              <span class="summary-info-label">邀请码：</span>
              <span class="summary-info-value">{{ detailData.my_invite_code || '-' }}</span>
              <i v-if="detailData.my_invite_code" class="el-icon-document-copy copy-icon" @click="copyText(detailData.my_invite_code)"></i>
            </div>
            <div class="summary-info-item">
              <span class="summary-info-label">邀请人：</span>
              <span class="summary-info-value">{{ inviterName }}</span>
            </div>
            <div class="summary-info-item">
              <span class="summary-info-label">邀请人ID：</span>
              <span class="summary-info-value">{{ inviterId }}</span>
              <i v-if="inviterId !== '-'" class="el-icon-document-copy copy-icon" @click="copyText(inviterId)"></i>
            </div>
            <div class="summary-info-item">
              <span class="summary-info-label">受邀时间：</span>
              <span class="summary-info-value">{{ formatTime(detailData.invite_time) }}</span>
            </div>
            <div class="summary-info-item">
              <span class="summary-info-label">邀请人锁定：</span>
              <el-tag :type="inviterLockInfo.tagType" size="mini" effect="light">{{ inviterLockInfo.label }}</el-tag>
            </div>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="基础信息" name="base">
            <div class="detail-grid detail-grid-main">
              <section class="detail-card detail-card-span-2 detail-card-basic">
                <div class="detail-card-title">基本信息</div>
                <div class="detail-info-grid detail-info-grid-2">
                  <div class="detail-info-item">
                    <span class="detail-info-label">用户名</span><span class="detail-info-value">{{ detailData.username || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">手机号码</span>
                    <span class="detail-info-value detail-info-value-row">
                      {{ detailData.mobile }}
                      <i v-if="detailData.mobile" class="el-icon-document-copy copy-icon" @click="copyText(detailData.mobile)"></i>
                      <el-tag v-if="detailData.mobile" :type="Number(detailData.mobile_confirmed) === 1 ? 'success' : 'info'" size="mini" effect="light">{{
                        Number(detailData.mobile_confirmed) === 1 ? '已验证' : '未验证'
                      }}</el-tag>
                    </span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">性别</span><span class="detail-info-value">{{ genderText }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">邮箱</span>
                    <span class="detail-info-value detail-info-value-row">
                      {{ detailData.email || '-' }}
                      <el-tag v-if="detailData.email" :type="Number(detailData.email_confirmed) === 1 ? 'success' : 'info'" size="mini" effect="light">{{
                        Number(detailData.email_confirmed) === 1 ? '已验证' : '未验证'
                      }}</el-tag>
                    </span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">用户状态</span
                    ><span class="detail-info-value"
                      ><el-tag :type="statusInfo.tagType" size="mini" effect="light">{{ statusInfo.label }}</el-tag></span
                    >
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">备注</span><span class="detail-info-value">{{ detailData.comment || '-' }}</span>
                  </div>
                </div>
              </section>

              <section class="detail-card detail-card-third-party" style="grid-row: span 2">
                <div class="detail-card-title">第三方账号</div>
                <div class="third-party-list">
                  <div v-for="item in thirdPartyRows" :key="item.key" class="third-party-item">
                    <i class="vk-icon third-party-icon" :class="[item.iconClass, item.className]"></i>
                    <span class="third-party-label">{{ item.label }}：</span>
                    <el-tag :type="item.tagType" size="mini" effect="light">{{ item.value }}</el-tag>
                  </div>
                  <div v-if="thirdPartyRows.length === 0" class="summary-empty">暂无第三方账号信息</div>
                </div>
              </section>

              <section class="detail-card detail-card-span-2 detail-card-register">
                <div class="detail-card-title">注册信息</div>
                <div class="detail-info-grid detail-info-grid-2">
                  <div class="detail-info-item">
                    <span class="detail-info-label">注册时间</span><span class="detail-info-value">{{ formatTime(detailData.register_date) }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">最后登录时间</span><span class="detail-info-value">{{ formatTime(detailData.last_login_date) }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">注册IP</span><span class="detail-info-value">{{ detailData.register_ip || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">最后登录IP</span><span class="detail-info-value">{{ detailData.last_login_ip || '-' }}</span>
                  </div>
                </div>
              </section>

              <div class="detail-card-pair detail-card-span-2">
                <section class="detail-card detail-card-tags">
                  <div class="detail-card-title">
                    <span>用户标签</span>
                    <i class="el-icon-edit-outline edit-icon" @click="onEditTags"></i>
                  </div>
                  <div class="tag-list tag-list-wrap">
                    <el-tag v-for="item in userTagList" :key="item" size="mini" effect="light" type="success">{{ item }}</el-tag>
                    <span v-if="userTagList.length === 0" class="summary-empty">暂无标签</span>
                  </div>
                </section>

                <section class="detail-card detail-card-social">
                  <div class="detail-card-title">社交信息</div>
                  <div class="social-content">
                    <div class="social-info-list">
                      <div class="social-info-item">
                        <vk-data-icon name="vk-icon-phone" :size="18" color="#6b7687"></vk-data-icon>
                        <span class="social-info-label">手机号</span>
                        <span class="social-info-value">{{ socialInfo.mobile || '-' }}</span>
                        <i v-if="socialInfo.mobile" class="el-icon-document-copy copy-icon" @click="copyText(socialInfo.mobile)"></i>
                      </div>
                      <div class="social-info-item">
                        <vk-data-icon name="vk-icon-weixin" :size="18" color="#6b7687"></vk-data-icon>
                        <span class="social-info-label">微信号</span>
                        <span class="social-info-value">{{ socialInfo.weixin_no || '-' }}</span>
                        <i v-if="socialInfo.weixin_no" class="el-icon-document-copy copy-icon" @click="copyText(socialInfo.weixin_no)"></i>
                      </div>
                    </div>
                    <div class="social-qrcode">
                      <el-image
                        v-if="socialInfo.weixin_qrcode"
                        class="social-qrcode-img"
                        :src="socialInfo.weixin_qrcode"
                        fit="contain"
                        :preview-src-list="[socialInfo.weixin_qrcode]"
                      ></el-image>
                      <span v-else class="summary-empty">暂无二维码</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="实名认证" name="realname">
            <div class="detail-grid">
              <section class="detail-card detail-card-span-3 detail-card-realname">
                <div class="detail-card-title">实名认证信息</div>
                <div class="detail-info-grid detail-info-grid-3">
                  <div class="detail-info-item">
                    <span class="detail-info-label">认证状态</span
                    ><span class="detail-info-value"
                      ><el-tag :type="realnameStatusInfo.tagType" size="mini" effect="light">{{ realnameStatusInfo.label }}</el-tag></span
                    >
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">认证类型</span><span class="detail-info-value">{{ realnameTypeText }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">认证时间</span><span class="detail-info-value">{{ formatTime(realnameAuth.auth_date) }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">真实姓名/企业名</span><span class="detail-info-value">{{ realnameAuth.real_name || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">证件号码</span><span class="detail-info-value">{{ realnameAuth.identity || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">联系人</span><span class="detail-info-value">{{ realnameAuth.contact_person || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">联系人手机号</span><span class="detail-info-value">{{ realnameAuth.contact_mobile || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">联系人邮箱</span><span class="detail-info-value">{{ realnameAuth.contact_email || '-' }}</span>
                  </div>
                </div>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane label="注册环境" name="registerEnv">
            <div class="detail-grid">
              <section class="detail-card detail-card-span-3">
                <div class="detail-card-title">注册环境信息</div>
                <div class="detail-info-grid detail-info-grid-3">
                  <div class="detail-info-item">
                    <span class="detail-info-label">AppId</span><span class="detail-info-value">{{ registerEnv.appid || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">平台</span><span class="detail-info-value">{{ registerEnv.uni_platform || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">系统</span><span class="detail-info-value">{{ registerEnv.os_name || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">应用名称</span><span class="detail-info-value">{{ registerEnv.app_name || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">应用版本</span><span class="detail-info-value">{{ registerEnv.app_version || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">版本号</span><span class="detail-info-value">{{ registerEnv.app_version_code || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">渠道/场景</span><span class="detail-info-value">{{ registerEnv.channel || '-' }}</span>
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">客户端IP</span><span class="detail-info-value">{{ registerEnv.client_ip || '-' }}</span>
                  </div>
                </div>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane label="角色与权限" name="rolePermission">
            <div class="detail-grid detail-grid-main">
              <section class="detail-card detail-card-span-2">
                <div class="detail-card-title">
                  <span>角色列表</span>
                  <i class="el-icon-edit-outline edit-icon" @click="onBindRole"></i>
                </div>
                <div class="tag-list tag-list-wrap">
                  <el-tag v-for="item in roleTagList" :key="item.value" size="mini" effect="light" type="primary">{{ item.label }}</el-tag>
                  <span v-if="roleTagList.length === 0" class="summary-empty">暂无角色</span>
                </div>
              </section>
              <section class="detail-card detail-card-permission">
                <div class="detail-card-title">权限状态</div>
                <div class="detail-info-grid">
                  <div class="detail-info-item">
                    <span class="detail-info-label">允许登录后台</span
                    ><span class="detail-info-value"
                      ><el-tag :type="detailData.allow_login_background ? 'success' : 'danger'" size="mini" effect="light">{{
                        detailData.allow_login_background ? '允许' : '禁止'
                      }}</el-tag></span
                    >
                  </div>
                  <div class="detail-info-item">
                    <span class="detail-info-label">可登录应用</span><span class="detail-info-value">{{ appTagList.length > 0 ? appTagList.length + ' 个' : '全部应用' }}</span>
                  </div>
                </div>
              </section>
            </div>
          </el-tab-pane>

          <el-tab-pane label="操作日志" name="logs">
            <div class="detail-grid">
              <section class="detail-card detail-card-span-3">
                <div class="detail-card-title">用户时间线</div>
                <el-timeline>
                  <el-timeline-item v-for="(item, index) in timelineList" :key="index" :timestamp="item.time" placement="top">
                    <div class="timeline-title">{{ item.title }}</div>
                    <div class="timeline-desc">{{ item.desc }}</div>
                  </el-timeline-item>
                </el-timeline>
              </section>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <template v-slot:footer="{ close }">
      <div class="dialog-footer">
        <el-button size="small" @click="close">关闭</el-button>
      </div>
    </template>
  </vk-data-dialog>
</template>

<script>
  let vk = uni.vk;
  export default {
    props: {
      value: {
        type: Object,
        default: function () {
          return {
            show: false,
            item: '',
          };
        },
      },
    },
    data() {
      return {
        page: {
          title: '用户详情',
          top: '2vh',
          width: '1280px',
          loading: false,
        },
        activeTab: 'base',
        detailData: {},
      };
    },
    methods: {
      onOpen() {
        let item = this.value.item || {};
        this.activeTab = 'base';
        this.detailData = vk.pubfn.copyObject(item);
        this.getDetailInfo();
      },
      onClose() {
        this.activeTab = 'base';
        this.detailData = {};
      },
      getDetailInfo() {
        let item = this.value.item || {};
        if (vk.pubfn.isNull(item._id)) {
          return;
        }
        vk.callFunction({
          url: 'admin/system/user/sys/getInfo',
          loading: { that: this, name: 'page.loading' },
          data: {
            _id: item._id,
          },
          success: (data) => {
            this.detailData = Object.assign({}, this.detailData, data.info || {});
          },
        });
      },
      formatTime(value) {
        if (vk.pubfn.isNull(value)) {
          return '-';
        }
        return vk.pubfn.timeFormat(value, 'yyyy-MM-dd hh:mm:ss');
      },
      copyText(text) {
        if (vk.pubfn.isNull(text)) {
          return;
        }
        vk.setClipboardData({
          data: String(text),
          success: () => {
            vk.toast('复制成功');
          },
        });
      },
      getObjectValue(obj, path, defaultValue = '-') {
        return vk.pubfn.getData(obj || {}, path, defaultValue);
      },
      onEditUser() {
        this.$emit('edit-user', vk.pubfn.copyObject(this.detailData));
      },
      onEditTags() {
        this.$emit('edit-tags', vk.pubfn.copyObject(this.detailData));
      },
      onEditComment() {
        this.$emit('edit-comment', vk.pubfn.copyObject(this.detailData));
      },
      onResetPassword() {
        this.$emit('reset-password', vk.pubfn.copyObject(this.detailData));
      },
      onBindRole() {
        this.$emit('bind-role', vk.pubfn.copyObject(this.detailData));
      },
      refresh() {
        let { value = {} } = this;
        if (value.show) {
          this.getDetailInfo();
        }
      },
    },
    computed: {
      displayName() {
        return this.detailData.nickname || this.detailData.username || '未命名用户';
      },
      statusInfo() {
        let map = {
          0: { label: '正常', tagType: 'success' },
          1: { label: '冻结', tagType: 'danger' },
          2: { label: '审核中', tagType: 'primary' },
          3: { label: '审核拒绝', tagType: 'info' },
          4: { label: '已注销', tagType: 'warning' },
        };
        // status 不存在或为null都代表正常
        let val = this.detailData.status || 0;
        return map[val] || { label: '未知', tagType: 'info' };
      },
      genderText() {
        let map = {
          0: '保密',
          1: '男',
          2: '女',
        };
        // gender 不存在或为null都代表保密
        let val = this.detailData.gender || 0;
        return map[val] || '保密';
      },
      roleTagList() {
        let roleList = this.detailData.roleList;
        if (Array.isArray(roleList) && roleList.length > 0) {
          return roleList.map((item) => {
            return {
              value: item.role_id,
              label: item.role_name,
            };
          });
        }
        let role = this.detailData.role;
        if (!Array.isArray(role)) {
          return [];
        }
        return role.map((item) => {
          return {
            value: item,
            label: item,
          };
        });
      },
      appTagList() {
        let appList = this.detailData.appList;
        if (Array.isArray(appList) && appList.length > 0) {
          return appList.map((item) => {
            return {
              value: item.appid || item.name,
              label: item.name || item.appid || '-',
            };
          });
        }
        let appidList = this.detailData.dcloud_appid;
        if (!Array.isArray(appidList)) {
          return [];
        }
        return appidList.map((item) => {
          return {
            value: item,
            label: item,
          };
        });
      },
      inviterUserInfo() {
        let inviterUserInfo = this.detailData.inviterUserInfo;
        if (Array.isArray(inviterUserInfo) && inviterUserInfo.length > 0) {
          return inviterUserInfo[0];
        }
        return {};
      },
      inviterName() {
        return this.inviterUserInfo.nickname || this.inviterUserInfo.username || '-';
      },
      inviterId() {
        return this.inviterUserInfo._id || this.getObjectValue(this.detailData, 'inviter_uid[0]', '-');
      },
      inviterLockInfo() {
        if (Number(this.detailData.inviter_lock) === 1) {
          return { label: '已锁定', tagType: 'warning' };
        }
        return { label: '未锁定', tagType: 'info' };
      },
      socialInfo() {
        return this.detailData.social_info || {};
      },
      registerEnv() {
        return this.detailData.register_env || {};
      },
      realnameAuth() {
        return this.detailData.realname_auth || {};
      },
      realnameTypeText() {
        if (Number(this.realnameAuth.type) === 1) {
          return '企业用户';
        }
        if (Number(this.realnameAuth.type) === 0) {
          return '个人用户';
        }
        return '-';
      },
      realnameStatusInfo() {
        let map = {
          0: { label: '未认证', tagType: 'info' },
          1: { label: '等待认证', tagType: 'warning' },
          2: { label: '认证通过', tagType: 'success' },
          3: { label: '认证失败', tagType: 'danger' },
        };
        return map[this.realnameAuth.auth_status] || { label: '未认证', tagType: 'info' };
      },
      thirdPartyRows() {
        let rows = [];
        let pushRow = (key, label, isBound, iconClass, className) => {
          rows.push({
            key,
            label,
            value: isBound ? '已绑定' : '未绑定',
            tagType: isBound ? 'success' : 'info',
            iconClass,
            className,
          });
        };
        let hasValue = (value) => vk.pubfn.isNotNull(value);
        let hasObjectValue = (obj) => {
          if (vk.pubfn.isNull(obj) || typeof obj !== 'object') {
            return false;
          }
          return Object.keys(obj).some((key) => {
            return vk.pubfn.isNotNull(obj[key]);
          });
        };
        let wxOpenid = this.detailData.wx_openid || {};
        let wxBound = [wxOpenid.app, wxOpenid['app-plus'], wxOpenid['mp-weixin'], wxOpenid['h5-weixin'], wxOpenid['web-weixin'], wxOpenid.h5, wxOpenid.web].some((item) =>
          hasValue(item)
        );
        pushRow('wechat', '微信', wxBound, 'vk-icon-weixin', 'platform-wechat');
        pushRow('alipay', '支付宝', hasValue(this.detailData.ali_openid), 'vk-icon-zhifubaozhifu', 'platform-alipay');
        pushRow('douyin', '抖音', hasObjectValue(this.detailData.douyin_openid), 'vk-icon-douyin', 'platform-douyin');
        pushRow('huawei', '华为', hasObjectValue(this.detailData.huawei_openid), 'vk-icon-huawei', 'platform-huawei');
        pushRow('apple', '苹果', hasValue(this.detailData.apple_openid), 'vk-icon-apple', 'platform-apple');
        let qqOpenid = this.detailData.qq_openid;
        let qqBound = typeof qqOpenid === 'object' ? hasObjectValue(qqOpenid) : hasValue(qqOpenid);
        pushRow('qq', 'QQ', qqBound, 'vk-icon-QQ', 'platform-qq');
        return rows;
      },
      userTagList() {
        let list = this.detailData.tagList;
        if (!Array.isArray(list)) {
          return [];
        }
        return list.map((item) => {
          return item.name;
        });
      },
      timelineList() {
        let list = [];
        list.push({
          title: '用户注册',
          time: this.formatTime(this.detailData.register_date),
          desc: '注册IP：' + (this.detailData.register_ip || '-'),
        });
        if (vk.pubfn.isNotNull(this.detailData.last_login_date)) {
          list.push({
            title: '最后登录',
            time: this.formatTime(this.detailData.last_login_date),
            desc: '登录IP：' + (this.detailData.last_login_ip || '-'),
          });
        }
        if (vk.pubfn.isNotNull(this.detailData.invite_time)) {
          list.push({
            title: '建立邀请关系',
            time: this.formatTime(this.detailData.invite_time),
            desc: '邀请人：' + this.inviterName,
          });
        }
        if (vk.pubfn.isNotNull(this.getObjectValue(this.detailData, 'close_account.apply_time', ''))) {
          list.push({
            title: '申请注销',
            time: this.formatTime(this.getObjectValue(this.detailData, 'close_account.apply_time', '')),
            desc: '状态：' + this.statusInfo.label,
          });
        }
        return list;
      },
    },
  };
</script>

<style lang="scss" scoped>
  .user-detail-dialog-body {
    min-height: 480px;
  }

  ::v-deep {
    .el-tabs__nav-wrap::after {
      height: 1px;
      background-color: #ebeef5;
    }
  }

  .detail-panel {
    color: #2f3b52;
  }

  .detail-summary-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    padding: 10px 2px 10px;
    ::v-deep {
      .el-button + .el-button {
        margin-left: 0px !important;
      }
    }
  }

  .detail-summary-card {
    display: grid;
    grid-template-columns: 5fr 3fr 3fr;
    gap: 0;
    padding: 15px 10px;
  }

  .summary-block {
    min-width: 0;
    padding: 0 26px;
  }

  .summary-block + .summary-block {
    border-left: 1px solid #ebeef5;
  }

  .summary-user {
    display: flex;
    gap: 22px;
    align-items: flex-start;
  }

  .summary-user-avatar {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .summary-user-content {
    flex: 1;
    min-width: 0;
  }

  .summary-user-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
  }

  .summary-user-name {
    font-size: 22px;
    line-height: 1;
    font-weight: 600;
    color: #1f2d3d;
  }

  .summary-line,
  .summary-info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 28px;
    font-size: 14px;
    min-height: 28px;
  }

  .summary-line-tags,
  .summary-info-top {
    align-items: center;
  }

  .summary-block {
    --summary-label-width: 86px;
  }

  .summary-main {
    --summary-label-width: 80px;
  }

  .summary-meta {
    --summary-label-width: 84px;
  }

  .summary-extra {
    --summary-label-width: 92px;
  }

  .summary-label,
  .summary-info-label,
  .third-party-label {
    flex: 0 0 auto;
    color: #6b7687;
  }

  .summary-label,
  .summary-info-label {
    flex-basis: var(--summary-label-width);
  }

  .detail-info-label {
    flex: 0 0 var(--detail-label-width, 90px);
    color: #6b7687;
  }

  .summary-value,
  .summary-info-value,
  .detail-info-value,
  .third-party-value {
    color: #2f3b52;
    min-width: 0;
  }

  .detail-info-value-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .summary-empty {
    color: #a0aec0;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  .tag-list-wrap {
    padding-top: 4px;
  }

  .copy-icon {
    color: #9aa5b1;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .copy-icon:hover {
    color: #409eff;
  }

  .edit-icon {
    color: #409eff;
    cursor: pointer;
    font-size: 16px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .detail-grid-main {
    align-items: start;
  }

  .detail-card {
    --detail-label-width: 90px;
    background: #ffffff;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    padding: 15px 18px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    min-height: 110px;
  }

  .detail-card-span-2 {
    grid-column: span 2;
  }

  .detail-card-pair {
    grid-column: span 3;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .social-content {
    display: flex;
    gap: 16px;
    min-height: 100px;
  }

  .social-info-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;
    min-width: 0;
  }

  .social-info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }

  .social-info-label {
    color: #6b7687;
    flex: 0 0 auto;
  }

  .social-info-value {
    color: #2f3b52;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .social-qrcode {
    flex: 0 0 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f7f9fc;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 10px;
  }

  .social-qrcode-img {
    width: 120px;
    height: 120px;
    border-radius: 4px;
  }

  .detail-card-span-3 {
    grid-column: span 3;
  }

  .detail-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 20px;
    font-weight: 600;
    color: #1f2d3d;
  }

  .detail-card-basic {
    --detail-label-width: 72px;
  }

  .detail-card-third-party {
    --third-party-label-width: 56px;
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }

  .detail-card-register {
    --detail-label-width: 96px;
  }

  .detail-card-social-public,
  .detail-card-social,
  .detail-card-register-env,
  .detail-card-permission {
    --detail-label-width: 90px;
  }

  .detail-card-realname {
    --detail-label-width: 112px;
  }

  .detail-info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .detail-info-grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-info-grid-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .detail-info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 28px;
    font-size: 14px;
  }

  .detail-info-item-full {
    grid-column: span 2;
  }

  .break-all {
    word-break: break-all;
  }

  .action-link {
    color: #409eff;
    cursor: pointer;
  }

  .avatar-file-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .social-layout {
    display: flex;
    justify-content: space-between;
    gap: 20px;
  }

  .third-party-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
  }

  .third-party-item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    font-size: 14px;
  }

  .third-party-label {
    flex: 0 0 var(--third-party-label-width, auto);
  }

  .third-party-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    font-size: 18px;
    line-height: 1;
    flex: 0 0 22px;
  }

  .platform-wechat {
    color: #1aad19;
  }

  .platform-alipay {
    color: #1677ff;
  }

  .platform-apple {
    color: #111111;
  }

  .platform-qq {
    color: #12b7f5;
  }

  .platform-douyin {
    color: #111111;
  }

  .platform-huawei {
    color: #d81e06;
  }

  .qrcode-box {
    flex: 0 0 124px;
    text-align: center;
  }

  .qrcode-title {
    margin-bottom: 10px;
    font-size: 13px;
    color: #6b7687;
  }

  .qrcode-image {
    width: 96px;
    height: 96px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    overflow: hidden;
  }

  .json-block {
    margin: 0;
    padding: 14px;
    background: #f7f9fc;
    border-radius: 8px;
    border: 1px solid #ebeef5;
    color: #334155;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .timeline-title {
    font-size: 14px;
    font-weight: 600;
    color: #1f2d3d;
  }

  .timeline-desc {
    margin-top: 4px;
    font-size: 13px;
    color: #6b7687;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
  }

  ::v-deep .vk-user-detail-dialog {
    .el-dialog__body {
      padding: 0 18px 18px;
    }

    .el-tabs__header {
      margin-bottom: 14px;
      padding: 0 2px;
    }

    .el-tabs__item {
      height: 44px;
      line-height: 44px;
      font-size: 15px;
      color: #4a5568;
    }

    .el-tabs__item.is-active {
      color: #2d6cdf;
      font-weight: 600;
    }

    .el-tabs__active-bar {
      background-color: #2d6cdf;
    }
  }

  @media screen and (max-width: 1280px) {
    .detail-summary-card {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .summary-block {
      padding: 0;
    }

    .summary-block + .summary-block {
      border-left: 0;
      border-top: 1px solid #ebeef5;
      padding-top: 18px;
    }

    .detail-grid,
    .detail-info-grid-3 {
      grid-template-columns: 1fr 1fr;
    }

    .detail-card-span-2,
    .detail-card-span-3 {
      grid-column: span 2;
    }
  }

  @media screen and (max-width: 768px) {
    .detail-summary-actions {
      flex-wrap: wrap;
      justify-content: flex-start;
    }

    .summary-user {
      flex-direction: column;
    }

    .detail-grid,
    .detail-info-grid-2,
    .detail-info-grid-3 {
      grid-template-columns: 1fr;
    }

    .detail-card-span-2,
    .detail-card-span-3,
    .detail-info-item-full {
      grid-column: span 1;
    }

    .social-layout {
      flex-direction: column;
    }
  }
</style>
