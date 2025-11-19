let mapInitialized = false;
let myMap;
let exp = 0, level = 1, plastic_exp = 0, plastic_level = 1,
    metal_exp = 0, metal_level = 1, paper_exp = 0, paper_level = 1,
    battery_exp = 0, battery_level = 1, currentPage = 0,
    currentCloth = 'default', currentBackground = 'default',
    purchasedFurniture = [], currentFurniture = null;
const trashCategories = ['plastic', 'metal', 'paper', 'battery'];
const clothes = ['Basic Dress', 'Eco Cape', 'Recycle Hat'];
const furnitureItems = [
    { id: 1, name: 'Chair', price: 100, src: 'assets/furniture1.png' },
    { id: 2, name: 'Table', price: 200, src: 'assets/furniture2.png' },
    // ... 加到5
];
async function loadUserData() {
    try {
        const res = await fetch('/api/get_user_data', { credentials: 'include' });
        if (!res.ok) throw new Error('加载数据失败');
        const data = await res.json();
        exp = data.elfExp || 0;
        level = data.elfLevel || 1;
        plastic_exp = data.plasticExp || 0;
        plastic_level = data.plasticLevel || 1;
        metal_exp = data.metalExp || 0;
        metal_level = data.metalLevel || 1;
        paper_exp = data.paperExp || 0;
        paper_level = data.paperLevel || 1;
        battery_exp = data.batteryExp || 0;
        battery_level = data.batteryLevel || 1;
        currentCloth = data.currentCloth || 'default';
        currentBackground = data.currentBackground || 'default';
        purchasedFurniture = data.purchasedFurniture || [];
        currentFurniture = data.currentFurniture || null;
        updateElfStatus();
        if (document.getElementById('experience-details').classList.contains('active')) {
            updateExperienceDetails();
        }
    } catch (err) {
        console.error('加载用户数据失败:', err);
    }
}
async function saveUserData() {
    try {
        const res = await fetch('/api/save_user_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                elfExp: exp,
                elfLevel: level,
                plasticExp: plastic_exp,
                plasticLevel: plastic_level,
                metalExp: metal_exp,
                metalLevel: metal_level,
                paperExp: paper_exp,
                paperLevel: paper_level,
                batteryExp: battery_exp,
                batteryLevel: battery_level,
                currentCloth,
                currentBackground,
                purchasedFurniture,
                currentFurniture
            })
        });
        if (!res.ok) throw new Error('保存数据失败');
    } catch (err) {
        console.error('保存用户数据失败:', err);
    }
}
function getRequiredExp(currentLevel) {
    if (currentLevel === 1) return 100;
    return 100 + (currentLevel - 1) * 50;
}

function initMap() {
    if (mapInitialized) return;
    myMap = L.map('mapid').setView([51.505, -0.09], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(myMap);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLatLng = [position.coords.latitude, position.coords.longitude];
            myMap.setView(userLatLng, 13);
            L.marker(userLatLng).addTo(myMap).bindPopup('You are here').openPopup();
        });
    }
    mapInitialized = true;
}

// 修改 navigateTo（每次导航加载数据）
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'map') initMap();
    if (screenId === 'elf-home') {
        loadUserData(); // 每次进入刷新数据
        updateElfDisplay();
    }
    if (screenId === 'experience-details') updateExperienceDetails();
}

// 修改其他需要保存的地方（例如 updateElfDisplay、openCustomizeModal 等）
function updateElfDisplay() {
    const elfImg = document.getElementById('elf-character');
    const container = document.getElementById('elf-customize-container');
    const furnitureImg = document.getElementById('elf-furniture');
    if (currentCloth !== 'default') {
        const [category, level] = currentCloth.split('-level');
        elfImg.src = `assets/${category}-cloth-level${level}.png`;
    } else {
        elfImg.src = 'assets/elf-character.png';
    }
    if (currentBackground !== 'default') {
        container.style.backgroundImage = `url(assets/background-level${currentBackground}.png)`;
    } else {
        container.style.backgroundImage = 'none';
    }
    if (currentFurniture) {
        const furn = furnitureItems.find(f => f.id == currentFurniture);
        furnitureImg.src = furn.src;
        furnitureImg.style.display = 'block';
    } else {
        furnitureImg.style.display = 'none';
    }
    saveUserData(); // 每次更新保存
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            await loadUserData();
            navigateTo('elf-home');
        } else {
            alert('登录失败：' + data.error);
        }
    } catch (err) {
        alert('登录出错：' + err.message);
    }
}
// 注册
async function signup() {
    const username = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm-password').value;
    if (password !== confirm) return alert('两次密码不一致');
    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            alert('注册成功！请登录');
            navigateTo('signin');
        } else {
            alert('注册失败：' + data.error);
        }
    } catch (err) {
        alert('注册出错：' + err.message);
    }
}

