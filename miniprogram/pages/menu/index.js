const app = getApp();

Page({
  data: {
    loading: false,
    loadingText: '加载中...',
    bgImage: '',
    welcomeText: '',
    config: {},
    categories: [],
    dishes: [],
    topDishes: [],
    activeCategory: '',
    currentDishes: [],
    scrollIntoView: '',
    cartItems: [],
    cartCount: 0,
    cartTotalPrice: 0,
    showAddModal: false,
    showCartDetail: false,
    addDish: {},
    isBeverage: false,
    flavorOptions: [
      { label: '正常', value: 'normal' },
      { label: '微辣', value: 'mild_spicy' },
      { label: '酱香', value: 'sauce' }
    ],
    corianderOptions: [
      { label: '放香菜', value: true },
      { label: '不放香菜', value: false }
    ],
    beverageFlavorOptions: [
      { label: '正常糖', value: 'normal_sugar' },
      { label: '七分糖', value: '70_sugar' },
      { label: '五分糖', value: '50_sugar' },
      { label: '三分糖', value: '30_sugar' }
    ],
    temperatureOptions: [
      { label: '热饮', value: 'hot' },
      { label: '正常冰', value: 'normal_ice' },
      { label: '少冰', value: 'less_ice' }
    ],
    addForm: {
      flavor: 'normal',
      coriander: true,
      temperature: '',
      remark: '',
      quantity: 1
    }
  },

  onLoad() {
    this.loadHomeData();
  },

  onShow() {
    // 如果是从其他页面返回，刷新数据
    if (this.data.categories.length === 0) {
      this.loadHomeData();
    }
  },

  // 空函数，用于 catchtap 阻止事件冒泡
  noop() {},

  // 计算购物车总价
  calcCartTotal(items) {
    return items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  },

  // 进入管理后台
  onGoAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' });
  },

  // 加载首页数据
  loadHomeData() {
    this.setData({ loading: true, loadingText: '加载菜单中...' });
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getHomeData' }
    }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        const data = result.data;
        const config = data.config || {};
        const categories = data.categories || [];
        const firstCategory = categories.length > 0 ? categories[0]._id : '';

        this.setData({
          config,
          bgImage: config.backgroundImage || '',
          welcomeText: config.welcomeText || '',
          categories,
          dishes: data.dishes || [],
          topDishes: data.topDishes || [],
          activeCategory: firstCategory
        });

        if (firstCategory) {
          this.filterDishes(firstCategory);
        }
      } else {
        wx.showToast({ title: result.message || '数据加载失败，请检查云函数和数据库', icon: 'none', duration: 3000 });
      }
    }).catch(err => {
      console.error('加载失败:', err);
      wx.showToast({ title: '网络错误，请检查云环境ID和云函数部署', icon: 'none', duration: 3000 });
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  // 按分类过滤菜品
  filterDishes(categoryId) {
    const dishes = this.data.dishes.filter(d => d.categoryId === categoryId);
    this.setData({ currentDishes: dishes });
  },

  // 选择分类
  onSelectCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id });
    this.filterDishes(id);
  },

  // 菜品详情
  onDishDetail(e) {
    const dish = e.currentTarget.dataset.dish;
    wx.navigateTo({
      url: '/pages/order/detail/index?id=' + dish._id + '&type=dish'
    });
  },

  // 打开加入弹窗
  onAddToCart(e) {
    const dish = e.currentTarget.dataset.dish;
    const isBeverage = dish.categoryName === '饮品';
    this.setData({
      addDish: dish,
      isBeverage,
      showAddModal: true,
      addForm: isBeverage
        ? { flavor: 'normal_sugar', coriander: false, temperature: 'hot', remark: '', quantity: 1 }
        : { flavor: 'normal', coriander: true, temperature: '', remark: '', quantity: 1 }
    });
  },

  // 关闭加入弹窗
  onCloseAddModal() {
    this.setData({ showAddModal: false });
  },

  // 选择口味
  onSelectFlavor(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'addForm.flavor': value });
  },

  // 选择香菜
  onSelectCoriander(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'addForm.coriander': value === 'true' });
  },

  // 选择温度（饮品）
  onSelectTemperature(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'addForm.temperature': value });
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({ 'addForm.remark': e.detail.value });
  },

  // 数量减
  onQtyMinus() {
    let qty = this.data.addForm.quantity;
    if (qty > 1) {
      this.setData({ 'addForm.quantity': qty - 1 });
    }
  },

  // 数量加
  onQtyPlus() {
    let qty = this.data.addForm.quantity;
    if (qty < 99) {
      this.setData({ 'addForm.quantity': qty + 1 });
    }
  },

  // 确认加入购物车
  onConfirmAdd() {
    const { addDish, addForm, cartItems, isBeverage } = this.data;

    const flavorText = isBeverage
      ? this.data.beverageFlavorOptions.find(o => o.value === addForm.flavor).label
      : this.data.flavorOptions.find(o => o.value === addForm.flavor).label;
    const extraText = isBeverage
      ? this.data.temperatureOptions.find(o => o.value === addForm.temperature).label
      : (addForm.coriander ? '放香菜' : '不放香菜');

    // 查找是否已存在相同配置的购物车项
    const existIndex = cartItems.findIndex(item => {
      if (item.dishId !== addDish._id) return false;
      if (item.flavor !== addForm.flavor) return false;
      if (item.remark !== addForm.remark) return false;
      if (isBeverage) {
        return item.temperature === addForm.temperature;
      } else {
        return item.coriander === addForm.coriander;
      }
    });

    let newItems = [...cartItems];
    if (existIndex >= 0) {
      // 已有相同项，增加数量
      const qty = newItems[existIndex].quantity + addForm.quantity;
      if (qty > 99) {
        wx.showToast({ title: '数量不能超过99', icon: 'none' });
        return;
      }
      newItems[existIndex].quantity = qty;
    } else {
      // 新增购物车项
      newItems.push({
        dishId: addDish._id,
        dishName: addDish.name,
        price: addDish.price,
        image: addDish.image,
        flavor: addForm.flavor,
        flavorText,
        coriander: isBeverage ? false : addForm.coriander,
        corianderText: isBeverage ? '' : extraText,
        temperature: isBeverage ? addForm.temperature : '',
        temperatureText: isBeverage ? extraText : '',
        remark: addForm.remark,
        quantity: addForm.quantity
      });
    }

    const cartCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

    this.setData({
      cartItems: newItems,
      cartCount,
      cartTotalPrice: this.calcCartTotal(newItems),
      showAddModal: false
    });

    wx.showToast({ title: '已加入～', icon: 'success', duration: 1000 });
  },

  // 切换购物车详情
  onToggleCartDetail() {
    if (this.data.cartItems.length === 0) return;
    this.setData({ showCartDetail: !this.data.showCartDetail });
  },

  // 清空购物车
  onClearCart() {
    wx.showModal({
      title: '清空购物车',
      content: '确定要清空吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ cartItems: [], cartCount: 0, cartTotalPrice: 0, showCartDetail: false });
        }
      }
    });
  },

  // 购物车项数量减
  onCartItemMinus(e) {
    const index = e.currentTarget.dataset.index;
    const items = [...this.data.cartItems];
    if (items[index].quantity > 1) {
      items[index].quantity -= 1;
    } else {
      items.splice(index, 1);
    }
    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ cartItems: items, cartCount, cartTotalPrice: this.calcCartTotal(items) });
  },

  // 购物车项数量加
  onCartItemPlus(e) {
    const index = e.currentTarget.dataset.index;
    const items = [...this.data.cartItems];
    if (items[index].quantity < 99) {
      items[index].quantity += 1;
    }
    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ cartItems: items, cartCount, cartTotalPrice: this.calcCartTotal(items) });
  },

  // 提交订单
  onSubmitOrder() {
    if (this.data.cartItems.length === 0) return;

    const items = this.data.cartItems.map(item => ({
      dishId: item.dishId,
      flavor: item.flavor,
      coriander: item.coriander,
      temperature: item.temperature || '',
      remark: item.remark,
      quantity: item.quantity
    }));

    this.setData({ loading: true, loadingText: '提交订单中...' });

    wx.cloud.callFunction({
      name: 'api',
      data: {
        action: 'submitOrder',
        items,
        remark: ''
      }
    }).then(res => {
      const result = res.result;
      if (result.code === 0) {
        this.setData({ cartItems: [], cartCount: 0, cartTotalPrice: 0 });
        wx.navigateTo({
          url: '/pages/order/success/index?orderId=' + result.data.orderId + '&orderNo=' + result.data.orderNo
        });
      } else {
        wx.showToast({ title: result.message || '提交失败', icon: 'none' });
      }
    }).catch(err => {
      console.error('提交失败:', err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
