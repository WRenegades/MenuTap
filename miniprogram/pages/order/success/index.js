Page({
  data: {
    orderId: '',
    orderNo: '',
    subscribed: false
  },

  onLoad(options) {
    const subscribed = wx.getStorageSync('user_subscribed_order_' + (options.orderId || ''));
    this.setData({
      orderId: options.orderId || '',
      orderNo: options.orderNo || '',
      subscribed: !!subscribed
    });
  },

  onSubscribe() {
    wx.requestSubscribeMessage({
      tmplIds: ['APlICYu1A_t5Ie-Gq8ABIv5vonSruD9fxEk68S-neV8'],
      success: (res) => {
        const tmplId = 'APlICYu1A_t5Ie-Gq8ABIv5vonSruD9fxEk68S-neV8';
        if (res[tmplId] === 'accept') {
          wx.cloud.callFunction({
            name: 'api',
            data: {
              action: 'saveUserSubscription',
              templateId: tmplId,
              subscribed: true
            }
          }).then(() => {
            wx.setStorageSync('user_subscribed_order_' + this.data.orderId, true);
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

  onViewOrder() {
    wx.navigateTo({
      url: '/pages/order/detail/index?id=' + this.data.orderId
    });
  },

  onBackMenu() {
    wx.reLaunch({
      url: '/pages/menu/index'
    });
  }
});