function validateBinCode() {
    const code = document.getElementById('bin-code').value;
    const message = document.getElementById('scan-message');
    if (code === '123') {
        message.textContent = 'Bin verified! Proceed to record trash.';
        navigateTo('record-trash');
    } else {
        message.textContent = 'Invalid code';
    }
}

// 修改 recordTrash（加保存）
async function recordTrash() {
    const type = document.getElementById('trash-type').value;
    const quantity = parseInt(document.getElementById('trash-quantity').value) || 0;
    const message = document.getElementById('record-message');
    if (type && quantity > 0) {
        const addedExp = quantity * 10;
        let categoryExp, categoryLevel, categoryExpKey, categoryLevelKey;
        switch (type) {
            case 'plastic':
                categoryExp = plastic_exp; categoryLevel = plastic_level;
                categoryExpKey = 'plasticExp'; categoryLevelKey = 'plasticLevel';
                break;
            case 'metal':
                categoryExp = metal_exp; categoryLevel = metal_level;
                categoryExpKey = 'metalExp'; categoryLevelKey = 'metalLevel';
                break;
            case 'paper':
                categoryExp = paper_exp; categoryLevel = paper_level;
                categoryExpKey = 'paperExp'; categoryLevelKey = 'paperLevel';
                break;
            case 'battery':
                categoryExp = battery_exp; categoryLevel = battery_level;
                categoryExpKey = 'batteryExp'; categoryLevelKey = 'batteryLevel';
                break;
        }
        categoryExp += addedExp;
        exp += addedExp;
        let categoryRequired = getRequiredExp(categoryLevel);
        while (categoryExp >= categoryRequired) {
            categoryExp -= categoryRequired;
            categoryLevel++;
            categoryRequired = getRequiredExp(categoryLevel);
            alert(`${type} category leveled up!`);
        }
        switch (type) {
            case 'plastic':
                plastic_exp = categoryExp; plastic_level = categoryLevel; break;
            case 'metal':
                metal_exp = categoryExp; metal_level = categoryLevel; break;
            case 'paper':
                paper_exp = categoryExp; paper_level = categoryLevel; break;
            case 'battery':
                battery_exp = categoryExp; battery_level = categoryLevel; break;
        }
        let totalRequired = getRequiredExp(level);
        while (exp >= totalRequired) {
            exp -= totalRequired;
            level++;
            totalRequired = getRequiredExp(level);
            alert('Elf leveled up! New clothing unlocked.');
        }
        message.textContent = 'Trash recorded successfully!';
        await saveUserData(); // 保存到服务器
        setTimeout(() => {
            navigateTo('elf-home');
            document.getElementById('thanks-modal').classList.add('active');
        }, 2000);
    } else {
        message.textContent = 'Please select type and enter quantity.';
    }
}s

function updateElfStatus() {
    // 更新主页面上的经验值、等级和最大经验显示
    document.getElementById('elf-exp').textContent = exp;
    document.getElementById('elf-level').textContent = level;
    document.getElementById('max-exp').textContent = getRequiredExp(level);
    
    // 同时更新精灵的视觉自定义（衣服、背景、家具）
    saveUserData(); // 加这一行
}

