Page({
  data: {
    hasPermission: false,
    categories: [],
    showForm: false,
    editMode: 'create',
    editCategoryId: '',
    form: {
      name: '',
      icon: '📦',
      sort: '1',
      enabled: true
    }
  },

  // 空函数，用于 catchtap 阻止事件冒泡
  noop() {},

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    if (this.data.hasPermission) {
      this.loadCategories();
    }
  },

  checkPermission() {
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      if (res.result.code === 0) {
        this.setData({ hasPermission: res.result.data.isAdmin });
        if (res.result.data.isAdmin) this.loadCategories();
      }
    });
  },

  loadCategories() {
    wx.cloud.callFunction({
      name: 'api',
      data: { action: 'getAdminCategories' }
    }).then(res => {
      if (res.result.code === 0) {
        this.setData({ categories: res.result.data || [] });
      }
    });
  },

  onAddCategory() {
    this.setData({
      showForm: true,
      editMode: 'create',
      editCategoryId: '',
      form: { name: '', icon: '📦', sort: '1', enabled: true }
    });
  },

  onEditCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({
      showForm: true,
      editMode: 'edit',
      editCategoryId: cat._id,
      form: {
        name: cat.name,
        icon: cat.icon || '📦',
        sort: String(cat.sort || '0'),
        enabled: cat.enabled !== false
      }
    });
  },

  onCloseForm() {
    this.setData({ showForm: false });
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ ['form.' + key]: e.detail.value });
  },

  onFormEnabled(e) {
    this.setData({ 'form.enabled': e.detail.value });
  },

  onSaveCategory() {
    const { form, editCategoryId, editMode } = this.data;
    if (!form.name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    const params = {
      action: 'saveCategory',
      name: form.name,
      icon: form.icon || '📦',
      sort: parseInt(form.sort) || 0,
      enabled: form.enabled
    };
    if (editMode === 'edit' && editCategoryId) {
      params.categoryId = editCategoryId;
    }

    wx.cloud.callFunction({ name: 'api', data: params }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.setData({ showForm: false });
        this.loadCategories();
      } else {
        wx.showToast({ title: res.result.message || '保存失败', icon: 'none' });
      }
    });
  },

  onDeleteCategory(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该分类吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          wx.cloud.callFunction({
            name: 'api',
            data: { action: 'deleteCategory', categoryId: id }
          }).then(res => {
            wx.hideLoading();
            if (res.result.code === 0) {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadCategories();
            } else {
              wx.showToast({ title: res.result.message || '删除失败', icon: 'none' });
            }
          });
        }
      }
    });
  }
});
