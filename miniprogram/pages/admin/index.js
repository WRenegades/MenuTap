const app = getApp();

Page({
  data: {
    hasPermission: false,
    myOpenid: '',
    isAdminInDb: false,
    tabs: [
      { label: '概览', value: 'dashboard' },
      { label: '订单', value: 'orders' },
      { label: '配置', value: 'config' },
      { label: '通知', value: 'subscription' },
      { label: '设置', value: 'setup' }
    ],
    activeTab: 'dashboard',
    dashboard: {},
    orderFilters: [
      { label: '全部', value: '' },
      { label: '新订单', value: 'new' },
      { label: '已接单', value: 'accepted' },
      { label: '制作中', value: 'preparing' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ],
    orderFilter: '',
    orderList: [],
    formConfig: {
      themeColor: '#FF6B81',
      welcomeText: '',
      backgroundImage: '',
      showPrice: true,
      recommendedDishIds: [],
      subscriptionTemplateId: ''
    },
    subscribed: false,
    adminList: [],
    newAdminOpenid: '',
    newAdminName: ''
  },

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    if (this.data.hasPermission) {
      this.refreshData();
    }
  },

  // 检查权限
  checkPermission() {
    wx.cloud.callFunction({
      name: 'login',
      data: {}
    }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        const { openid, isAdmin } = result.data;
        this.setData({
          myOpenid: openid,
          hasPermission: isAdmin,
          isAdminInDb: isAdmin
        });

        if (isAdmin) {
          this.refreshData();
        }
      }
    }).catch(err => {
      console.error('登录失败:', err);
    });
  },

  // 刷新数据
  refreshData() {
    this.loadDashboard();
    this.loadOrders();
    this.loadConfig();
    this.loadAdminList();
  },

  // 加载仪表盘
  loadDashboard() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getAdminDashboard' }
    }).then(res => {
      if (res.result.code === 0) {
        this.setData({ dashboard: res.result.data });
      }
    });
  },

  // 加载订单
  loadOrders() {
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'getAdminOrders',
        status: this.data.orderFilter || undefined,
        page: 1,
        pageSize: 50
      }
    }).then(res => {
      if (res.result.code === 0) {
        const list = (res.result.data.list || []).map(order => {
          const names = (order.items || []).map(item => item.dishName);
          return { ...order, dishNamesText: names.join('、') };
        });
        this.setData({ orderList: list });
      }
    });
  },

  // 加载配置
  loadConfig() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getAdminConfig' }
    }).then(res => {
      if (res.result.code === 0) {
        const cfg = res.result.data || {};
        this.setData({
          formConfig: {
            themeColor: cfg.themeColor || '#FF6B81',
            welcomeText: cfg.welcomeText || '',
            backgroundImage: cfg.backgroundImage || '',
            showPrice: cfg.showPrice !== false,
            recommendedDishIds: cfg.recommendedDishIds || [],
            subscriptionTemplateId: cfg.subscriptionTemplateId || 'fH8h-R4xBcbl6Q8Cced4LvSzGNsPky3Cx6qqf5jpgmI',
            userSubscriptionTemplateId: cfg.userSubscriptionTemplateId || 'APlICYu1A_t5Ie-Gq8ABIv5vonSruD9fxEk68S-neV8'
          },
          recommendedIdsText: (cfg.recommendedDishIds || []).join(',')
        });
        // 检查订阅状态
        if (cfg.subscriptionTemplateId && cfg.subscriptionTemplateId !== 'TODO_ORDER_TEMPLATE_ID') {
          this.checkSubscription(cfg.subscriptionTemplateId);
        }
      }
    });
  },

  // 检查订阅状态
  checkSubscription(templateId) {
    // 通过云函数查询
    // 简单起见，用本地缓存记录
    const subscribed = wx.getStorageSync('admin_subscribed_' + this.data.myOpenid);
    this.setData({ subscribed: !!subscribed });
  },

  // 加载管理员列表
  loadAdminList() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getAdminList' }
    }).then(res => {
      if (res.result.code === 0) {
        this.setData({ adminList: res.result.data || [] });
      }
    }).catch(err => {
      console.error('加载管理员列表失败:', err);
    });
  },

  // 切换选项卡
  onSwitchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.value });
  },

  // 订单过滤
  onFilterOrder(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ orderFilter: value });
    this.loadOrders();
  },

  // 查看订单
  onViewOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/order/detail/index?id=' + id + '&admin=1'
    });
  },

  // 导航
  onNavigate(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url });
  },

  // 配置输入
  onConfigInput(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    this.setData({ ['formConfig.' + key]: value });
  },

  // 推荐菜品输入
  onRecommendedInput(e) {
    const val = e.detail.value;
    const ids = val.split(',').map(s => s.trim()).filter(s => s);
    this.setData({
      'formConfig.recommendedDishIds': ids,
      recommendedIdsText: val
    });
  },

  // 切换价格显示
  onTogglePrice(e) {
    this.setData({ 'formConfig.showPrice': e.detail.value });
  },

  // 上传背景图
  onUploadBg() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        const path = tempFile.tempFilePath;
        const cloudPath = 'bg/' + Date.now() + path.match(/\.[^.]+$/)[0];

        wx.showLoading({ title: '上传中...' });
        wx.cloud.uploadFile({
          cloudPath,
          filePath: path
        }).then(uploadRes => {
          this.setData({ 'formConfig.backgroundImage': uploadRes.fileID });
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      }
    });
  },

  // 保存配置
  onSaveConfig() {
    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'saveAdminConfig',
        ...this.data.formConfig
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        wx.showToast({ title: res.result.message || '保存失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  // 请求订阅消息授权
  onRequestSubscribe() {
    const templateId = this.data.formConfig.subscriptionTemplateId;
    if (!templateId || templateId === 'TODO_ORDER_TEMPLATE_ID') {
      wx.showToast({ title: '请先在配置页填写模板ID', icon: 'none' });
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
          wx.cloud.callFunction({
            name: 'api',
            data: {
              action: 'saveSubscription',
              templateId,
              subscribed: true
            }
          }).then(() => {
            wx.setStorageSync('admin_subscribed_' + this.data.myOpenid, true);
            this.setData({ subscribed: true });
            wx.showToast({ title: '订阅成功！', icon: 'success' });
          });
        } else {
          wx.showToast({ title: '已拒绝订阅', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('订阅失败:', err);
        wx.showToast({ title: '订阅失败，请重试', icon: 'none' });
      }
    });
  },

  // 复制 OpenID
  onCopyOpenid() {
    wx.setClipboardData({
      data: this.data.myOpenid,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  // 输入 OpenID
  onNewAdminInput(e) {
    this.setData({ newAdminOpenid: e.detail.value });
  },

  // 输入备注名称
  onNewAdminNameInput(e) {
    this.setData({ newAdminName: e.detail.value });
  },

  // 添加管理员
  onAddAdmin() {
    const openid = this.data.newAdminOpenid.trim();
    if (!openid) {
      wx.showToast({ title: '请输入对方的 OpenID', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '添加中...' });
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'addAdmin',
        openid,
        name: this.data.newAdminName.trim() || '管理员'
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: res.result.message, icon: 'success' });
        this.setData({ newAdminOpenid: '', newAdminName: '' });
        this.loadAdminList();
      } else {
        wx.showToast({ title: res.result.message || '添加失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '添加失败', icon: 'none' });
    });
  },

  // 导入演示数据（含菜品图片）
  onImportDemoData() {
    wx.showLoading({ title: '导入中...' });
    wx.cloud.callFunction({
      name: 'initDemoData',
      data: {}
    }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: res.result.message, icon: 'success', duration: 3000 });
        this.refreshData();
      } else {
        wx.showToast({ title: res.result.message || '导入失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '导入失败', icon: 'none' });
    });
  },

  // 更新菜品图片到云存储
  onUpdateDishImages() {
    wx.showLoading({ title: '上传图片中...' });
    wx.cloud.callFunction({
      name: 'updateDishImages',
      data: {}
    }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: res.result.message, icon: 'success', duration: 5000 });
        this.refreshData();
      } else {
        wx.showToast({ title: res.result.message || '更新失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  },

  onBackHome() {
    wx.navigateBack();
  }
});