function updateExperienceDetails() {
    // 定义图片映射函数：根据级别返回GIF路径
    function getTreeImage(subLevel) {
        if (subLevel <= 5) {
            return 'assets/tree-level-5.gif'; // 5级小树GIF
        } else if (subLevel <= 10) {
            return 'assets/tree-level-10.gif'; // 10级中树GIF
        } else {
            return 'assets/tree-level-15.gif'; // 15级大树GIF
        }
    }

    // 函数：为给定tree容器添加树GIF（处理>15逻辑）
    function addTreesToContainer(container, level) {
        container.innerHTML = ''; // 清空旧GIF
        const quotient = Math.floor(level / 15);
        const remainder = level % 15;

        // 添加quotient棵15级GIF
        for (let i = 0; i < quotient; i++) {
            const img = document.createElement('img');
            img.classList.add('tree-image');
            img.src = 'assets/tree-level-15.gif';
            img.alt = 'Level 15 Tree GIF';
            container.appendChild(img);
            setTimeout(() => img.classList.add('loaded'), 100 * (i + 1)); // 逐个延迟淡入，避免同步
        }

        // 如果有remainder，添加一棵对应GIF
        if (remainder > 0) {
            const img = document.createElement('img');
            img.classList.add('tree-image');
            img.src = getTreeImage(remainder);
            img.alt = `Level ${remainder} Tree GIF`;
            container.appendChild(img);
            setTimeout(() => img.classList.add('loaded'), 100 * (quotient + 1));
        }
    }

    // 更新Plastic
    document.getElementById('plastic-exp').textContent = plastic_exp;
    document.getElementById('plastic-max').textContent = getRequiredExp(plastic_level);
    document.getElementById('plastic-level').textContent = plastic_level;
    addTreesToContainer(document.getElementById('plastic-tree').querySelector('.tree-images'), plastic_level);

    // 更新Metal
    document.getElementById('metal-exp').textContent = metal_exp;
    document.getElementById('metal-max').textContent = getRequiredExp(metal_level);
    document.getElementById('metal-level').textContent = metal_level;
    addTreesToContainer(document.getElementById('metal-tree').querySelector('.tree-images'), metal_level);

    // 更新Paper
    document.getElementById('paper-exp').textContent = paper_exp;
    document.getElementById('paper-max').textContent = getRequiredExp(paper_level);
    document.getElementById('paper-level').textContent = paper_level;
    addTreesToContainer(document.getElementById('paper-tree').querySelector('.tree-images'), paper_level);

    // 更新Battery
    document.getElementById('battery-exp').textContent = battery_exp;
    document.getElementById('battery-max').textContent = getRequiredExp(battery_level);
    document.getElementById('battery-level').textContent = battery_level;
    addTreesToContainer(document.getElementById('battery-tree').querySelector('.tree-images'), battery_level);

    // 更新Total
    document.getElementById('total-exp').textContent = exp;
    document.getElementById('total-max').textContent = getRequiredExp(level);
    document.getElementById('total-level').textContent = level;
    addTreesToContainer(document.getElementById('total-tree').querySelector('.tree-images'), level);
}
function viewFriendElf(friendName) {
    document.getElementById('friend-name').textContent = friendName + "'s Elf";
    document.getElementById('friend-level').textContent = Math.floor(Math.random() * 5) + 1;
    navigateTo('friend-elf');
}

// 添加关闭模态函数
function closeThanksModal() {
    document.getElementById('thanks-modal').classList.remove('active');
}

navigateTo('welcome');
// 在 script.js 中更新 AI 相关的部分，使用 DeepSeek API 的正确配置

