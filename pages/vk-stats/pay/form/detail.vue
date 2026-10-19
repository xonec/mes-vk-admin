<!-- 此处 :destroy-on-close="false" 必须是 false，否则会弹窗关闭时会卡主（因为 v-if="row" 的操作已经实现了类似destroy-on-close的功能）-->
<template>
  <vk-data-dialog
    ref="dialog"
    v-model="show"
    title="支付订单详情"
    width="1280px"
    top="5vh"
    max-height="calc(90vh - 110px)"
    :destroy-on-close="false"
    custom-class="vk-pay-orders-detail-dialog"
    @closed="onDialogClosed"
  >
    <div v-if="row" class="detail-container">
      <!-- 顶部操作栏 -->
      <div class="detail-toolbar">
        <el-button class="toolbar-btn" v-if="canAfreshNotice" type="danger" size="small" @click="onAfreshNotice">重新推送通知</el-button>
        <el-button class="toolbar-btn" size="small" @click="onCopyOrder">复制订单</el-button>
      </div>

      <!-- 顶部概要卡片 -->
      <div class="detail-summary">
        <!-- Block 1: 支付类型信息 -->
        <div class="summary-block summary-block-pay">
          <div class="pay-type-icon" :style="{ backgroundColor: payTypeInfo.color }">
            <vk-data-icon :name="payTypeInfo.icon" color="#ffffff" size="36"></vk-data-icon>
          </div>
          <div class="pay-type-info">
            <div class="pay-type-title">
              <span class="pay-type-name">{{ payTypeInfo.label }}</span>
              <el-tag :type="statusInfo.tagType" size="mini" effect="light" class="status-tag">
                {{ statusInfo.label }}
              </el-tag>
            </div>
            <div class="info-list">
              <div class="info-line">
                <span class="info-label">商户订单号</span>
                <span class="info-value">{{ row.out_trade_no || '-' }}</span>
                <vk-data-icon v-if="row.out_trade_no" name="el-icon-document-copy" color="#909399" size="14" class="copy-icon" @click="copyText(row.out_trade_no)"></vk-data-icon>
              </div>
              <div class="info-line">
                <span class="info-label">平台交易号</span>
                <span class="info-value">{{ row.transaction_id || '-' }}</span>
                <vk-data-icon
                  v-if="row.transaction_id"
                  name="el-icon-document-copy"
                  color="#909399"
                  size="14"
                  class="copy-icon"
                  @click="copyText(row.transaction_id)"
                ></vk-data-icon>
              </div>
              <div class="info-line">
                <span class="info-label">订单类型</span>
                <span class="info-value">{{ orderTypeLabel }}</span>
              </div>
              <div class="info-line">
                <span class="info-label">下单时间</span>
                <span class="info-value">{{ timeFilter(row.create_date) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Block 2: 金额信息 -->
        <div class="summary-block summary-block-amounts">
          <div class="amount-item">
            <div class="amount-label">支付金额</div>
            <div class="amount-value text-red">¥{{ priceFilter(row.total_fee) }}</div>
          </div>
          <div class="amount-item">
            <div class="amount-label">已退款金额</div>
            <div class="amount-value">¥{{ priceFilter(row.refund_fee) }}</div>
          </div>
          <div class="amount-item">
            <div class="amount-label">退款次数</div>
            <div class="amount-value">{{ row.refund_num || 0 }} <span class="unit">次</span></div>
          </div>
        </div>

        <!-- Block 3: 用户信息 -->
        <div class="summary-block summary-block-user">
          <el-image class="user-avatar" :src="userInfo.avatar" fit="cover">
            <div slot="error" class="avatar-fallback">
              <vk-data-icon name="el-icon-user-solid" color="#c0c4cc" size="32"></vk-data-icon>
            </div>
          </el-image>
          <div class="user-info">
            <div class="user-header">
              <span class="user-nickname">{{ userInfo.nickname || '匿名用户' }}</span>
            </div>
            <div class="info-list">
              <div class="info-line">
                <span class="info-label">用户ID</span>
                <span class="info-value">{{ row.user_id || '-' }}</span>
              </div>
              <div class="info-line">
                <span class="info-label">用户昵称</span>
                <span class="info-value">{{ userInfo.nickname || '-' }}</span>
              </div>
              <div class="info-line" v-if="userInfo.username">
                <span class="info-label">用户账号</span>
                <span class="info-value">{{ userInfo.username }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 基础信息 -->
        <el-tab-pane label="基础信息" name="base">
          <div class="tab-base">
            <!-- 左侧：信息卡片 -->
            <div class="tab-base-left">
              <!-- 支付信息 -->
              <div class="info-card">
                <div class="card-title">支付信息</div>
                <el-row :gutter="0" class="card-grid">
                  <el-col :span="12">
                    <div class="grid-item">
                      <span class="grid-label">支付方式：</span><span class="grid-value">{{ payTypeInfo.label }}</span>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">所属平台：</span><span class="grid-value">{{ row.platform || '-' }}</span>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">支付时间：</span><span class="grid-value">{{ timeFilter(row.pay_date) || '-' }}</span>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">支付状态：</span>
                      <el-tag :type="statusInfo.tagType" size="mini" effect="light">{{ statusInfo.label }}</el-tag>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">订单类型：</span>
                      <el-tag type="info" size="mini" effect="plain">{{ orderTypeLabel }}</el-tag>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="grid-item">
                      <span class="grid-label">商户订单号：</span>
                      <span class="grid-value">{{ row.out_trade_no || '-' }}</span>
                      <vk-data-icon
                        v-if="row.out_trade_no"
                        name="el-icon-document-copy"
                        color="#909399"
                        size="14"
                        class="copy-icon"
                        @click="copyText(row.out_trade_no)"
                      ></vk-data-icon>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">平台交易号：</span>
                      <span class="grid-value">{{ row.transaction_id || '-' }}</span>
                      <vk-data-icon
                        v-if="row.transaction_id"
                        name="el-icon-document-copy"
                        color="#909399"
                        size="14"
                        class="copy-icon"
                        @click="copyText(row.transaction_id)"
                      ></vk-data-icon>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">通知模式：</span>
                      <span class="grid-value">{{ notifyModeLabel }}</span>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">用户异步通知：</span>
                      <el-tag v-if="row.user_order_success === true" type="success" size="mini" effect="light">成功</el-tag>
                      <el-tag v-else-if="row.user_order_success === false" type="danger" size="mini" effect="light">失败</el-tag>
                      <el-tag v-else type="info" size="mini" effect="light">未执行</el-tag>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">支付描述：</span><span class="grid-value">{{ row.description || '-' }}</span>
                    </div>
                  </el-col>
                </el-row>
              </div>

              <!-- 用户信息 -->
              <div class="info-card">
                <div class="card-title">用户信息</div>
                <el-row :gutter="0" class="card-grid">
                  <el-col :span="12">
                    <div class="grid-item">
                      <span class="grid-label">用户ID：</span>
                      <span class="grid-value">{{ row.user_id || '-' }}</span>
                      <vk-data-icon v-if="row.user_id" name="el-icon-document-copy" color="#909399" size="14" class="copy-icon" @click="copyText(row.user_id)"></vk-data-icon>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">用户昵称：</span><span class="grid-value">{{ row.nickname || '-' }}</span>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="grid-item">
                      <span class="grid-label">设备ID：</span><span class="grid-value">{{ row.device_id || '-' }}</span>
                      <vk-data-icon v-if="row.device_id" name="el-icon-document-copy" color="#909399" size="14" class="copy-icon" @click="copyText(row.device_id)"></vk-data-icon>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">客户端IP：</span><span class="grid-value">{{ row.client_ip || '-' }}</span>
                      <vk-data-icon v-if="row.client_ip" name="el-icon-document-copy" color="#909399" size="14" class="copy-icon" @click="copyText(row.client_ip)"></vk-data-icon>
                    </div>
                  </el-col>
                </el-row>
              </div>

              <!-- 金额信息 -->
              <div class="info-card">
                <div class="card-title">金额信息</div>
                <el-row :gutter="0" class="card-grid">
                  <el-col :span="12">
                    <div class="grid-item">
                      <span class="grid-label">订单总金额：</span><span class="grid-value">¥{{ priceFilter(row.total_fee) }} </span>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">订单总退款金额：</span><span class="grid-value">¥{{ priceFilter(row.refund_fee) }} </span>
                    </div>
                  </el-col>
                  <el-col :span="12">
                    <div class="grid-item">
                      <span class="grid-label">当前退款笔数：</span><span class="grid-value">{{ row.refund_num || 0 }} 次</span>
                    </div>
                    <div class="grid-item">
                      <span class="grid-label">实际支付金额：</span>
                      <span class="grid-value text-danger">¥{{ priceFilter(actualPayFee) }} </span>
                    </div>
                  </el-col>
                </el-row>
              </div>
            </div>

            <!-- 右侧：订单时间轴 -->
            <div class="tab-base-right">
              <div class="info-card">
                <div class="card-title">订单时间轴</div>
                <el-timeline class="order-timeline">
                  <el-timeline-item v-for="(item, index) in timelineList" :key="index" :color="item.color" :icon="item.icon" :size="'large'" placement="top">
                    <div class="timeline-content">
                      <div class="timeline-title" :style="{ color: item.color }">{{ item.title }}</div>
                      <div class="timeline-time">{{ item.time }}</div>
                      <div class="timeline-desc" v-if="item.desc">{{ item.desc }}</div>
                    </div>
                  </el-timeline-item>
                </el-timeline>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 通知回调（未支付不显示） -->
        <el-tab-pane v-if="!isUnpaid" label="通知回调" name="notify" lazy>
          <div class="info-card info-card-flat">
            <el-row :gutter="0" class="card-grid">
              <el-col :span="12">
                <div class="grid-item">
                  <span class="grid-label">通知模式：</span><span class="grid-value">{{ notifyModeLabel }}</span>
                </div>
                <div class="grid-item">
                  <span class="grid-label">通知URL：</span>
                  <span class="grid-value">{{ row.notify_url || '-' }}</span>
                  <vk-data-icon v-if="row.notify_url" name="el-icon-document-copy" color="#909399" size="14" class="copy-icon" @click="copyText(row.notify_url)"></vk-data-icon>
                </div>
                <div class="grid-item">
                  <span class="grid-label">通知路径：</span>
                  <span class="grid-value">{{ row.notify_path || '-' }}</span>
                  <vk-data-icon v-if="row.notify_path" name="el-icon-document-copy" color="#909399" size="14" class="copy-icon" @click="copyText(row.notify_path)"></vk-data-icon>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="grid-item">
                  <span class="grid-label">系统回调：</span>
                  <el-tag v-if="row.notify_info" type="success" size="mini" effect="light">已执行</el-tag>
                  <el-tag v-else type="info" size="mini" effect="light">未执行</el-tag>
                </div>
                <div class="grid-item">
                  <span class="grid-label">用户回调：</span>
                  <el-tag v-if="row.user_order_success === true" type="success" size="mini" effect="light">成功</el-tag>
                  <el-tag v-else-if="row.user_order_success === false" type="danger" size="mini" effect="light">失败</el-tag>
                  <el-tag v-else type="info" size="mini" effect="light">未执行</el-tag>
                </div>
                <div class="grid-item">
                  <span class="grid-label">通知时间：</span><span class="grid-value">{{ timeFilter(row.notify_date) }}</span>
                </div>
              </el-col>
            </el-row>
            <div class="json-block">
              <div class="json-block-header">
                <div class="json-title">
                  {{ notifyDataType === 'notify_info' ? '通知数据 (notify_info)' : '原始回调数据 (original_data)' }}
                </div>
                <el-radio-group v-model="notifyDataType" size="mini">
                  <el-radio-button label="notify_info">通知数据</el-radio-button>
                  <el-radio-button label="original_data">原始回调数据</el-radio-button>
                </el-radio-group>
              </div>
              <div class="json-content-wrap">
                <vk-data-icon
                  v-if="currentNotifyJson"
                  name="el-icon-document-copy"
                  color="#909399"
                  size="16"
                  class="json-copy-icon"
                  @click="copyText(currentNotifyJson)"
                ></vk-data-icon>
                <pre v-if="notifyDataType === 'notify_info'" class="json-content">{{ notifyInfoJson || '暂无' }}</pre>
                <pre v-else class="json-content">{{ originalDataJson || '暂无' }}</pre>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 退款信息（未支付不显示） -->
        <el-tab-pane v-if="!isUnpaid" name="refund" lazy>
          <span slot="label">
            退款信息
            <el-badge v-if="(row.refund_list || []).length > 0" :value="row.refund_list.length" class="tab-badge" type="danger"></el-badge>
          </span>
          <div class="tab-refund">
            <el-table :data="row.refund_list || []" border size="small" :empty-text="'暂无退款记录'">
              <el-table-column type="index" label="序号" width="60" align="center"></el-table-column>
              <el-table-column prop="out_refund_no" label="退款单号" min-width="220">
                <template slot-scope="scope">
                  <span>{{ scope.row.out_refund_no || '-' }}</span>
                  <vk-data-icon
                    v-if="scope.row.out_refund_no"
                    name="el-icon-document-copy"
                    color="#909399"
                    size="14"
                    class="copy-icon"
                    @click="copyText(scope.row.out_refund_no)"
                  ></vk-data-icon>
                </template>
              </el-table-column>
              <el-table-column label="退款时间" width="180" align="center">
                <template slot-scope="scope">{{ timeFilter(scope.row.refund_date) }}</template>
              </el-table-column>
              <el-table-column label="退款金额" width="140" align="right">
                <template slot-scope="scope">¥{{ priceFilter(scope.row.refund_fee) }}</template>
              </el-table-column>
              <el-table-column prop="refund_desc" label="退款备注" min-width="200"></el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template v-slot:footer="{ close }">
      <div class="dialog-footer" v-if="row">
        <div class="footer-meta">
          <div class="meta-item">
            <span class="meta-label">ID：</span>
            <span class="meta-value">{{ row._id || '-' }}</span>
            <vk-data-icon v-if="row._id" name="el-icon-document-copy" color="#909399" size="14" class="copy-icon" @click="copyText(row._id)"></vk-data-icon>
          </div>
          <div class="meta-item" v-if="row.pay_date">
            <span class="meta-label">支付时间：</span>
            <span class="meta-value">{{ timeFilter(row.pay_date) }}</span>
          </div>
        </div>
        <el-button size="small" @click="close">关 闭</el-button>
      </div>
    </template>
  </vk-data-dialog>
</template>

<script>
  import { PAY_TYPE_MAP, STATUS_MAP, ORDER_TYPE_MAP, NOTIFY_MODE_MAP, PROVIDER_PAY_METHOD_MAP } from '../constants.js';
  export default {
    name: 'vk-pay-orders-detail',
    data() {
      return {
        show: false,
        row: null,
        activeTab: 'base',
        notifyDataType: 'notify_info',
      };
    },
    methods: {
      open(row) {
        this.row = row ? Object.freeze(Object.assign({}, row)) : null;
        this.activeTab = 'base';
        this.notifyDataType = 'notify_info';
        this.show = true;
      },
      close() {
        this.show = false;
      },
      onDialogClosed() {
        this.row = null;
        this.activeTab = 'base';
        this.notifyDataType = 'notify_info';
      },
      timeFilter(val) {
        let vk = uni.vk;
        if (!val) return '-';
        return vk.pubfn.timeFormat(val, 'yyyy-MM-dd hh:mm:ss');
      },
      priceFilter(val) {
        let vk = uni.vk;
        return vk.pubfn.priceFilter(val || 0);
      },
      formatTime(val) {
        let vk = uni.vk;
        if (!val) return '-';
        return vk.pubfn.timeFormat(val, 'yyyy-MM-dd hh:mm:ss');
      },
      formatJson(val) {
        let vk = uni.vk;
        if (vk.pubfn.isNull(val)) return '';
        try {
          return JSON.stringify(val, null, 2);
        } catch (e) {
          return String(val);
        }
      },
      copyText(text) {
        let vk = uni.vk;
        if (vk.pubfn.isNull(text)) return;
        const str = String(text);
        vk.setClipboardData({
          data: str,
          success: () => {
            vk.toast('复制成功');
          },
          fail: () => {
            vk.toast('复制失败');
          },
        });
      },
      onCopyOrder() {
        if (!this.row) return;
        const txt = `商户订单号：${this.row.out_trade_no || '-'}\n平台交易号：${this.row.transaction_id || '-'}\n订单ID：${this.row._id || '-'}`;
        this.copyText(txt);
      },
      onAfreshNotice() {
        if (!this.canAfreshNotice) return;
        this.$emit('afresh-notice', this.row);
        this.show = false;
      },
    },
    computed: {
      userInfo() {
        return this.row.userInfo || {};
      },
      payTypeInfo() {
        const info = PAY_TYPE_MAP[this.row && this.row.pay_type];
        return info || { label: this.row && this.row.pay_type ? this.row.pay_type : '-', icon: 'el-icon-bank-card', color: '#909399' };
      },
      statusInfo() {
        const key = this.row ? String(this.row.status) : '0';
        return STATUS_MAP[key] || { label: '未知', tagType: 'info' };
      },
      isUnpaid() {
        if (!this.row) return true;
        return Number(this.row.status) === 0;
      },
      orderTypeLabel() {
        if (!this.row) return '-';
        return ORDER_TYPE_MAP[this.row.type] || this.row.type || '-';
      },
      notifyModeLabel() {
        if (!this.row) return '-';
        return NOTIFY_MODE_MAP[this.row.notify_mode] === undefined ? '-' : NOTIFY_MODE_MAP[this.row.notify_mode];
      },
      providerPayMethodLabel() {
        if (!this.row) return '-';
        return PROVIDER_PAY_METHOD_MAP[this.row.provider_pay_method] || this.row.provider_pay_method || '-';
      },
      actualPayFee() {
        if (!this.row) return 0;
        const total = Number(this.row.total_fee) || 0;
        const refund = Number(this.row.refund_fee) || 0;
        return total - refund;
      },
      openidMask() {
        if (!this.row || !this.row.openid) return '-';
        const openid = String(this.row.openid);
        if (openid.length <= 10) return openid;
        return openid.substring(0, 3) + '****' + openid.substring(openid.length - 3);
      },
      canAfreshNotice() {
        if (!this.row) return false;
        return this.row.status === 1 && !this.row.user_order_success;
      },
      timelineList() {
        if (!this.row) return [];
        const list = [];
        list.push({
          title: '创建订单',
          time: this.formatTime(this.row.create_date),
          desc: '订单已创建',
          color: '#409EFF',
          icon: 'el-icon-document',
        });
        if (this.row.pay_date) {
          list.push({
            title: '支付成功',
            time: this.formatTime(this.row.pay_date),
            desc: '支付金额：¥' + this.priceFilter(this.row.total_fee),
            color: '#67C23A',
            icon: 'el-icon-circle-check',
          });
        }
        if (this.row.notify_date) {
          list.push({
            title: '异步通知',
            time: this.formatTime(this.row.notify_date),
            desc: '通知方式：' + this.notifyModeLabel,
            color: '#8e44ad',
            icon: 'el-icon-bell',
          });
        }
        if (Number(this.row.refund_fee) > 0) {
          const isFull = this.row.status === 3;
          list.push({
            title: isFull ? '全额退款' : '部分退款',
            time: this.formatTime(this.lastRefundDate),
            desc: '退款金额：¥' + this.priceFilter(this.row.refund_fee),
            color: '#E6A23C',
            icon: 'el-icon-refresh-left',
          });
        }
        if (this.row.cancel_date) {
          list.push({
            title: '订单已关闭',
            time: this.formatTime(this.row.cancel_date),
            desc: '当前状态：' + this.statusInfo.label,
            color: '#909399',
            icon: 'el-icon-close',
          });
        } else if ([1, 2, 3].indexOf(this.row.status) > -1) {
          list.push({
            title: '订单完成',
            time: this.formatTime(this.row.notify_date || this.row.pay_date),
            desc: '当前状态：' + this.statusInfo.label,
            color: '#409EFF',
            icon: 'el-icon-finished',
          });
        }
        return list;
      },
      lastRefundDate() {
        if (!this.row || !this.row.refund_list || !this.row.refund_list.length) return '';
        const list = this.row.refund_list;
        let last = 0;
        for (let i = 0; i < list.length; i++) {
          if (list[i].refund_date && list[i].refund_date > last) {
            last = list[i].refund_date;
          }
        }
        return last;
      },
      originalDataJson() {
        return this.formatJson(this.row && this.row.original_data);
      },
      notifyInfoJson() {
        return this.formatJson(this.row && this.row.notify_info);
      },
      currentNotifyJson() {
        return this.notifyDataType === 'notify_info' ? this.notifyInfoJson : this.originalDataJson;
      },
      statDataJson() {
        return this.formatJson(this.row && this.row.stat_data);
      },
    },
  };
</script>

<style lang="scss" scoped>
  ::v-deep {
    .vk-pay-orders-detail-dialog {
      max-width: 100%;
      .el-dialog__header {
        padding: 16px 24px;
        border-bottom: 1px solid #ebeef5;
      }

      .el-dialog__body {
        padding: 0 !important;
        background-color: #f5f7fa;
      }

      .el-dialog__footer {
        padding: 12px 24px;
        border-top: 1px solid #ebeef5;
        background-color: #ffffff;
      }
    }
  }

  .detail-container {
    padding: 16px 20px 0;
  }

  /* 顶部操作栏 */
  .detail-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;

    .toolbar-btn {
      margin-left: 10px;
    }
  }

  /* 顶部概要卡片 */
  .detail-summary {
    display: flex;
    background-color: #ffffff;
    border-radius: 6px;
    border: 1px solid #ebeef5;
    padding: 20px 0;
    margin-bottom: 16px;

    .summary-block {
      padding: 0 24px;
      position: relative;

      & + .summary-block::before {
        content: '';
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 1px;
        background-color: #ebeef5;
      }
    }

    .summary-block-pay {
      flex: 2;
      display: flex;
      align-items: flex-start;

      .pay-type-icon {
        width: 64px;
        height: 64px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-right: 16px;
      }

      .pay-type-info {
        flex: 1;
        min-width: 0;
      }

      .pay-type-title {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        .pay-type-name {
          font-size: 18px;
          font-weight: 600;
          color: #303133;
          margin-right: 10px;
        }
      }
    }

    .summary-block-amounts {
      flex: 2;
      display: flex;
      justify-content: space-around;
      align-items: center;

      .amount-item {
        text-align: center;
      }

      .amount-label {
        font-size: 13px;
        color: #909399;
        margin-bottom: 8px;
      }

      .amount-value {
        font-size: 24px;
        font-weight: 600;
        line-height: 1.2;
        color: #303133;

        &.text-red {
          color: #f56c6c;
        }

        .unit {
          font-size: 14px;
          font-weight: normal;
          margin-left: 2px;
        }
      }
    }

    .summary-block-user {
      flex: 1.5;
      display: flex;
      align-items: flex-start;

      .user-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        flex-shrink: 0;
        margin-right: 16px;
        background-color: #f0f2f5;
        display: flex;
        align-items: center;
        justify-content: center;

        .avatar-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .user-info {
        flex: 1;
        min-width: 0;
      }

      .user-header {
        display: flex;
        align-items: center;
        margin-bottom: 10px;

        .user-nickname {
          font-size: 18px;
          font-weight: 600;
          color: #303133;
          margin-right: 12px;
        }

        .user-link {
          font-size: 12px;
          color: #409eff;
          cursor: pointer;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }

  .info-list {
    .info-line {
      display: flex;
      align-items: center;
      font-size: 13px;
      line-height: 24px;

      .info-label {
        color: #909399;
        width: 80px;
        flex-shrink: 0;
      }

      .info-value {
        color: #303133;
        word-break: break-all;
      }

      .copy-icon {
        margin-left: 5px;
        cursor: pointer;

        &:hover {
          color: #409eff !important;
        }
      }
    }
  }

  .status-tag {
    margin-left: 4px;
  }

  /* Tabs */
  .detail-tabs {
    background-color: #ffffff;
    border-radius: 6px;
    border: 1px solid #ebeef5;
    padding: 0 16px;
    margin-bottom: 16px;

    ::v-deep {
      .el-tabs__header {
        margin-bottom: 0;
      }

      .el-tabs__nav-wrap::after {
        height: 1px;
        background-color: #ebeef5;
      }

      .el-tabs__item {
        font-size: 14px;
        height: 48px;
        line-height: 48px;
      }

      .el-tabs__content {
        padding: 16px 0;
      }
    }

    .tab-badge {
      margin-top: -2px;
      margin-left: 4px;

      ::v-deep {
        .el-badge__content {
          height: 16px;
          line-height: 16px;
          padding: 0 6px;
          font-size: 11px;
        }
      }
    }
  }

  .tab-base {
    display: flex;
    gap: 16px;

    .tab-base-left {
      flex: 2.2;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tab-base-right {
      flex: 1;
      min-width: 0;
    }
  }

  .info-card {
    background-color: #ffffff;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    padding: 16px 20px;

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      padding-left: 10px;
      border-left: 3px solid #409eff;
      margin-bottom: 16px;
      line-height: 14px;
    }

    .card-grid {
      .grid-item {
        display: flex;
        align-items: center;
        font-size: 13px;
        line-height: 32px;

        .grid-label {
          color: #909399;
          width: 120px;
          flex-shrink: 0;
        }

        .grid-value {
          color: #303133;
          word-break: break-all;
          min-width: 0;
        }

        &.grid-item-narrow .grid-label {
          width: 170px;
        }

        .copy-icon {
          margin-left: 5px;
          cursor: pointer;
          flex-shrink: 0;

          &:hover {
            color: #409eff !important;
          }
        }

        .text-danger {
          color: #f56c6c;
          font-weight: 600;
        }
      }
    }
  }

  .info-card-flat {
    border: none;
    padding: 0;
    background-color: transparent;
  }

  .order-timeline {
    padding: 10px 0 0 10px;
    ::v-deep {
      .el-timeline-item__node--large {
        width: 20px;
        height: 20px;
        left: -5px;
      }

      .el-timeline-item__icon {
        font-size: 12px;
        color: #ffffff;
      }

      .el-timeline-item__tail {
        left: 4px;
        border-left: 2px solid #e4e7ed;
      }
    }

    .timeline-content {
      padding-left: 10px;
      position: relative;
      top: -4px;
    }

    .timeline-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .timeline-time {
      font-size: 12px;
      color: #909399;
      line-height: 20px;
    }

    .timeline-desc {
      font-size: 12px;
      color: #606266;
      line-height: 20px;
      margin-top: 2px;
    }
  }

  .tab-refund {
    padding: 4px 0;

    .copy-icon {
      margin-left: 4px;
      cursor: pointer;
      vertical-align: middle;
    }
  }

  .json-block {
    margin-top: 16px;

    .json-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      gap: 12px;
      flex-wrap: wrap;
      user-select: none;
    }

    .json-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .json-content-wrap {
      position: relative;
    }

    .json-copy-icon {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 1;
      padding: 4px;
      cursor: pointer;
      background-color: #ffffff;
      border: 1px solid #ebeef5;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        color: #409eff !important;
        border-color: #c6e2ff;
        background-color: #ecf5ff;
      }
    }

    .json-content {
      background-color: #f8f9fa;
      border: 1px solid #ebeef5;
      border-radius: 6px;
      padding: 16px;
      font-size: 13px;
      line-height: 1.6;
      color: #606266;
      max-height: 500px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: Consolas, Monaco, 'Courier New', monospace;
    }
  }

  .empty-tip {
    padding: 60px 0;
    text-align: center;
    color: #909399;
    font-size: 14px;
  }

  /* 底部 Footer */
  .dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .footer-meta {
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 12px;

      .meta-item {
        display: flex;
        align-items: center;

        .meta-label {
          color: #909399;
        }

        .meta-value {
          color: #606266;
        }

        .copy-icon {
          margin-left: 5px;
          cursor: pointer;

          &:hover {
            color: #409eff !important;
          }
        }
      }
    }
  }
</style>
