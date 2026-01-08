// 全局状态
let products = [];
let history = [];
let inboundCart = [];
let outboundCart = [];
let transferCart = [];

// =======================
// 登录逻辑
// =======================
function handleLogin(e) {
    if (e) e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    // 简单硬编码验证 (账号: QINGYUAN, 密码: QINGYUAN01)
    if (u === 'QINGYUAN' && p === 'QINGYUAN01') {
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');

        // 1. 登录界面淡出
        loginContainer.classList.add('transition-opacity', 'fade-out');

        // 2. 等待淡出动画完成后，显示主界面
        setTimeout(() => {
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            
            // 3. 主界面淡入 + 上浮
            appContainer.classList.add('fade-in');
            
            // 登录成功后确保 Dashboard 数据是最新的
            updateDashboard(); 
        }, 500); // 500ms 对应 CSS transition 时间
    } else {
        alert('账号或密码错误！');
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    showTab('dashboard');
    updateDashboard();
});

// 数据加载与保存
function loadData() {
    const p = localStorage.getItem('qy_products');
    const h = localStorage.getItem('qy_history');
    if (p) {
        products = JSON.parse(p);
        // 数据迁移：旧版本只有 stock，新版本需要 stock_warehouse 和 stock_store
        products.forEach(prod => {
            if (prod.stock_warehouse === undefined) {
                prod.stock_warehouse = Number(prod.stock || 0);
                prod.stock_store = 0;
                // 保留 stock 字段作为总库存（计算属性，但在保存时也可以冗余存储以便快速读取，或者只存两个分量）
                // 为了兼容性，我们更新时维护 stock = w + s
                prod.stock = prod.stock_warehouse + prod.stock_store;
            }
            // 升级数据结构：添加 specs (规格)
            if (prod.specs === undefined) {
                prod.specs = '';
            }
        });
    }
    if (h) history = JSON.parse(h);
}

function saveData() {
    // 确保总库存字段正确
    products.forEach(p => {
        p.stock = Number(p.stock_warehouse || 0) + Number(p.stock_store || 0);
    });
    localStorage.setItem('qy_products', JSON.stringify(products));
    localStorage.setItem('qy_history', JSON.stringify(history));
    updateDashboard();
}

// 标签页切换
function showTab(tabId) {
    // 隐藏所有 tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('block'));
    
    // 显示目标 tab
    const target = document.getElementById(`tab-${tabId}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }

    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-slate-900', 'text-yellow-400');
        btn.classList.add('hover:bg-slate-700');
    });
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-slate-900', 'text-yellow-400');
        activeBtn.classList.remove('hover:bg-slate-700');
    }

    // 特定页面的初始化逻辑
    if (tabId === 'inbound') initInboundPage();
    if (tabId === 'outbound') initOutboundPage();
    if (tabId === 'inventory') renderInventoryTable();
    if (tabId === 'history') renderHistoryTable();
    if (tabId === 'products') renderProductList();
    if (tabId === 'transfer') initTransferPage();
    if (tabId === 'dashboard') updateDashboard();
}

// =======================
// Dashboard 逻辑
// =======================
function updateDashboard() {
    const totalStock = products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
    const warehouseStock = products.reduce((acc, p) => acc + Number(p.stock_warehouse || 0), 0);
    const storeStock = products.reduce((acc, p) => acc + Number(p.stock_store || 0), 0);

    document.getElementById('stat-total-stock').innerText = totalStock;
    document.getElementById('stat-warehouse-stock').innerText = warehouseStock;
    document.getElementById('stat-store-stock').innerText = storeStock;
    
    document.getElementById('stat-product-count').innerText = products.length;
    
    // 计算今日出入库
    const today = new Date().toISOString().split('T')[0];
    const todayRecs = history.filter(h => h.date.startsWith(today));
    
    let todayIn = 0;
    let todayOut = 0;
    
    todayRecs.forEach(rec => {
        const count = rec.items.reduce((sum, item) => sum + Number(item.quantity), 0);
        if (rec.type === 'in') todayIn += count;
        if (rec.type === 'out') todayOut += count;
    });
    
    document.getElementById('stat-today-in').innerText = todayIn;
    document.getElementById('stat-today-out').innerText = todayOut;

    // 库存预警 (总库存小于10)
    const lowStock = products.filter(p => p.stock < 10);
    const lowStockHtml = lowStock.map(p => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.model || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-bold">${p.stock}</td>
        </tr>
    `).join('');
    document.getElementById('low-stock-list').innerHTML = lowStock.length ? lowStockHtml : '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-400">无库存预警商品</td></tr>';
}

