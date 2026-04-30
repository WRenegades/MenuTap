Page({
  data: {
    pageType: 'order', // 'order' | 'dish'
    order: null,
    dish: null,
    isAdmin: false,
    flavorMap: {
      normal: '正常',
      mild_spicy: '微辣',
      sauce: '酱香',
      normal_sugar: '正常糖',
      '70_sugar': '七分糖',
      '50_sugar': '五分糖',
      '30_sugar': '三分糖'
    },
    temperatureMap: {
      hot: '热饮',
      normal_ice: '正常冰',
      less_ice: '少冰'
    },
    statusIcon: {
      new: '🆕',
      accepted: '👍',
      preparing: '👩‍🍳',
      completed: '✅',
      cancelled: '❌'
    },
    adminActions: [
      { label: '已接单', value: 'accepted' },
      { label: '制作中', value: 'preparing' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ]
  },

  onLoad(options) {
    const { id, type, admin } = options;
    if (type === 'dish') {
      this.loadDish(id);
    } else {
      this.loadOrder(id, admin === '1');
    }
  },

  // 加载菜品详情
  loadDish(dishId) {
    const app = getApp();
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getHomeData' }
    }).then(res => {
      if (res.result.code === 0) {
        const dishes = res.result.data.dishes || [];
        const dish = dishes.find(d => d._id === dishId);
        this.setData({ pageType: 'dish', dish });
      }
    });
  },

  // 加载订单详情
  loadOrder(orderId, isAdmin) {
    this.setData({ pageType: 'order' });
    const app = getApp();
    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'getOrderDetail',
        orderId,
        admin: isAdmin
      }
    }).then(res => {
      if (res.result.code === 0) {
        this.setData({
          order: res.result.data,
          isAdmin: isAdmin
        });
      } else {
        wx.showToast({ title: res.result.message || '加载失败', icon: 'none' });
      }
    }).catch(err => {
      console.error('加载订单失败:', err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  // 更新订单状态（管理员）
  onUpdateStatus(e) {
    const status = e.currentTarget.dataset.status;
    const orderId = this.data.order._id;

    wx.showModal({
      title: '确认操作',
      content: '将订单状态改为「' + this.data.adminActions.find(a => a.value === status).label + '」？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'api',
            data: {
              action: 'updateOrderStatus',
              orderId,
              status
            }
          }).then(res => {
            if (res.result.code === 0) {
              wx.showToast({ title: '状态已更新', icon: 'success' });
              this.loadOrder(orderId, true);
            } else {
              wx.showToast({ title: res.result.message || '操作失败', icon: 'none' });
            }
          });
        }
      }
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

  onBack() {
    wx.navigateBack();
  }
});
