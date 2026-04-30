App({
  globalData: {
    env: '',
    openid: '',
    isAdmin: false,
    adminInfo: null
  },

  onLaunch() {
    const env = this.globalData.env;
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: env,
        traceUser: true
      });
    }
  }
});