// =======================
// 商品管理逻辑
// =======================
function renderProductList() {
    const tbody = document.getElementById('product-list-body');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.model || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.specs || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.category || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">${p.unit}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">${p.stock_warehouse}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">${p.stock_store}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button onclick="editProduct('${p.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    
    modal.classList.remove('hidden');
    form.reset();
    
    if (productId) {
        const p = products.find(x => x.id === productId);
        if (p) {
            title.innerText = '编辑商品';
            document.getElementById('product-id').value = p.id;
            document.getElementById('product-name').value = p.name;
            document.getElementById('product-model').value = p.model || '';
            document.getElementById('product-specs').value = p.specs || '';
            document.getElementById('product-category').value = p.category || '';
            document.getElementById('product-unit').value = p.unit;
        }
    } else {
        title.innerText = '新增商品';
        document.getElementById('product-id').value = '';
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const model = document.getElementById('product-model').value;
    const specs = document.getElementById('product-specs').value;
    const category = document.getElementById('product-category').value;
    const unit = document.getElementById('product-unit').value;
    
    if (id) {
        // 编辑
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) {
            products[idx] = { ...products[idx], name, model, specs, category, unit, updated_at: new Date().toISOString() };
        }
    } else {
        // 新增
        const newProduct = {
            id: Date.now().toString(),
            name,
            model,
            specs,
            category,
            unit,
            stock: 0,
            stock_warehouse: 0,
            stock_store: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        products.push(newProduct);
    }
    
    saveData();
    closeProductModal();
    renderProductList();
    alert('保存成功！');
}

function deleteProduct(id) {
    if (confirm('确定要删除这个商品吗？删除后将无法恢复，且会影响历史记录显示。')) {
        products = products.filter(p => p.id !== id);
        saveData();
        renderProductList();
    }
}

// =======================
// 入库逻辑
// =======================
function initInboundPage() {
    const select = document.getElementById('inbound-product-select');
    select.innerHTML = '<option value="">-- 请选择商品 --</option>' + 
        products.map(p => `<option value="${p.id}">${p.name} (${p.model || '无型号'})</option>`).join('');
    
    document.getElementById('inbound-date').innerText = new Date().toLocaleDateString();
    renderInboundCart();
}

function updateInboundUnit() {
    const pid = document.getElementById('inbound-product-select').value;
    const p = products.find(x => x.id === pid);
    document.getElementById('inbound-unit').innerText = p ? p.unit : '单位';
}

function addInboundItem(e) {
    e.preventDefault();
    const pid = document.getElementById('inbound-product-select').value;
    const qty = Number(document.getElementById('inbound-quantity').value);
    const remark = document.getElementById('inbound-remark').value;
    const location = document.getElementById('inbound-location').value;
    
    if (!pid || qty <= 0) return;
    
    const product = products.find(p => p.id === pid);
    
    inboundCart.push({
        productId: pid,
        productName: product.name,
        model: product.model,
        specs: product.specs,
        unit: product.unit,
        quantity: qty,
        remark: remark,
        location: location,
        locationName: location === 'warehouse' ? '主仓库' : '销售门店'
    });
    
    document.getElementById('inbound-form').reset();
    document.getElementById('inbound-location').value = location; // 保持上次选择的位置
    document.getElementById('inbound-unit').innerText = '单位';
    renderInboundCart();
}

function renderInboundCart() {
    const tbody = document.getElementById('inbound-list');
    if (inboundCart.length === 0) {
        tbody.innerHTML = '<tr id="inbound-empty-row"><td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无待入库商品</td></tr>';
        return;
    }
    
    tbody.innerHTML = inboundCart.map((item, index) => `
        <tr>
            <td class="px-4 py-2 text-sm text-gray-900">
                ${item.productName}
                <div class="text-xs text-gray-500">型号:${item.model || '-'} | 规格:${item.specs || '-'}</div>
            </td>
            <td class="px-4 py-2 text-center text-sm text-gray-500">${item.locationName}</td>
            <td class="px-4 py-2 text-right text-sm text-gray-900 font-bold">${item.quantity} ${item.unit}</td>
            <td class="px-4 py-2 text-sm text-gray-500">${item.remark || '-'}</td>
            <td class="px-4 py-2 text-center">
                <button onclick="removeInboundItem(${index})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-xmark"></i></button>
            </td>
        </tr>
    `).join('');
}

function removeInboundItem(index) {
    inboundCart.splice(index, 1);
    renderInboundCart();
}

function clearInboundList() {
    inboundCart = [];
    renderInboundCart();
}

function submitInbound() {
    if (inboundCart.length === 0) {
        alert('请先添加商品到入库清单');
        return;
    }
    
    if (!confirm('确认入库这些商品吗？')) return;
    
    const orderId = 'IN-' + Date.now();
    const now = new Date();
    
    // 更新库存
    inboundCart.forEach(item => {
        const p = products.find(x => x.id === item.productId);
        if (p) {
            if (item.location === 'warehouse') {
                p.stock_warehouse = Number(p.stock_warehouse || 0) + Number(item.quantity);
            } else if (item.location === 'store') {
                p.stock_store = Number(p.stock_store || 0) + Number(item.quantity);
            }
            p.updated_at = now.toISOString();
        }
    });
    
    // 记录历史
    const record = {
        id: orderId,
        type: 'in',
        date: now.toISOString(),
        items: [...inboundCart],
        customer: '', // 入库一般无客户，或者是供应商
        remark: '批量入库',
        totalItems: inboundCart.length
    };
    history.unshift(record);
    
    saveData();
    
    // 打印
    printOrder(record, '入库单');
    
    // 清理
    clearInboundList();
    alert('入库成功！');
}

// =======================
// 出库逻辑
// =======================
function initOutboundPage() {
    const select = document.getElementById('outbound-product-select');
    select.innerHTML = '<option value="">-- 请选择商品 --</option>' + 
        products.map(p => `<option value="${p.id}">${p.name} (${p.model || '无型号'})</option>`).join('');
    
    document.getElementById('outbound-date').innerText = new Date().toLocaleDateString();
    renderOutboundCart();
}

function updateOutboundUnit() {
    const pid = document.getElementById('outbound-product-select').value;
    const location = document.getElementById('outbound-location').value;
    const p = products.find(x => x.id === pid);
    
    if (p) {
        let currentStock = 0;
        if (location === 'warehouse') currentStock = p.stock_warehouse;
        if (location === 'store') currentStock = p.stock_store;
        
        document.getElementById('outbound-unit').innerText = p.unit;
        document.getElementById('outbound-stock-hint').innerText = `当前库存 (${location === 'warehouse' ? '仓' : '店'}): ${currentStock} ${p.unit}`;
        document.getElementById('outbound-quantity').max = currentStock;
    } else {
        document.getElementById('outbound-unit').innerText = '单位';
        document.getElementById('outbound-stock-hint').innerText = '当前库存: -';
    }
}

function addOutboundItem(e) {
    e.preventDefault();
    const pid = document.getElementById('outbound-product-select').value;
    const qty = Number(document.getElementById('outbound-quantity').value);
    const customer = document.getElementById('outbound-customer').value;
    const remark = document.getElementById('outbound-remark').value;
    const location = document.getElementById('outbound-location').value;
    
    if (!pid || qty <= 0) return;
    
    const product = products.find(p => p.id === pid);
    let currentStock = 0;
    if (location === 'warehouse') currentStock = product.stock_warehouse;
    if (location === 'store') currentStock = product.stock_store;
    
    // 检查库存
    if (currentStock < qty) {
        alert(`库存不足！当前位置库存仅剩 ${currentStock} ${product.unit}`);
        return;
    }
    
    outboundCart.push({
        productId: pid,
        productName: product.name,
        model: product.model,
        specs: product.specs,
        unit: product.unit,
        quantity: qty,
        customer: customer,
        remark: remark,
        location: location,
        locationName: location === 'warehouse' ? '主仓库' : '销售门店'
    });
    
    document.getElementById('outbound-form').reset();
    document.getElementById('outbound-location').value = location; // 保持位置选择
    document.getElementById('outbound-unit').innerText = '单位';
    document.getElementById('outbound-stock-hint').innerText = '当前库存: -';
    renderOutboundCart();
}

function renderOutboundCart() {
    const tbody = document.getElementById('outbound-list');
    if (outboundCart.length === 0) {
        tbody.innerHTML = '<tr id="outbound-empty-row"><td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无待出库商品</td></tr>';
        return;
    }
    
    tbody.innerHTML = outboundCart.map((item, index) => `
        <tr>
            <td class="px-4 py-2 text-sm text-gray-900">
                ${item.productName}
                <div class="text-xs text-gray-500">型号:${item.model || '-'} | 规格:${item.specs || '-'}</div>
            </td>
            <td class="px-4 py-2 text-center text-sm text-gray-500">${item.locationName}</td>
            <td class="px-4 py-2 text-right text-sm text-gray-900 font-bold">${item.quantity} ${item.unit}</td>
            <td class="px-4 py-2 text-sm text-gray-500">${item.customer ? '客户:' + item.customer : ''} ${item.remark || ''}</td>
            <td class="px-4 py-2 text-center">
                <button onclick="removeOutboundItem(${index})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-xmark"></i></button>
            </td>
        </tr>
    `).join('');
}

function removeOutboundItem(index) {
    outboundCart.splice(index, 1);
    renderOutboundCart();
}

function clearOutboundList() {
    outboundCart = [];
    renderOutboundCart();
}

function submitOutbound() {
    if (outboundCart.length === 0) {
        alert('请先添加商品到出库清单');
        return;
    }
    
    if (!confirm('确认出库这些商品吗？')) return;
    
    // 再次检查分库库存 (防止多次添加同一商品导致超卖)
    // key: productId_location
    const stockCheck = {};
    for (let item of outboundCart) {
        const key = `${item.productId}_${item.location}`;
        if (!stockCheck[key]) stockCheck[key] = 0;
        stockCheck[key] += item.quantity;
    }
    
    for (let key in stockCheck) {
        const [pid, loc] = key.split('_');
        const p = products.find(x => x.id === pid);
        let currentStock = loc === 'warehouse' ? p.stock_warehouse : p.stock_store;
        
        if (currentStock < stockCheck[key]) {
            alert(`商品 ${p.name} 在 ${loc === 'warehouse' ? '主仓库' : '销售门店'} 库存不足！总需求 ${stockCheck[key]}, 当前库存 ${currentStock}`);
            return;
        }
    }
    
    const orderId = 'OUT-' + Date.now();
    const now = new Date();
    
    // 更新库存
    outboundCart.forEach(item => {
        const p = products.find(x => x.id === item.productId);
        if (p) {
            if (item.location === 'warehouse') {
                p.stock_warehouse = Number(p.stock_warehouse) - Number(item.quantity);
            } else if (item.location === 'store') {
                p.stock_store = Number(p.stock_store) - Number(item.quantity);
            }
            p.updated_at = now.toISOString();
        }
    });
    
    // 记录历史
    const customers = [...new Set(outboundCart.map(i => i.customer).filter(Boolean))].join(', ');
    
    const record = {
        id: orderId,
        type: 'out',
        date: now.toISOString(),
        items: [...outboundCart],
        customer: customers,
        remark: '批量出库',
        totalItems: outboundCart.length
    };
    history.unshift(record);
    
    saveData();
    
    // 打印
    printOrder(record, '出库单');
    
    // 清理
    clearOutboundList();
    alert('出库成功！');
}

// =======================
// 库存查询逻辑
// =======================
function renderInventoryTable() {
    const keyword = document.getElementById('inventory-search').value.toLowerCase();
    const tbody = document.getElementById('inventory-table-body');
    
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        (p.model && p.model.toLowerCase().includes(keyword)) ||
        (p.specs && p.specs.toLowerCase().includes(keyword)) ||
        (p.category && p.category.toLowerCase().includes(keyword))
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-gray-400">无匹配商品</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map((p, index) => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.model || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.specs || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.category || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">${p.stock_warehouse}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">${p.stock_store}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${Number(p.stock) < 10 ? 'text-red-600' : 'text-gray-900'}">${p.stock}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">${p.unit}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">${new Date(p.updated_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// =======================
// 历史记录逻辑
// =======================
function renderHistoryTable() {
    const filterType = document.getElementById('history-filter-type').value;
    const keyword = document.getElementById('history-search').value.toLowerCase();
    const tbody = document.getElementById('history-table-body');
    
    let filtered = history.filter(h => {
        if (filterType !== 'all' && h.type !== filterType) return false;
        
        // 搜索匹配：ID、客户、备注、或包含的商品名
        const basicMatch = h.id.toLowerCase().includes(keyword) || 
                          (h.customer && h.customer.toLowerCase().includes(keyword)) ||
                          (h.remark && h.remark.toLowerCase().includes(keyword));
        
        if (basicMatch) return true;
        
        // 搜索包含的商品
        return h.items.some(item => item.productName.toLowerCase().includes(keyword));
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-400">无历史记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(h => {
        let typeBadge = '';
        let locationInfo = '';
        
        if (h.type === 'in') {
            typeBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">入库</span>';
            // 检查是否有位置信息 (旧数据可能没有)
            const locs = [...new Set(h.items.map(i => i.locationName || (i.location === 'warehouse' ? '主仓库' : (i.location === 'store' ? '销售门店' : '-'))))];
            locationInfo = locs.join(', ');
        } else if (h.type === 'out') {
            typeBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">出库</span>';
            const locs = [...new Set(h.items.map(i => i.locationName || (i.location === 'warehouse' ? '主仓库' : (i.location === 'store' ? '销售门店' : '-'))))];
            locationInfo = locs.join(', ');
        } else if (h.type === 'transfer') {
            typeBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">调拨</span>';
            locationInfo = h.transferFrom === 'warehouse' ? '主仓库 → 销售门店' : '销售门店 → 主仓库';
        }
            
        // 简略显示商品信息
        const itemsSummary = h.items.map(i => `${i.productName} x${i.quantity}`).join(', ');
        const displayItems = itemsSummary.length > 30 ? itemsSummary.substring(0, 30) + '...' : itemsSummary;
        
        return `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="viewHistoryDetail('${h.id}')">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(h.date).toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center">${typeBadge}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${locationInfo}</td>
            <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title="${itemsSummary}">${displayItems}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-bold">${h.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${h.customer || h.remark || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button onclick="event.stopPropagation(); printHistoryItem('${h.id}')" class="text-blue-600 hover:text-blue-900"><i class="fa-solid fa-print"></i></button>
            </td>
        </tr>
    `}).join('');
}

function printHistoryItem(id) {
    const rec = history.find(h => h.id === id);
    if (rec) {
        let title = '单据';
        if (rec.type === 'in') title = '入库单 (补打)';
        if (rec.type === 'out') title = '出库单 (补打)';
        if (rec.type === 'transfer') title = '调拨单 (补打)';
        printOrder(rec, title);
    }
}

function viewHistoryDetail(id) {
    // 简单的详情查看，复用打印预览
    printHistoryItem(id);
}

// =======================
// 调拨逻辑
// =======================
function initTransferPage() {
    const select = document.getElementById('transfer-product-select');
    select.innerHTML = '<option value="">-- 请选择商品 --</option>' + 
        products.map(p => `<option value="${p.id}">${p.name} (${p.model || '无型号'})</option>`).join('');
    
    document.getElementById('transfer-date').innerText = new Date().toLocaleDateString();
    
    // 初始化方向 (默认: 仓库 -> 门店)
    document.getElementById('transfer-from').value = 'warehouse';
    updateTransferDirection();
    
    renderTransferCart();
}

function updateTransferDirection() {
    const from = document.getElementById('transfer-from').value;
    const toSelect = document.getElementById('transfer-to');
    
    if (from === 'warehouse') {
        toSelect.value = 'store';
    } else {
        toSelect.value = 'warehouse';
    }
    
    // 更新库存提示
    updateTransferUnit();
}

function updateTransferUnit() {
    const pid = document.getElementById('transfer-product-select').value;
    const from = document.getElementById('transfer-from').value;
    const p = products.find(x => x.id === pid);
    
    if (p) {
        let currentStock = from === 'warehouse' ? p.stock_warehouse : p.stock_store;
        
        document.getElementById('transfer-unit').innerText = p.unit;
        document.getElementById('transfer-stock-hint').innerText = `当前可调拨库存: ${currentStock} ${p.unit}`;
        document.getElementById('transfer-quantity').max = currentStock;
    } else {
        document.getElementById('transfer-unit').innerText = '单位';
        document.getElementById('transfer-stock-hint').innerText = '当前可调拨库存: -';
    }
}

function addTransferItem(e) {
    e.preventDefault();
    const pid = document.getElementById('transfer-product-select').value;
    const qty = Number(document.getElementById('transfer-quantity').value);
    const remark = document.getElementById('transfer-remark').value;
    const from = document.getElementById('transfer-from').value;
    const to = document.getElementById('transfer-to').value;
    
    if (!pid || qty <= 0) return;
    
    const product = products.find(p => p.id === pid);
    let currentStock = from === 'warehouse' ? product.stock_warehouse : product.stock_store;
    
    if (currentStock < qty) {
        alert(`可调拨库存不足！仅剩 ${currentStock} ${product.unit}`);
        return;
    }
    
    transferCart.push({
        productId: pid,
        productName: product.name,
        model: product.model,
        unit: product.unit,
        quantity: qty,
        remark: remark,
        from: from,
        to: to,
        fromName: from === 'warehouse' ? '主仓库' : '销售门店',
        toName: to === 'warehouse' ? '主仓库' : '销售门店'
    });
    
    document.getElementById('transfer-form').reset();
    document.getElementById('transfer-from').value = from; // 保持方向
    updateTransferDirection(); // 重新设置 to 和库存提示
    
    renderTransferCart();
}

function renderTransferCart() {
    const tbody = document.getElementById('transfer-list');
    if (transferCart.length === 0) {
        tbody.innerHTML = '<tr id="transfer-empty-row"><td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无待调拨商品</td></tr>';
        return;
    }
    
    tbody.innerHTML = transferCart.map((item, index) => `
        <tr>
            <td class="px-4 py-2 text-sm text-gray-900">
                <span class="text-xs bg-gray-100 px-2 py-1 rounded">${item.fromName} <i class="fa-solid fa-arrow-right mx-1 text-gray-400"></i> ${item.toName}</span>
            </td>
            <td class="px-4 py-2 text-sm text-gray-900">${item.productName} <span class="text-xs text-gray-500">(${item.model || '-'})</span></td>
            <td class="px-4 py-2 text-right text-sm text-gray-900 font-bold">${item.quantity} ${item.unit}</td>
            <td class="px-4 py-2 text-sm text-gray-500">${item.remark || '-'}</td>
            <td class="px-4 py-2 text-center">
                <button onclick="removeTransferItem(${index})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-xmark"></i></button>
            </td>
        </tr>
    `).join('');
}

function removeTransferItem(index) {
    transferCart.splice(index, 1);
    renderTransferCart();
}

function clearTransferList() {
    transferCart = [];
    renderTransferCart();
}

function submitTransfer() {
    if (transferCart.length === 0) {
        alert('请先添加商品到调拨清单');
        return;
    }
    
    if (!confirm('确认调拨这些商品吗？')) return;
    
    // 检查库存 (防止多次添加导致超卖)
    const stockCheck = {}; // key: productId_fromLocation
    for (let item of transferCart) {
        const key = `${item.productId}_${item.from}`;
        if (!stockCheck[key]) stockCheck[key] = 0;
        stockCheck[key] += item.quantity;
    }
    
    for (let key in stockCheck) {
        const [pid, fromLoc] = key.split('_');
        const p = products.find(x => x.id === pid);
        let currentStock = fromLoc === 'warehouse' ? p.stock_warehouse : p.stock_store;
        
        if (currentStock < stockCheck[key]) {
            alert(`商品 ${p.name} 在 ${fromLoc === 'warehouse' ? '主仓库' : '销售门店'} 库存不足以支持所有调拨请求！`);
            return;
        }
    }
    
    const orderId = 'TR-' + Date.now();
    const now = new Date();
    
    // 更新库存
    transferCart.forEach(item => {
        const p = products.find(x => x.id === item.productId);
        if (p) {
            if (item.from === 'warehouse') {
                p.stock_warehouse -= Number(item.quantity);
                p.stock_store = Number(p.stock_store) + Number(item.quantity);
            } else {
                p.stock_store -= Number(item.quantity);
                p.stock_warehouse = Number(p.stock_warehouse) + Number(item.quantity);
            }
            p.updated_at = now.toISOString();
        }
    });
    
    // 记录历史
    // 假设一次提交通常是同一方向，或者混合。为了记录方便，如果方向统一，记录在 transferFrom/To
    const firstItem = transferCart[0];
    const isSameDirection = transferCart.every(i => i.from === firstItem.from && i.to === firstItem.to);
    
    const record = {
        id: orderId,
        type: 'transfer',
        date: now.toISOString(),
        items: [...transferCart],
        transferFrom: isSameDirection ? firstItem.from : 'mixed',
        transferTo: isSameDirection ? firstItem.to : 'mixed',
        remark: '库存调拨',
        totalItems: transferCart.length
    };
    history.unshift(record);
    
    saveData();
    
    // 打印
    printOrder(record, '调拨单');
    
    // 清理
    clearTransferList();
    alert('调拨成功！');
}

// =======================
// 打印逻辑
// =======================
function printOrder(record, title) {
    document.getElementById('print-title').innerText = title;
    document.getElementById('print-date').innerText = '日期: ' + new Date(record.date).toLocaleDateString();
    document.getElementById('print-no').innerText = '单号: ' + record.id;
    
    const tbody = document.getElementById('print-list');
    tbody.innerHTML = record.items.map(item => `
        <tr>
            <td class="border border-gray-400 p-2 text-left">${item.productName}</td>
            <td class="border border-gray-400 p-2 text-left">${item.model || ''}</td>
            <td class="border border-gray-400 p-2 text-left">${item.specs || ''}</td>
            <td class="border border-gray-400 p-2 text-right">${item.quantity}</td>
            <td class="border border-gray-400 p-2 text-center">${item.unit}</td>
            <td class="border border-gray-400 p-2 text-left">${item.remark || item.customer || ''}</td>
        </tr>
    `).join('');
    
    // 延迟一点以确保 DOM 更新
    setTimeout(() => {
        window.print();
    }, 200);
}

// =======================
// 数据导出导入
// =======================
function exportToExcel() {
    if (products.length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    // 准备数据
    const data = products.map(p => ({
        '商品名称': p.name,
        '型号': p.model,
        '规格': p.specs,
        '类别': p.category,
        '单位': p.unit,
        '仓库库存': p.stock_warehouse,
        '门店库存': p.stock_store,
        '总库存': p.stock,
        '创建时间': new Date(p.created_at).toLocaleString(),
        '最后更新': new Date(p.updated_at).toLocaleString()
    }));
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 设置列宽
    const wscols = [
        {wch: 20}, {wch: 15}, {wch: 15}, {wch: 10}, {wch: 8}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 20}, {wch: 20}
    ];
    ws['!cols'] = wscols;
    
    XLSX.utils.book_append_sheet(wb, ws, "库存数据");
    
    // 导出文件
    const filename = `库存导出_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

function exportJSON() {
    const data = {
        products: products,
        history: history,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    if (!file) {
        alert('请先选择备份文件 (.json)');
        return;
    }
    
    if (!confirm('警告：导入将覆盖当前所有数据！确定继续吗？')) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.products && data.history) {
                products = data.products;
                history = data.history;
                saveData();
                alert('数据恢复成功！页面将刷新。');
                location.reload();
            } else {
                alert('无效的备份文件格式。');
            }
        } catch (err) {
            alert('读取文件失败: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('严重警告：此操作将永久删除所有商品和历史记录！请输入 "DELETE" 确认：') && prompt('请输入 "DELETE"') === 'DELETE') {
        products = [];
        history = [];
        localStorage.clear();
        location.reload();
    }
}

function editProduct(id) {
    openProductModal(id);
}