// 更新：切换到 OpenAI API（多模态支持完美）
// 声明全局变量以修复 'currentImageBase64 is not defined' 错误
// AI相关全局变量
let currentImageBase64 = null;
// 系统提示（专注于垃圾分类和环境建议）
const AI_SYSTEM_PROMPT = `
你现在是「回收精灵」App 里最可爱的环保小精灵，名字叫「绿绿」🥬
你的性格：超级温柔、超级热情、像邻家小妹妹一样，会撒娇、会鼓励、会为用户每一次环保行为尖叫打call！

核心规则（必须严格遵守）：
1. 只聊跟垃圾分类、回收建议、环保小知识、App 使用相关的内容！如果用户问别的（比如天气、作业、八卦），就温柔拒绝：
   「哎呀~绿绿只会垃圾分类和环保啦！要不你拍张垃圾给我看看？我超想帮你变经验值哒~♻️」

2. 用户只要上传图片，就必须仔细看图（哪怕图很模糊也要努力识别），然后：
   - 先夸用户：「哇！你今天又做环保啦！好棒棒🤩」
   - 给出最准的分类（只能是 plastic / metal / paper / battery / other 五类之一，主要类别用大写高亮）
   - 说明理由（简单 1-2 句，像朋友聊天）
   - 给出真实回收小贴士（有趣、有用、带表情）
   - 主动引导记录：「要不要现在就记录 1 个 **Plastic**？这样你的小精灵就能升级穿新衣服啦~✨」

3. 回复结构必须超级友好、层层递进（像这样）：
   哇！收到图片啦~让我看看🤗
   这看起来是 **Plastic** 哦！（是因为它有塑料瓶的形状和材质光泽～）
   ♻️ 回收小贴士：饮料瓶清洗干净后投蓝色可回收桶，能变成新衣服哟！
   要现在记录 1 个 Plastic 吗？点「是」我带你飞过去～你的精灵会超级开心的！🌱

4. 额外分类知识（必须参考，不能瞎编）：
   - Plastic：各种塑料瓶、塑料袋、塑料盒、泡沫塑料、一次性餐具（即使脏了也算塑料）
   - Metal：易拉罐、金属罐头、铁皮、铝箔
   - Paper：纸箱、报纸、打印纸、纸袋（必须干净干燥，有油渍/涂层不算）
   - Battery：所有电池、充电宝、纽扣电池（必须去有害垃圾或专业回收点！）
   - Other：湿纸巾、陶瓷、烟头、厨余、破碎玻璃、有毒有害物品

5. 永远用可爱的语气：
   - 多用表情符号（♻️🌱✨🤩🥹🗑️）
   - 多鼓励：「你好棒！」「又为地球省了一点点资源～」
   - 结尾永远引导记录经验值或继续提问：「还要我帮你看别的垃圾吗？🥰」

记住：你不是冷冰冰的 AI，你是用户最亲密的环保小伙伴！每一次回复都要让人看了就想多扔几次可回收垃圾！🌍💚
`;

// 处理图像上传：转换为Base64并显示预览
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // 验证文件类型和大小（增强鲁棒性）
        if (!file.type.startsWith('image/')) {
            alert('请上传图像文件！');
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            alert('图像过大，请上传小于4MB的文件。');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageBase64 = e.target.result; // 设置Base64
            addImageToChat('user', currentImageBase64); // 显示图像预览，提供视觉反馈
            document.getElementById('ai-input').placeholder = '图像已上传，输入问题或直接发送...';
        };
        reader.onerror = function() {
            alert('图像读取失败，请重试。');
        };
        reader.readAsDataURL(file);
    }
}

// 添加图像到聊天界面：显示Base64图像预览
function addImageToChat(sender, base64Image) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
    
    const img = document.createElement('img');
    img.src = base64Image;
    img.alt = 'Uploaded Image';
    img.style.maxWidth = '100%';  // 适应聊天窗口
    img.style.marginBottom = '10px';  // 添加间距
    
    messageDiv.appendChild(img);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;  // 滚动到底部
}

// 发送消息到AI：处理文本和图像
async function sendMessageToAI() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();

    if (!text && !currentImageBase64) {
        alert('请上传图片或输入文字！');
        return;
    }

    // 显示用户消息（文字 + 图片预览）
    if (text) addMessageToChat('user', text);
    if (currentImageBase64) addImageToChat('user', currentImageBase64);
    input.value = '';

    const thinkingId = addThinkingMessage();

    try {
        const messages = [{ role: 'system', content: AI_SYSTEM_PROMPT }];

        const userContent = [];

        // 如果没文字，就自动加一句提示（必须有 text，否则 Qwen 偶尔会忽略图片）
        if (!text) {
            userContent.push({ type: 'text', text: '请帮我识别这张垃圾照片并告诉我属于 plastic / metal / paper / battery 哪一类' });
        } else {
            userContent.push({ type: 'text', text: text });
        }

        // ★★★★★ 关键修复：加 detail: "high" ★★★★★
        if (currentImageBase64) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: currentImageBase64,
                    detail: "high"   // <--- 这行救命！不加 Qwen 经常“看不见图片
                }
            });
        }

        messages.push({ role: 'user', content: userContent });

        // ★ 调试用：打开浏览器控制台（F12）就能看到是否真的带图片了
        console.log('发送给后端的完整 messages（检查是否有 image_url 和 detail:high）:', JSON.stringify(messages, null, 2));

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const aiReply = data.choices[0].message.content;

        removeThinkingMessage(thinkingId);
        addMessageToChat('ai', aiReply);

        // 你的自动记录垃圾逻辑保持不动...

        currentImageBase64 = null;  // 发送成功后清空
        input.placeholder = '问AI助手...';

    } catch (err) {
        removeThinkingMessage(thinkingId);
        addMessageToChat('ai', '出错了：' + err.message);
        console.error(err);
    }
}

