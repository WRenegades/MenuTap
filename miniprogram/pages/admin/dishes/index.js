Page({
  data: {
    hasPermission: false,
    dishList: [],
    categories: [],
    showForm: false,
    editMode: 'create', // 'create' | 'edit'
    editDishId: '',
    form: {
      name: '',
      categoryId: '',
      image: '',
      description: '',
      price: '0',
      tags: [],
      tagsText: '',
      mainIngredients: '',
      steps: '',
      flavorSuggestion: '',
      sort: '0',
      enabled: true
    },
    selectedCategoryIndex: -1
  },

  // 空函数，用于 catchtap 阻止事件冒泡
  noop() {},

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    if (this.data.hasPermission) {
      this.loadData();
    }
  },

  checkPermission() {
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      if (res.result.code === 0) {
        this.setData({ hasPermission: res.result.data.isAdmin });
        if (res.result.data.isAdmin) this.loadData();
      }
    });
  },

  loadData() {
    Promise.all([
      wx.cloud.callFunction({ name: 'api', data: { action: 'getAdminDishes' } }),
      wx.cloud.callFunction({ name: 'api', data: { action: 'getAdminCategories' } })
    ]).then(([dishesRes, catRes]) => {
      if (dishesRes.result.code === 0) {
        this.setData({ dishList: dishesRes.result.data || [] });
      }
      if (catRes.result.code === 0) {
        this.setData({ categories: catRes.result.data || [] });
      }
    });
  },

  onSearch(e) {
    const keyword = e.detail.value.toLowerCase();
    if (!keyword) {
      return this.loadData();
    }
    // 前端过滤
    wx.cloud.callFunction({ name: 'api', data: { action: 'getAdminDishes' } }).then(res => {
      if (res.result.code === 0) {
        const list = (res.result.data || []).filter(d => d.name.toLowerCase().includes(keyword));
        this.setData({ dishList: list });
      }
    });
  },

  onAddDish() {
    this.setData({
      showForm: true,
      editMode: 'create',
      editDishId: '',
      form: { name: '', categoryId: '', image: '', description: '', price: '0', tags: [], tagsText: '', mainIngredients: '', steps: '', flavorSuggestion: '', sort: '0', enabled: true },
      selectedCategoryIndex: -1
    });
  },

  onEditDish(e) {
    const dish = e.currentTarget.dataset.dish;
    const catIndex = this.data.categories.findIndex(c => c._id === dish.categoryId);
    this.setData({
      showForm: true,
      editMode: 'edit',
      editDishId: dish._id,
      form: {
        name: dish.name,
        categoryId: dish.categoryId,
        image: dish.image || '',
        description: dish.description || '',
        price: String(dish.price || '0'),
        tags: dish.tags || [],
        tagsText: (dish.tags || []).join(', '),
        mainIngredients: dish.mainIngredients || '',
        steps: dish.steps || '',
        flavorSuggestion: dish.flavorSuggestion || '',
        sort: String(dish.sort || '0'),
        enabled: dish.enabled !== false
      },
      selectedCategoryIndex: catIndex >= 0 ? catIndex : -1
    });
  },

  onCloseForm() {
    this.setData({ showForm: false });
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  onFormTags(e) {
    const val = e.detail.value;
    const tags = val.split(',').map(s => s.trim()).filter(s => s);
    this.setData({ 'form.tagsText': val, 'form.tags': tags });
  },

  onCategoryChange(e) {
    const index = e.detail.value;
    const cat = this.data.categories[index];
    if (cat) {
      this.setData({
        selectedCategoryIndex: index,
        'form.categoryId': cat._id
      });
    }
  },

  onFormEnabled(e) {
    this.setData({ 'form.enabled': e.detail.value });
  },

  onUploadImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        const ext = path.match(/\.[^.]+$/)[0];
        const cloudPath = 'dishes/' + Date.now() + ext;

        wx.showLoading({ title: '上传中...' });
        wx.cloud.uploadFile({ cloudPath, filePath: path }).then(uploadRes => {
          this.setData({ 'form.image': uploadRes.fileID });
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      }
    });
  },

  onSaveDish() {
    const { form, editDishId, editMode } = this.data;
    if (!form.name) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }
    if (!form.categoryId) {
      wx.showToast({ title: '请选择分类', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    const params = {
      action: 'saveDish',
      name: form.name,
      categoryId: form.categoryId,
      image: form.image,
      description: form.description,
      price: parseFloat(form.price) || 0,
      tags: form.tags,
      mainIngredients: form.mainIngredients,
      steps: form.steps,
      flavorSuggestion: form.flavorSuggestion,
      sort: parseInt(form.sort) || 0,
      enabled: form.enabled
    };
    if (editMode === 'edit' && editDishId) {
      params.dishId = editDishId;
    }

    wx.cloud.callFunction({ name: 'api', data: params }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.setData({ showForm: false });
        this.loadData();
      } else {
        wx.showToast({ title: res.result.message || '保存失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  onToggleDish(e) {
    const { id, enabled } = e.currentTarget.dataset;
    const newEnabled = !enabled;
    wx.showLoading({ title: '更新中...' });
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'toggleDish', dishId: id, enabled: newEnabled }
    }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: newEnabled ? '已上架' : '已下架', icon: 'success' });
        this.loadData();
      } else {
        wx.showToast({ title: res.result.message || '操作失败', icon: 'none' });
      }
    });
  }
});