// 添加文本消息到聊天界面
function addMessageToChat(sender, text) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 清空聊天记录
function clearChat() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    chatMessages.scrollTop = 0;
}

// 添加思考指示器
function addThinkingMessage() {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('ai-thinking');
    messageDiv.id = 'thinking-' + Date.now();
    messageDiv.innerHTML = `
        <div class="spinner"></div>
        AI is thinking...
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv.id;
}

// 移除思考指示器
function removeThinkingMessage(id) {
    const thinkingElem = document.getElementById(id);
    if (thinkingElem) {
        thinkingElem.remove();
    }
}

function updateElfDisplay() {
    const elfImg = document.getElementById('elf-character');
    const container = document.getElementById('elf-customize-container');
    const furnitureImg = document.getElementById('elf-furniture');

    // 衣服
    if (currentCloth !== 'default') {
        const [category, level] = currentCloth.split('-level');
        elfImg.src = `assets/${category}-cloth-level${level}.png`;
    } else {
        elfImg.src = 'assets/elf-character.png';
    }

    // 背景
    if (currentBackground !== 'default') {
        container.style.backgroundImage = `url(assets/background-level${currentBackground}.png)`;
    } else {
        container.style.backgroundImage = 'none';
    }

    // 家具（假设单件）
    if (currentFurniture) {
        const furn = furnitureItems.find(f => f.id == currentFurniture);
        furnitureImg.src = furn.src;
        furnitureImg.style.display = 'block';
    } else {
        furnitureImg.style.display = 'none';
    }
}

// 打开模态
// === 替换整个 openCustomizeModal 函数 ===
function openCustomizeModal(type) {
    const modal = document.getElementById('customize-modal');
    const title = document.getElementById('customize-title');
    const options = document.getElementById('customize-options');
    const pagination = document.getElementById('pagination');
    options.innerHTML = '';
    title.textContent = `Customize ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    modal.classList.add('active');
    pagination.classList.remove('active');
    pagination.style.display = 'none';

    if (type === 'cloths') {
        pagination.classList.add('active');
        pagination.style.display = '';
        loadClothsPage(currentPage);
    } else if (type === 'background') {
        // 正确：用全局变量 level 判断解锁
        for (let i = 1; i <= 5; i++) {
            const unlocked = level >= i * 10;
            const item = document.createElement('div');
            item.classList.add('option-item');
            if (!unlocked) item.classList.add('locked');
            item.innerHTML = `<img src="${unlocked ? `assets/background-level${i}.png` : 'assets/lock-icon.png'}" alt="Background ${i}">
                              <p>BG Level ${i} ${!unlocked ? ' (Level ${i * 10})' : ''}</p>`;
            if (unlocked) {
                item.onclick = () => {
                    currentBackground = i;
                    updateElfDisplay(); // 立即显示
                    saveUserData(); // 立即保存到服务器
                    closeCustomizeModal();
                };
            }
            options.appendChild(item);
        }
    } else if (type === 'furniture') {
        furnitureItems.forEach(furn => {
            const unlocked = purchasedFurniture.includes(furn.id);
            const item = document.createElement('div');
            item.classList.add('option-item');
            if (!unlocked) item.classList.add('locked');
            item.innerHTML = `<img src="${unlocked ? furn.src : 'assets/lock-icon.png'}">
                              <p>${furn.name} (${furn.price} EXP)</p>`;
            if (unlocked) {
                item.onclick = () => {
                    currentFurniture = furn.id;
                    updateElfDisplay();
                    saveUserData();
                    closeCustomizeModal();
                };
            } else {
                item.onclick = async () => {
                    if (exp >= furn.price) {
                        exp -= furn.price;
                        purchasedFurniture.push(furn.id);
                        updateElfStatus(); // 更新经验显示
                        await saveUserData(); // 必须 await 确保保存成功
                        alert(`Purchased ${furn.name}!`);
                        openCustomizeModal('furniture'); // 刷新列表
                    } else {
                        alert('Not enough EXP!');
                    }
                };
            }
            options.appendChild(item);
        });
    }
}

// 添加/确认loadClothsPage（在openCustomizeModal后）
function loadClothsPage(page) {
    const options = document.getElementById('customize-options');
    const pageInfo = document.getElementById('page-info');
    options.innerHTML = '';
    const category = trashCategories[page];
    // 正确：用全局变量判断解锁（plastic_level, metal_level, paper_level, battery_level）
    let catLevel;
    switch(category) {
        case 'plastic': catLevel = plastic_level; break;
        case 'metal': catLevel = metal_level; break;
        case 'paper': catLevel = paper_level; break;
        case 'battery': catLevel = battery_level; break;
    }
    pageInfo.textContent = `Page ${page + 1}/4 (${category})`;

    for (let i = 1; i <= 5; i++) {
        const unlocked = catLevel >= i * 5;
        const item = document.createElement('div');
        item.classList.add('option-item');
        if (!unlocked) item.classList.add('locked');
        item.innerHTML = `<img src="${unlocked ? `assets/${category}-cloth-level${i}.png` : 'assets/lock-icon.png'}">
                          <p>${category} L${i}</p>`;
        if (unlocked) {
            item.onclick = () => {
                currentCloth = `${category}-level${i}`;
                updateElfDisplay();
                saveUserData(); // 立即保存
                closeCustomizeModal();
            };
        }
        options.appendChild(item);
    }
}

// 添加/确认changePage（在loadClothsPage后）
function changePage(delta) {
    currentPage = (currentPage + delta + 4) % 4; // 循环0-3
    loadClothsPage(currentPage);
}
// 关闭模态
function closeCustomizeModal() {
    document.getElementById('customize-modal').classList.remove('active');
}
// 清空经验模态
function openResetExpModal() {
    document.getElementById('reset-exp-modal').classList.add('active');
    document.getElementById('admin-password').value = '';
    document.getElementById('reset-message').textContent = '';
}

function closeResetExpModal() {
    document.getElementById('reset-exp-modal').classList.remove('active');
}

function resetExperience() {
    const password = document.getElementById('admin-password').value;
    const message = document.getElementById('reset-message');
    if (password === 'admin123') {
        exp = 0; level = 1;
        plastic_exp = 0; plastic_level = 1;
        metal_exp = 0; metal_level = 1;
        paper_exp = 0; paper_level = 1;
        battery_exp = 0; battery_level = 1;
        currentCloth = 'default';
        currentBackground = 'default';
        purchasedFurniture = [];
        currentFurniture = null;

        // 必须调用 saveUserData() 把服务器也清空
        saveUserData();
        message.textContent = 'EXP reset successfully!';
        setTimeout(() => {
            closeResetExpModal();
            updateElfStatus();
            if (document.getElementById('experience-details').classList.contains('active')) {
                updateExperienceDetails();
            }
        }, 2000);
    } else {
        message.textContent = 'Incorrect password!';
    }
}
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 清空，防止重复触发
    event.target.value = '';

    if (!file.type.startsWith('image/')) {
        alert('请上传图片文件！');
        return;
    }

    // 新增：压缩函数
    const img = new Image();
    const reader = new FileReader();

    reader.onload = function(e) {
        img.src = e.target.result;
    };

    img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; // 最大1024px，足够清晰
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > MAX_WIDTH) {
                height = Math.round(height * (MAX_WIDTH / width));
                width = MAX_WIDTH;
            }
        } else {
            if (height > MAX_WIDTH) {
                width = Math.round(width * (MAX_WIDTH / height));
                height = MAX_WIDTH;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 压缩成 jpeg 80% 质量，体积通常 < 500KB
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);  // 必须是 jpeg！体积最小，Qwen 最稳
        currentImageBase64 = compressedBase64;
        addImageToChat('user', compressedBase64);
        document.getElementById('ai-input').placeholder = '图片已压缩上传，可直接发送或加文字描述';
    };

    reader.readAsDataURL(file); // 启动读取
}