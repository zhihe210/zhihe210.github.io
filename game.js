let currentScreen = 'start'; // 当前游戏界面
let isGameOver = false; // 游戏结束标志位，防止endGame重复调用
let previousScreenBeforeSettings = 'start'; // 进入设置界面之前的屏幕
let gameMode = 'easy'; // 当前游戏难度
let canvas, ctx; // Canvas画布对象和绘图上下文
let maze; // 迷宫数据（存储迷宫的墙、通道、出口）
let player; // 玩家对象（存储位置、生命值、金币、道具等信息）
let monsters = []; // 怪物数组（每个元素是一个怪物对象，含位置、移动规则等）
let coins = []; // 金币数组（每个元素是金币的位置、分值等）
let exitPositions = []; // 出口位置数组（迷宫的通关点）
let gameStartTime; // 游戏开始的时间（用于计算时长）
let gameTimer; // 游戏计时的定时器（实时更新游戏时长）
let elapsedGameTime = 0; // 累计游戏时间
let buffs = []; // 负面效果数组
let monsterHits = 0; // 被怪物击中的次数
let buffUpdateInterval; // 负面效果的定时更新器
let isPaused = false; // 游戏暂停标记（true=暂停，false=运行）
let isFogActive = false; // 迷雾生成标记（true=生成迷雾，false=不生成迷雾）
let fogTimers = []; // 存储所有迷雾相关的定时器ID
let fogStartTime = null; // 记录迷雾开始计时的时间点
let fogElapsedTime = 0; // 已经过去的迷雾计数时间
let tempTimers = []; // 存储所有临时定时器ID，用于游戏暂停时清除
let currentQuestion = null; // 当前弹出的问题（答题解锁道具）
// 音频相关
let audioContext = null;
let music = null;
let soundEnabled = true; // 全局声音开关（兼容旧代码）
let musicEnabled = true; // 音乐开关
let soundEffectsEnabled = true; // 音效开关
let musicVolume = 0.5;
let soundEffects = {}; // 存储各种音效
let soundEffectVolume = 0.6; // 音效音量
let images = {// 图片资源
    player: null,
    monster: null,
    chest: null,
    trap: null,
    fog: null
};
let imagesLoaded = false;// 图片加载状态
let audioLoaded = false;// 音频加载状态
// ---------------------------- DOM元素 ----------------------------
let DOM;
function initDOM() { // 初始化DOM
    DOM = {
        startScreen: document.getElementById('start-screen'),
        difficultyScreen: document.getElementById('difficulty-screen'),
        gameScreen: document.getElementById('game-screen'),
        shopScreen: document.getElementById('shop-screen'),
        leaderboardScreen: document.getElementById('leaderboard-screen'),
        rankingScreen: document.getElementById('ranking-screen'),
        instructionsScreen: document.getElementById('instructions-screen'),
        banditChoiceScreen: document.getElementById('bandit-choice-screen'),
        banditOptions: document.getElementById('bandit-options'),
        questionScreen: document.getElementById('question-screen'),
        questionText: document.getElementById('question-text'),
        questionOptions: document.getElementById('question-options'),
        settingsScreen: document.getElementById('settings-screen'),
        musicToggle: document.getElementById('music-toggle'),
        soundEffectsToggle: document.getElementById('sound-effects-toggle'),
        gameTime: document.getElementById('game-time'),
        goldCount: document.getElementById('gold-count'),
        livesCount: document.getElementById('lives-count'),
        monstersCount: document.getElementById('monsters-count'),
        inventorySlots: document.getElementById('inventory-slots'),
        shopItems: document.getElementById('shop-items'),
        shopGold: document.getElementById('shop-gold'),
        matchHistoryList: document.getElementById('match-history-list'),
        easyLeaderboard: document.getElementById('easy-leaderboard'),
        hardLeaderboard: document.getElementById('hard-leaderboard'),
        messageText: document.getElementById('message-text'),
        mazeCanvas: document.getElementById('maze-canvas'),
        gameContainer: document.getElementById('game-container'),
        pauseScreen: document.getElementById('pause-screen'),
        gameOverScreen: document.getElementById('game-over-screen'),
        buffList: document.getElementById('buff-list')
    };
}
function initGame() { // 初始化游戏
    initDOM(); // 初始化DOM元素
    canvas = DOM.mazeCanvas;
    ctx = canvas.getContext('2d');
    bindEventListeners(); // 绑定事件监听器
    loadImages(); // 加载游戏图片
    loadAudio(); // 加载游戏音频
    updateDisplay(); // 更新显示
    showScreen('start'); // 显示开始界面
    // 将相关变量和函数暴露到全局作用域，以便调试
    window.currentScreen = currentScreen;
    window.gameLoopId = gameLoopId;
    window.canvas = canvas;
    window.player = player;
    window.maze = maze;
    window.handleKeyPress = handleKeyPress;
    window.handlePlayerMove = handlePlayerMove;
    window.showScreen = showScreen;
    window.startGame = startGame;
    window.pauseGame = pauseGame;
    window.resumeGame = resumeGame;
    window.toggleSound = toggleSound;
}
const CONFIG = {// 游戏配置
    easy: {
        mazeWidth: 27,
        mazeHeight: 25,
        playerLives: 5,
        initialGold: 8,
        trapsCount: 8,
        coinsCount: 6,
        monstersCount: 5,
        initialItems: 2
    },
    hard: {
        mazeWidth: 35,
        mazeHeight: 30,
        playerLives: 3,
        initialGold: 5,
        trapsCount: 8,
        coinsCount: 8,
        monstersCount: 7,
        initialItems: 1
    }
};
let traps = [];// 陷阱相关
let chests = [];// 宝箱相关
const chestTypes = [1, 2, 3, 4, 5, 6]; // 宝箱类型：增加金币概率
let inventory = [];// 道具相关
let gold = 10;
let lives = 5;
let purchasedShopItems = []; // 跟踪已购买的商店物品
let currentShopItems = []; // 当前商店的物品列表，用于保持商店内容不刷新
const ITEMS = {// 道具列表
    '炸药': { cost: 10, description: '炸开小范围墙壁并消除范围内陷阱', image: 'dynamite.png' },
    '防护盾': { cost: 8, description: '提供30防护，可抵消攻击', image: 'shield.png' },
    '定身符': { cost: 5, description: '使怪物定身3秒', image: 'freeze_talisman.png' },
    '回魂药水': { cost: 7, description: '恢复1条命', image: 'revival_potion.png' },
    '斩妖剑': { cost: 7, description: '杀死离你最近的一个怪物', image: 'monster_sword.png' },
    '牛奶': { cost: 5, description: '解除负面效果状态', image: 'milk.png' },
    '传送卷轴': { cost: 6, description: '传送至随机位置', image: 'teleport_scroll.png' },
    '时停怀表': { cost: 5, description: '让计数器暂停4秒', image: 'time_stop_watch.png' },
    '陷阱探测器': { cost: 7, description: '显示场上的陷阱30秒', image: 'trap_detector.png' },
    '风扇': { cost: 8, description: '使迷雾消失15秒', image: 'fan.png' }
};
// ---------------------------- 陷阱系统 ----------------------------
function generateTraps(count) { // 生成陷阱
    const mazeWidth = maze[0].length;//  获取迷宫的宽和高
    const mazeHeight = maze.length;
    for (let i = 0; i < count; i++) {
        let x, y;
        // 找到一个有效的位置（不是墙壁，不是玩家位置，不是出口，不与其他陷阱重叠，不与宝箱重叠）
        do {
            x = Math.floor(Math.random() * (mazeWidth - 2)) + 1;
            y = Math.floor(Math.random() * (mazeHeight - 2)) + 1;
        } while (//只要满足以下任意一个条件，就重新生成坐标
            maze[y][x] === 1 ||
            (x === player.x && y === player.y) ||
            
            exitPositions.some(exit => exit.x === x && exit.y === y) ||//是出口位置
            traps.some(trap => trap.x === x && trap.y === y) ||// 跟已有陷阱重叠
            chests.some(chest => chest.x === x && chest.y === y) ||// 跟宝箱重叠
            coins.some(coin => coin.x === x && coin.y === y)// 跟金币重叠
        );
        const trapTypes = ['freeze', 'reverse', 'reset', 'life_loss', 'bandit', 'trouble']; // 随机陷阱类型
        const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
        // 添加visible和showUntil属性，控制陷阱可见时间为5秒
        traps.push({x, y, type, active: true, visible: true, showUntil: Date.now() + 5000});
    }
}
function drawTraps(cellSize, offsetX, offsetY) { // 绘制陷阱
    for (const trap of traps) {// 遍历所有陷阱
        if (!trap.active || !trap.visible) continue;// 跳过不激活/不可见的陷阱
        if (imagesLoaded && images.trap) {
            ctx.drawImage( // 使用陷阱图片
                images.trap,
                offsetX + trap.x * cellSize,
                offsetY + trap.y * cellSize,
                cellSize,
                cellSize
            );
            let borderColor;    // 根据陷阱类型添加不同的边框颜色，保持类型区分
            switch (trap.type) {
                case 'freeze': borderColor = '#00bcd4'; break; // 青色表示定身陷阱
                case 'reverse': borderColor = '#000000'; break; // 黑色表示操作反向陷阱
                case 'reset': borderColor = '#db34cbff'; break; // 粉色表示回到起点陷阱
                case 'life_loss': borderColor = '#8b0000'; break; // 红色表示掉命陷阱
                case 'bandit': borderColor = '#6a1e91ff'; break; // 紫色表示强盗陷阱
                case 'trouble': borderColor = '#ff5722'; break; // 橙色表示生成怪物陷阱
                default: borderColor = '#ff9800'; // 默认橙色
            }
            ctx.strokeStyle = borderColor; // 绘制边框
            ctx.lineWidth = 3;
            ctx.strokeRect(
                offsetX + trap.x * cellSize + 1,
                offsetY + trap.y * cellSize + 1,
                cellSize - 2,
                cellSize - 2
            );
        }
    }
}
function activateTrap(trap) { // 激活陷阱
    playSound('trapHit');
    switch(trap.type) {
        case 'freeze':
            addbuff('freeze', 3000); // 3秒定身
            showMessage('陷阱：定身3秒！');
            break;
        case 'reverse':
            addbuff('reverse', 20000); // 20秒操作反向
            showMessage('陷阱：头晕晕的：操作反向！');
            break;
        case 'reset':
            player.x = 1; player.y = 1; // 回到起点
            showMessage('陷阱：一切重来');
            break;
        case 'life_loss':
            lives--; // 掉一条命
            showMessage('陷阱：失去一条命！');
            updateDisplay();
    if (canvas) { 
        canvas.focus();
    }
            if (lives <= 0) {  // 检查游戏结束
                endGame(false);
            }
            break;
        case 'bandit':  // 强盗陷阱
            showBanditChoice();
            break;
        case 'trouble':  // 随机生成一只怪物
            generateMonsters(1);
            showMessage('陷阱：你闯祸了！一只新的怪物出现了！');
            break;
    }
}
function showBanditChoice() {// 显示此山是我开陷阱选项
    pauseGame(false); // 暂停游戏但不显示暂停界面
    if (!DOM.banditOptions) return;
    DOM.banditOptions.innerHTML = '';
    const options = [
        {
            type: 'item',
            text: '留下一个道具',
            description: `你将失去一个随机道具（当前拥有：${inventory.length}个）`,
            disabled: inventory.length === 0
        },
        {
            type: 'gold',
            text: '留下一半金币',
            description: `你将失去 ${Math.floor(gold / 2)} 金币（当前拥有：${gold}个）`,
            disabled: gold === 0
        },
        {
            type: 'life',
            text: '留下一滴血',
            description: `你将失去一条生命（当前拥有：${lives}条）`,
            disabled: false  // 生命选项永远可用
        }
    ];
    options.forEach(option => {// 创建选项按钮
        const optionElement = document.createElement('div');
        optionElement.className = `bandit-option ${option.disabled ? 'disabled' : ''}`;
        optionElement.innerHTML = `
            <div class="option-text">${option.text}</div>
            <div class="option-description">${option.description}</div>
        `;
        if (!option.disabled) {
            optionElement.onclick = () => { playSound('buttonClick'); handleBanditChoice(option.type); };
        }
        
        DOM.banditOptions.appendChild(optionElement);
    });
    if (DOM.banditChoiceScreen) {   // 显示选择界面
        DOM.banditChoiceScreen.classList.remove('hidden');
    }
}
function handleBanditChoice(choice) {//处理玩家选择
    if (DOM.banditChoiceScreen) {    // 关闭选择界面
        DOM.banditChoiceScreen.classList.add('hidden');
    }
    let actualChoice = choice;
    switch (actualChoice) {
        case 'item':
            const itemIndex = Math.floor(Math.random() * inventory.length);
            const removedItem = inventory.splice(itemIndex, 1)[0];
            showMessage(`此山是我开！随机留下了${removedItem}！`);
            break;
        case 'gold':
            const robbery = Math.floor(gold / 2);
            gold -= robbery;
            showMessage(`此山是我开！留下 ${robbery} 金币！`);
            break;
        case 'life':
            lives--;
            showMessage('此山是我开！留下一条命！');
            if (lives <= 0) {
                endGame(false);
            }
            break;
    }
    resumeGame(); // 恢复游戏
    updateDisplay();
    if (canvas) {
        canvas.focus();
    }
}
// ---------------------------- 宝箱系统 ----------------------------
function generateChests(mazeWidth, mazeHeight) { // 生成宝箱
    let chestCount = 0;// 已生成的宝箱数量
    const maxAttempts = 100; // 最大尝试次数，防止无限循环
    let attempts = 0;
    while (chestCount < 5 && attempts < maxAttempts) {
        attempts++;
        const x = Math.floor(Math.random() * mazeWidth);  // 随机生成位置
        const y = Math.floor(Math.random() * mazeHeight);
        if (maze[y][x] !== 0) continue; // 检查是否是通路
        const hasTrap = traps.some(trap => trap.x === x && trap.y === y); // 检查该位置是否有陷阱
        if (hasTrap) continue;
        const hasCoin = coins.some(coin => coin.x === x && coin.y === y);     // 检查该位置是否有金币
        if (hasCoin) continue;
        const hasChest = chests.some(chest => chest.x === x && chest.y === y);        // 检查该位置是否已有宝箱
        if (hasChest) continue;
        chests.push({x, y, opened: false});// 添加宝箱
        chestCount++;
    }
}
function openChest(chest) { // 打开宝箱
    chest.opened = true;
    const chestType = chestTypes[Math.floor(Math.random() * chestTypes.length)]; // 随机选择宝箱类型
    playSound('coinChest');
    switch(chestType) {    // 根据宝箱类型执行不同效果
        case 1: // 问题宝箱
            handleQuestionChest();
            break;
        case 2:  // 勇气的奖励1：给道具
            addRandomItemToInventory();
            break;
        case 3:
        case 4:
        case 5:// 勇气的奖励2：给随机金币
            const coinAmount = Math.floor(Math.random() * 4) + 5; // 随机5-8个金币
            gold += coinAmount;
            showMessage(`勇气的奖励：获得 ${coinAmount} 金币！`);
            updateDisplay(); // 更新金币显示
            break;
        case 6: // 危险宝箱
            handleDangerChest();
            break;
    }
}
const questions = [// 问题数组定义
    {
        question: "队列是（）的线性表",
        options: ["先进先出", "先进后出", "后进先出", "后进后出"],
        answer: 0 // 索引0是正确答案
    },
    {
        question: "长度n的顺序表，第i个元素之前插入1个新元素时需后移（）个元素",
        options: ["n-i", "n-i-1", "n-i+1", "i"],
        answer: 2 // 索引2是正确答案
    },
    {
        question: "无向图中，所有顶点的度数之和等于图的边数的（）倍？",
        options: ["1/2", "1", "2", "4"],
        answer: 2 // 索引2是正确答案
    }
];
function showQuestion() {// 显示问题弹窗函数
    pauseGame(false); // 暂停游戏但不显示暂停界面
    const randomIndex = Math.floor(Math.random() * questions.length); // 随机选择一道题
    const selectedQuestion = questions[randomIndex];   
    currentQuestion = selectedQuestion;    // 保存当前问题信息（用于后续处理）
    if (DOM.questionText) {  // 显示问题
        DOM.questionText.textContent = selectedQuestion.question;
    }    
    if (DOM.questionOptions) {  // 清空现有选项
        DOM.questionOptions.innerHTML = '';       
        selectedQuestion.options.forEach((option, index) => {       // 创建选项按钮
            const optionElement = document.createElement('div');
            optionElement.className = 'question-option';
            optionElement.textContent = option; // 选项文字
            optionElement.dataset.index = index;     // 存选项索引       
            optionElement.onclick = () => { playSound('buttonClick'); handleQuestionAnswer(index); };           
            DOM.questionOptions.appendChild(optionElement);
        });
    }
    if (DOM.questionScreen) {  // 显示问题界面 
        DOM.questionScreen.classList.remove('hidden');
    }
}
function handleQuestionAnswer(selectedIndex) {// 处理玩家回答
    const correctIndex = currentQuestion.answer;// 正确答案的索引
    const optionElements = document.querySelectorAll('.question-option');
    let isCorrect = false;
    optionElements.forEach(element => { // 禁用所有选项按钮（防止重复点击）
        element.onclick = null;
        element.style.cursor = 'default';
    });
    optionElements.forEach((element, index) => {
        if (index === correctIndex) {
            element.classList.add('correct');
            if (index === selectedIndex) {
                isCorrect = true;//正确答案
            }
        } else if (index === selectedIndex) {
            element.classList.add('wrong'); //玩家选的是错误答案
        }
    });
    const delay = isCorrect ? 1500 : 3000; // 正确答案1.5秒后关闭，错误答案3秒后关闭
    setTimeout(() => {
        if (isCorrect) {   // 处理道具奖励或惩罚
            addRandomItemToInventory(false); // 设置为false，避免重复显示消息
        } else {
            if (inventory.length > 0) {
                inventory.pop();
            } else {
                lives--;
                if (lives <= 0) {  // 检查游戏结束
                    endGame(false);
                }
            }
        }
        if (isCorrect) {// 显示消息
            showMessage('回答正确！获得随机道具！');
        } else {
            if (inventory.length > 0) {
                showMessage('回答错误！失去一个道具！');
            } else {
                showMessage('回答错误，无道具，扣除血量');
            }
        }
        if (DOM.questionScreen) {  // 关闭问题界面
            DOM.questionScreen.classList.add('hidden');
        }
        if (DOM.gameScreen) {  // 确保游戏界面仍然可见
            if (DOM.gameScreen.classList.contains('hidden')) {
                DOM.gameScreen.classList.remove('hidden');
            }
        }
        resumeGame(); // 恢复游戏
        updateDisplay();
        if (canvas) {
            canvas.focus();
        }      
    }, delay);
}
function handleQuestionChest() {// 宝箱效果函数
    showQuestion();
}
function handleDangerChest() {
    const shieldbuff = buffs.find(buff => buff.type === 'shield'); // 检查是否有防护盾
    if (shieldbuff) {
        buffs.splice(buffs.indexOf(shieldbuff), 1);  // 移除防护盾
        showMessage('防护盾抵消了致命攻击！');
        return;
    }
    lives--; 
    showMessage('这也能歪？失去一条命');
    updateDisplay();
    if (lives <= 0) {
        endGame(false);
    }
}
// ---------------------------- 道具系统 ----------------------------
function useBomb() {// 炸药效果函数
    for (let dy = -1; dy <= 1; dy++) {  // 炸开周围3*3的墙壁
        for (let dx = -1; dx <= 1; dx++) {// 计算当前遍历格子的坐标
            const x = player.x + dx;
            const y = player.y + dy;
            if (x >= 0 && x < maze[0].length && y >= 0 && y < maze.length) {
                maze[y][x] = 0;// 将墙壁格子设为通路（0代表通路，1代表墙壁）
            }
        }
    }
    traps = traps.filter(trap => {// 消除周围的陷阱
        const distance = Math.abs(trap.x - player.x) + Math.abs(trap.y - player.y);
        return distance > 1;
    });
    showMessage('炸药炸开了周围的墙壁，清除了陷阱！');
}
function freezeMonsters() {//定身符
    const freezeTime = Date.now() + 3000; 
    for (const monster of monsters) {// 遍历所有怪物，设置定身结束时间
        monster.frozenUntil = freezeTime;
    }
    showMessage('所有怪物被定身3秒！');
}
function healPlayer() {//回魂药水
    if (isPaused) return; // 游戏暂停时不能恢复生命
    lives++;
    showMessage('恢复了1条命！');
    updateDisplay();
    updatebuffDisplay();
}
function killMonster() {// 斩妖剑：杀死离玩家最近的一个怪物
    if (monsters.length > 0) {
        let closestMonsterIndex = 0;         // 计算每个怪物与玩家的距离并找到最近的
        let closestDistance = Infinity;             
        monsters.forEach((monster, index) => {
            const distance = Math.sqrt(
            Math.pow(monster.x - player.x, 2) + Math.pow(monster.y - player.y, 2)
            );
            if (distance < closestDistance) {
            closestDistance = distance;
            closestMonsterIndex = index;
            }
        });
        const removedMonster = monsters.splice(closestMonsterIndex, 1);
        showMessage('斩妖剑杀死了离你最近的一个怪物！');
    } else {
        showMessage('当前没有怪物！');
    }
}
function teleportPlayer() {//传送卷轴
    const mazeWidth = maze[0].length; // 获取迷宫尺寸
    const mazeHeight = maze.length;
    let randomX, randomY; // 找到随机一个通路位置
    let attempts = 0;
    const maxAttempts = 100;   
    do {// 循环寻找有效通路位置（0代表通路）
        randomX = Math.floor(Math.random() * mazeWidth);// 生成随机坐标
        randomY = Math.floor(Math.random() * mazeHeight);
        attempts++;
    } while (maze[randomY][randomX] !== 0 && attempts < maxAttempts);
    if (maze[randomY][randomX] === 0) {
        player.x = randomX;
        player.y = randomY;
        showMessage('传送卷轴发动！');
    } 
}
function updateInventory() {// 更新道具栏UI显示
    if (DOM.inventorySlots) {
        DOM.inventorySlots.innerHTML = '';// 清空现有道具槽  
        for (let i = 0; i < 6; i++) {// 创建道具槽
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            if (i < inventory.length) {
                slot.classList.add('has-item');
                const itemName = inventory[i];
                const item = ITEMS[itemName];
                slot.innerHTML = `<img src="images/${item.image}" alt="${itemName}" style="width: 50px; height: 50px;">`;
                (function(index) {
                    slot.addEventListener('click', () => useItem(index));
                })(i);
            }
            DOM.inventorySlots.appendChild(slot); // 将道具槽添加到道具栏容器中
        }
    }
}
function useItem(index) {//使用道具
    if (isPaused) return; // 游戏暂停时不能使用道具
    if (index >= inventory.length) {
        return;
    }
    const item = inventory[index];   // 获取要使用的道具名称
    playSound('buttonClick');
    switch(item) {
        case '炸药':
            useBomb();
            break;
        case '防护盾':
            addbuff('shield', 30000); // 30秒防护盾
            showMessage('防护盾已激活！');
            break;
        case '定身符':
            freezeMonsters();
            break;
        case '回魂药水':
            healPlayer();
            break;
        case '斩妖剑':
            killMonster();
            break;
        case '牛奶':// 解除负面效果状态
            buffs = buffs.filter(buff => buff.type !== 'freeze' && buff.type !== 'reverse');
            showMessage('负面效果已解除！');
            updatebuffDisplay();
            break;
        case '传送卷轴':
            teleportPlayer();
            break;
        case '时停怀表': // 暂停计时器4秒
            pauseGameTimer();
            showMessage('计时器已暂停4秒！');
            const timeStopTimer = setTimeout(() => {// 4秒后恢复计时器
                startGameTimer();
                showMessage('计时器已恢复！');
            }, 4000);
            tempTimers.push(timeStopTimer);
            break;
        case '陷阱探测器': // 显示场上所有陷阱30秒
            const currentTime = Date.now();
            traps.forEach(trap => {
                trap.visible = true;
                trap.showUntil = currentTime + 30000; // 30秒后隐藏
            });
            addbuff('trapDetector', 30000); // 添加陷阱探测器buff
            showMessage('所有陷阱将显示30秒！');
            break;
        case '风扇': // 使迷雾消失15秒
            isFogActive = false;
            addbuff('fan', 15000); // 添加风扇buff，持续15秒
            showMessage('已使用风扇！');
            const fogClearTimer = setTimeout(() => { // 15秒后恢复迷雾
                isFogActive = true;
            }, 15000);
            tempTimers.push(fogClearTimer);
            break;
    }
    inventory.splice(index, 1);    // 从道具栏移除道具
    updateDisplay();   
    drawGame(); // 立即重新绘制游戏画面，确保怪物移除后立即更新  
    canvas.focus();
}
function addItemToInventory(itemName) {
    if (inventory.length < 6) {
        inventory.push(itemName);
        updateInventory(); // 立即更新道具栏显示
    } else {
        showMessage('道具栏已满！');
    }
}
function addRandomItemToInventory(shouldShowMessage = true) { // 获取所有道具名称的数组
    const itemNames = Object.keys(ITEMS);
    const randomItem = itemNames[Math.floor(Math.random() * itemNames.length)];// 随机选择一个道具名称
    // 添加道具到道具栏
    addItemToInventory(randomItem);
    // 显示获得的道具信息
    if (shouldShowMessage) {
        showMessage(`勇气的奖励：获得${randomItem}道具`);
    }
}
// ---------------------------- 商店系统 ----------------------------
function updateShopDisplay() {
    if (DOM.shopItems && DOM.shopGold) {
        DOM.shopItems.innerHTML = '';     // 清空现有物品 （防止重复渲染）
        DOM.shopGold.textContent = gold;// 更新商店界面的金币显示数值
        // 只有在currentShopItems为空时才生成新的物品列表
        if (currentShopItems.length === 0) {
            const itemNames = Object.keys(ITEMS);    // 获取所有道具名称的数组
            while (currentShopItems.length < 5 && currentShopItems.length < itemNames.length) { // 循环生成5个不重复的道具（或所有道具不足5个时取全部）
                const randomItem = itemNames[Math.floor(Math.random() * itemNames.length)];
                if (!currentShopItems.includes(randomItem)) {
                    currentShopItems.push(randomItem);
                }
            }
        }
        const shopItems = currentShopItems;// 使用当前商店物品列表（不再每次重新生成）
        for (let i = 0; i < shopItems.length; i++) { // 创建商店物品元素
            const itemName = shopItems[i];// 当前道具名称
            const item = ITEMS[itemName]; // 当前道具的完整配置
            const isPurchased = purchasedShopItems.includes(itemName);
            let displayCost = item.cost; // 展示价格（默认等于原价）
            let discountClass = '';
            let priceHTML = `${displayCost} 金币`;
            if (i === 0 && !isPurchased) {
                displayCost = Math.max(1, item.cost - 1); // 首件未购买的道具打折（最低1金币）
                discountClass = 'discounted';
                priceHTML = `<span class="original-price">${item.cost} 金币</span><span class="discounted-price">${displayCost} 金币</span>`;
            }
            const itemElement = document.createElement('div'); // 创建单个道具的DOM容器
            itemElement.className = `shop-item ${isPurchased ? 'purchased' : ''} ${discountClass}`;
             // 拼接物品HTML结构（图片、名称、描述、价格、购买按钮）
            itemElement.innerHTML = ` 
                <div class="item-image"><img src="images/${item.image}" alt="${itemName}" style="width: 60px; height: 60px;"></div>
                <div class="item-name">${itemName}</div>
                <div class="item-description">${item.description}</div>
                <div class="item-price">${priceHTML}</div>
                <button class="buy-btn" onclick="${isPurchased ? '' : `playSound('buttonClick'); buyItem('${itemName}', ${displayCost})`}" ${isPurchased ? 'disabled' : ''}>${isPurchased ? '已购买' : '购买'}</button>
            `;
            DOM.shopItems.appendChild(itemElement);// 将物品元素添加到商店容器中
        }
    }
}
function buyItem(itemName, displayCost) {
    const item = ITEMS[itemName];
    const cost = displayCost || item.cost;
    if (gold >= cost && !purchasedShopItems.includes(itemName)) {// 购买条件校验：金币足够
        gold -= cost;// 扣除金币
        addItemToInventory(itemName);
        purchasedShopItems.push(itemName);     // 将购买的道具添加到已购买列表
        if (DOM.goldCount) {// 更新全局金币显示
            DOM.goldCount.textContent = gold;
        }
        if (DOM.shopGold) { // 更新商店界面的金币显示
            DOM.shopGold.textContent = gold;
        }
        updateInventory();// 刷新背包界面展示
        const shopItems = document.querySelectorAll('.shop-item');// 更新商店中该道具的状态（标记为已购买）
        shopItems.forEach(itemElement => {
            const nameElement = itemElement.querySelector('.item-name');
            if (nameElement && nameElement.textContent === itemName) {// 找到当前购买的道具元素
                itemElement.classList.add('purchased');
                const buyButton = itemElement.querySelector('.buy-btn');
                if (buyButton) {
                    buyButton.disabled = true; // 禁用购买按钮
                    buyButton.textContent = '已购买';// 修改按钮文字
                    buyButton.onclick = null;// 清空点击事件（防止重复触发）
                }
            }
        });
        showMessage(`购买了 ${itemName}`);
    } else if (purchasedShopItems.includes(itemName)) {
        showMessage('该道具已购买！');
    } else {
        showMessage('金币不足！');
    }
}
function refreshShop() {// 刷新商店
    if (gold >= 1) {
        gold -= 1;
        purchasedShopItems = [];// 清空已购买物品列表
        currentShopItems = [];// 清空当前商店物品列表，以便生成新物品
        updateShopDisplay();
        updateDisplay();
        showMessage('刷新商店，花费1金币');
    } else {
        showMessage('金币不足！');
    }
}
//-----------------------------怪物系统---------------------------------
function generateMonsters(count) { // 生成怪物
    const mazeWidth = maze[0].length;
    const mazeHeight = maze.length;
    for (let i = 0; i < count; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (mazeWidth - 2)) + 1;
            y = Math.floor(Math.random() * (mazeHeight - 2)) + 1;
        } while (
            maze[y][x] === 1 ||
            (x === player.x && y === player.y) ||
            exitPositions.some(exit => exit.x === x && exit.y === y) ||
            monsters.some(monster => monster.x === x && monster.y === y) ||
            Math.abs(x - player.x) + Math.abs(y - player.y) < 10
        );
        monsters.push({
            x, y,
            targetX: player.x,
            targetY: player.y,
            speed: 4,
            frozenUntil: 0
        });
    }
}
// BFS寻路算法：找到从start到end的最短路径
function findPathBFS(startX, startY, endX, endY) {
    if (maze[startY][startX] === 1 || maze[endY][endX] === 1) {  // 检查起点和终点是否合法
        return null;
    }
    const directions = [
        {dx: 0, dy: -1}, // 上
        {dx: 1, dy: 0},  // 右
        {dx: 0, dy: 1},  // 下
        {dx: -1, dy: 0}  // 左
    ];
    const visited = new Array(maze.length);    // 初始化visited数组和父节点数组
    const parent = new Array(maze.length);
    for (let i = 0; i < maze.length; i++) {
        visited[i] = new Array(maze[0].length).fill(false);
        parent[i] = new Array(maze[0].length).fill(null);
    }
    const queue = [];  // 队列用于BFS
    queue.push({x: startX, y: startY});
    visited[startY][startX] = true;
    while (queue.length > 0) {    // BFS搜索
        const current = queue.shift();
        if (current.x === endX && current.y === endY) { // 回溯路径
            const path = [];
            let node = current;
            while (node) {
                path.unshift({x: node.x, y: node.y});
                node = parent[node.y][node.x];
            }
            return path;
        }
        for (const dir of directions) {// 探索四个方向
            const newX = current.x + dir.dx;
            const newY = current.y + dir.dy;
            if (newX >= 0 && newX < maze[0].length && // 检查新位置是否在迷宫范围内且是通路且未访问
                newY >= 0 && newY < maze.length && 
                maze[newY][newX] === 0 && 
                !visited[newY][newX]) {
                queue.push({x: newX, y: newY});
                visited[newY][newX] = true;
                parent[newY][newX] = current;
            }
        }
    }
    return null; // 没有找到路径
}
function updateMonsters() { // 更新怪物
    for (let i = 0; i < monsters.length; i++) {
        const monster = monsters[i];
        if (monster.frozenUntil > Date.now()) {
            continue; // 检查是否被冻结
        }
        const oldX = monster.x;
        const oldY = monster.y;
        const currentGridX = Math.floor(monster.x + 0.5); // 使用0.5偏移确保正确的格子定位
        const currentGridY = Math.floor(monster.y + 0.5);
        if (currentGridX < 0 || currentGridX >= maze[0].length ||
             currentGridY < 0 || currentGridY >= maze.length) {// 确保怪物在迷宫范围内
            monster.x = Math.max(0, Math.min(maze[0].length - 0.5, monster.x));   // 怪物不在迷宫范围内，重置位置
            monster.y = Math.max(0, Math.min(maze.length - 0.5, monster.y));
            continue;
        }
        if (maze[currentGridY][currentGridX] === 1) { // 检查当前位置是否是墙壁，是则移回上一个位置
            monster.x = oldX;
            monster.y = oldY;
            continue;
        }
        const distanceX = Math.abs(player.x - monster.x);
        const distanceY = Math.abs(player.y - monster.y);
        if (distanceX <= 7 && distanceY <= 7) {  // 在怪物的7×7范围内时才会追击
            const playerGridX = Math.floor(player.x + 0.5);  // 获取玩家所在的格子
            const playerGridY = Math.floor(player.y + 0.5);
            // 使用BFS找到到玩家的路径
            const path = findPathBFS(currentGridX, currentGridY, playerGridX, playerGridY);
            if (path && path.length > 1) {
                const nextStep = path[1];// 获取下一步的位置
                if (nextStep.x > currentGridX) {// 向下一步位置移动
                    monster.x += 1/60;   // 向右移动
                } else if (nextStep.x < currentGridX) {
                    monster.x -= 1/60;  // 向左移动
                } else if (nextStep.y > currentGridY) {
                    monster.y += 1/60;     // 向下移动
                } else if (nextStep.y < currentGridY) {
                    monster.y -= 1/60; // 向上移动
                } 
            }
            const newGridX = Math.floor(monster.x + 0.5); // 移动后再次检查位置是否合法
            const newGridY = Math.floor(monster.y + 0.5);
            if (newGridX < 0 || newGridX >= maze[0].length || newGridY < 0 || newGridY >= maze.length || maze[newGridY][newGridX] === 1) {
                // 如果新位置不合法，回退到原来的位置
                monster.x = oldX;
                monster.y = oldY;
            }
        }
    }
}
function handleMonsterCollision(monster) {// 处理怪物碰撞
    playSound('monsterHit');
    const shieldbuff = buffs.find(buff => buff.type === 'shield');
    if (shieldbuff) {
        buffs.splice(buffs.indexOf(shieldbuff), 1);
        showMessage('防护盾抵消了攻击！');
        return;
    } 
    lives--;
    monsterHits++;
    showMessage('被怪物攻击了！');
    updateDisplay();    
    if (lives <= 0) {
        endGame(false);
    }
}
// ---------------------------- 图片音乐系统 ----------------------------
function loadImages() {// 加载图片资源
    let loadedCount = 0;
    let errorCount = 0;
    const totalImages = Object.keys(images).length;
    function onImageLoaded() {
        loadedCount++;
        if (loadedCount + errorCount === totalImages) {
            imagesLoaded = true;
        }
    }
    function onImageError(e) {
        errorCount++;
        console.error('图片加载失败:', e.target.src);
        if (loadedCount + errorCount === totalImages) {
            imagesLoaded = true;
        }
    }
    images.player = new Image();
    images.player.src = 'images/player.png';
    images.player.onload = onImageLoaded;
    images.player.onerror = onImageError;
    images.monster = new Image();
    images.monster.src = 'images/monster.png';
    images.monster.onload = onImageLoaded;
    images.monster.onerror = onImageError;
    images.chest = new Image();
    images.chest.src = 'images/chest.png';
    images.chest.onload = onImageLoaded;
    images.chest.onerror = onImageError;
    images.trap = new Image();
    images.trap.src = 'images/trap.png';
    images.trap.onload = onImageLoaded;
    images.trap.onerror = onImageError;
    images.fog = new Image();
    images.fog.src = 'images/fog.jpg';
    images.fog.onload = onImageLoaded;
    images.fog.onerror = onImageError;
}
function loadAudio() {// 加载音频
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        music = new Audio('audio/bg_music.mp3');  // 加载背景音乐
        music.loop = true; // 设置循环播放
        music.volume = musicVolume;
        music.muted = !soundEnabled;
        music.addEventListener('canplaythrough', () => {
            audioLoaded = true;
            // 音频加载完成后，如果音乐已启用且当前在菜单界面，自动播放音乐
            if (musicEnabled && soundEnabled && (currentScreen === 'start' || currentScreen === 'difficulty' || currentScreen === 'settings')) {
                music.play().catch(() => {
                });
            }
        });
        music.addEventListener('error', () => {
            audioLoaded = false;
        });
        const effectFiles = {  // 加载音效
            buttonClick: 'audio/button_click.mp3', 
            gameWin: 'audio/game_win.mp3',
            gameLose: 'audio/game_over.mp3',
            monsterHit: 'audio/trap_monster.mp3',
            trapHit: 'audio/trap_monster.mp3',
            coinChest: 'audio/coin_chest.mp3'
        };
        for (const [name, url] of Object.entries(effectFiles)) {
            soundEffects[name] = new Audio(url);
            soundEffects[name].volume = soundEffectVolume;
            soundEffects[name].muted = !soundEffectsEnabled;
            soundEffects[name].addEventListener('error', () => {
            });
        }  
    } catch (error) {
        audioLoaded = false;
    }
}
function playSound(soundName) {// 播放音效
    if (soundEffectsEnabled && soundEffects[soundName]) { // 只有当音效开关开启且音效存在时才播放
        const soundEffect = soundEffects[soundName].cloneNode();
        soundEffect.volume = soundEffectVolume;
        soundEffect.muted = false;
        soundEffect.play().catch(error => {
        });
    }
}
function toggleMusic() {// 切换音乐开关
    musicEnabled = !musicEnabled;
    if (DOM.musicToggle) {
        DOM.musicToggle.textContent = musicEnabled ? '开' : '关';
        DOM.musicToggle.classList.toggle('off', !musicEnabled);
    }
    const musicStatusSpan = document.getElementById('music-status');
    if (musicStatusSpan) {
        musicStatusSpan.textContent = musicEnabled ? '开' : '关';
    }
    if (music) {  // 更新音乐状态
        music.muted = !musicEnabled;
        if (musicEnabled && music.paused) { // 如果音乐开启，在任何界面都开始播放
            music.play().catch(() => {
            });
        }
    }
}
function toggleSoundEffects() { // 翻转音效开关状态
    soundEffectsEnabled = !soundEffectsEnabled;
    if (DOM.soundEffectsToggle) {// 更新界面上的音效开关按钮显示
        DOM.soundEffectsToggle.textContent = soundEffectsEnabled ? '开' : '关';// 按钮文字显示“开”或“关”
        DOM.soundEffectsToggle.classList.toggle('off', !soundEffectsEnabled); // 给按钮添加/移除off样式
    }
    for (const effectName in soundEffects) {//遍历所有音效文件，设置静音状态
        soundEffects[effectName].muted = !soundEffectsEnabled;
    }
}
function toggleSound() { //翻转全局声音开关状态，并同步到音乐和音效的开关
    soundEnabled = !soundEnabled;// 全局声音总开关
    musicEnabled = soundEnabled;// 背景音乐开关跟随总开关
    soundEffectsEnabled = soundEnabled;// 音效开关跟随总开关
    if (music) {    // 更新音乐静音状态
        music.muted = !soundEnabled;
        if (soundEnabled && currentScreen === 'game' && music.paused) { // 如果声音开启且音乐未播放，则开始播放
            music.play().catch(() => {
            });
        }
    }
    for (const effectName in soundEffects) {    // 更新所有音效的静音状态
        soundEffects[effectName].muted = !soundEnabled;
    }
    if (DOM.musicToggle) {// 更新设置界面的按钮状态
        DOM.musicToggle.textContent = soundEnabled ? '开' : '关';
        DOM.musicToggle.classList.toggle('off', !soundEnabled);
    }
    if (DOM.soundEffectsToggle) {
        DOM.soundEffectsToggle.textContent = soundEnabled ? '开' : '关';
        DOM.soundEffectsToggle.classList.toggle('off', !soundEnabled);
    }
}

// ------------------------绘制游戏----------------------
function drawGame() { // 绘制游戏
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布
    const cellSize = Math.min(canvas.width / maze[0].length, canvas.height / maze.length); // 计算单元格大小
    // 计算偏移量，确保迷宫居中
    const mazeWidth = maze[0].length;
    const mazeHeight = maze.length;
    const actualMazeWidth = mazeWidth * cellSize;
    const actualMazeHeight = mazeHeight * cellSize;
    const offsetX = (canvas.width - actualMazeWidth) / 2;
    const offsetY = (canvas.height - actualMazeHeight) / 2;
    drawMaze(maze, cellSize, offsetX, offsetY); // 绘制迷宫
    drawExits(cellSize, offsetX, offsetY); // 绘制出口
    drawTraps(cellSize, offsetX, offsetY); // 绘制陷阱
    drawCoins(cellSize, offsetX, offsetY); // 绘制金币
    drawChests(cellSize, offsetX, offsetY); // 绘制宝箱
    drawMonsters(cellSize, offsetX, offsetY); // 绘制怪物
    drawPlayer(cellSize, offsetX, offsetY); // 绘制玩家
    drawFog(cellSize, offsetX, offsetY); // 绘制迷雾
}
function drawMaze(maze, cellSize, offsetX, offsetY) { // 绘制迷宫
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2e'; // 设置画布背景色（边框颜色）
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const mazeWidth = maze[0].length;
    const mazeHeight = maze.length;
    const actualMazeWidth = mazeWidth * cellSize;
    const actualMazeHeight = mazeHeight * cellSize;
    ctx.fillStyle = '#f0d0e7ff'; // 绘制通路背景
    ctx.fillRect(offsetX, offsetY, actualMazeWidth, actualMazeHeight);
    ctx.fillStyle = '#000000'; // 绘制实心墙壁
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            if (maze[y][x] === 1) {
                ctx.fillRect(
                    offsetX + x * cellSize,
                    offsetY + y * cellSize,
                    cellSize,
                    cellSize
                ); // 绘制实心墙壁
            }
        }
    }
}
function drawExits(cellSize, offsetX, offsetY) { // 绘制出口
    ctx.fillStyle = '#4caf50';
    for (const exit of exitPositions) {
        ctx.fillRect(
            offsetX + exit.x * cellSize,
            offsetY + exit.y * cellSize,
            cellSize,
            cellSize
        );
        ctx.fillStyle = '#ffffff'; // 绘制出口标记
        ctx.font = `${cellSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            '出口',
            offsetX + exit.x * cellSize + cellSize / 2,
            offsetY + exit.y * cellSize + cellSize / 2
        );
    }
}
function drawCoins(cellSize, offsetX, offsetY) { // 绘制金币
    ctx.fillStyle = '#e8be27ff';
    for (const coin of coins) {
        ctx.beginPath();
        ctx.arc(
            offsetX + coin.x * cellSize + cellSize / 2,
            offsetY + coin.y * cellSize + cellSize / 2,
            cellSize / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}
function drawChests(cellSize, offsetX, offsetY) { // 绘制宝箱
    for (const chest of chests) {
        if (chest.opened) continue;    // 如果宝箱已打开，跳过绘制（消失效果）
        if (imagesLoaded && images.chest) {
            ctx.drawImage(   // 使用宝箱图片
                images.chest,
                offsetX + chest.x * cellSize,
                offsetY + chest.y * cellSize,
                cellSize,// 宝箱宽高（和迷宫格子一样大）
                cellSize
            );
        }
    }
}
function drawMonsters(cellSize, offsetX, offsetY) { // 绘制怪物
    const scaleFactor = 1.2;
    const scaledSize = cellSize * scaleFactor;
    const offset = (scaledSize - cellSize) / 2; // 计算居中偏移量
    for (const monster of monsters) {
        const isFrozen = monster.frozenUntil > Date.now();
        if (imagesLoaded && images.monster) {
            ctx.drawImage( // 使用怪物图片
                images.monster,
                offsetX + monster.x * cellSize - offset,
                offsetY + monster.y * cellSize - offset,
                scaledSize,
                scaledSize
            );
            if (isFrozen) {  // 如果怪物被冻结，添加冻结效果
                ctx.fillStyle = 'rgba(135, 206, 235, 0.5)';
                ctx.fillRect(
                    offsetX + monster.x * cellSize - offset,
                    offsetY + monster.y * cellSize - offset,
                    scaledSize,
                    scaledSize
                );
            }
        }
    }
}
function drawPlayer(cellSize, offsetX, offsetY) { // 绘制玩家
    const scaleFactor = 1.2; 
    const scaledSize = cellSize * scaleFactor;
    const offset = (scaledSize - cellSize) / 2; // 计算居中偏移量
    if (imagesLoaded && images.player) {
        ctx.drawImage(
            images.player,
            offsetX + player.x * cellSize - offset,
            offsetY + player.y * cellSize - offset,
            scaledSize,
            scaledSize
        );
    }
}
function drawFog(cellSize, offsetX, offsetY) { // 绘制迷雾
    if (!imagesLoaded || !images.fog || !isFogActive) return;
    const playerGridX = Math.floor(player.x);
    const playerGridY = Math.floor(player.y);
    ctx.save();
    ctx.globalAlpha = 0.95; // 设置透明度
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[0].length; x++) {// 检查当前格子是否在玩家周围3×3范围内
            const distanceToPlayerX = Math.abs(x - playerGridX);
            const distanceToPlayerY = Math.abs(y - playerGridY);
            let inMonsterRange = false;
            for (const monster of monsters) { // 检查当前格子是否是怪物本身所在的格子
                const monsterGridX = Math.floor(monster.x);
                const monsterGridY = Math.floor(monster.y);
                if (x === monsterGridX && y === monsterGridY) {
                    inMonsterRange = true;
                    break;
                }
            }
            const hasChest = chests.some(chest => chest.x === x && chest.y === y && !chest.opened);// 检查当前格子是否有未打开的宝箱
            const hasCoin = coins.some(coin => coin.x === x && coin.y === y); // 检查当前格子是否有金币
            const hasVisibleTrap = traps.some(trap => trap.x === x && trap.y === y && trap.visible && trap.active); // 检查当前格子是否有可见的陷阱
            const hasExit = exitPositions.some(exit => exit.x === x && exit.y === y); // 检查当前格子是否是出口
            // 只有当既不在玩家范围内也不在任何怪物范围内，并且没有宝箱、金币、可见陷阱和出口时，才绘制迷雾
            if ((distanceToPlayerX > 1 || distanceToPlayerY > 1) && !inMonsterRange && !hasChest && !hasCoin && !hasVisibleTrap && !hasExit) {
                // 在玩家3×3范围外且不在怪物1×1范围内，且没有宝箱、金币、可见陷阱和出口，绘制迷雾
                ctx.drawImage(
                    images.fog,
                    offsetX + x * cellSize,
                    offsetY + y * cellSize,
                    cellSize,
                    cellSize
                );
            }
        }
    }
    ctx.restore();
}
// ---------------------------- 游戏系统 ----------------------------
function startGame(mode) { // 开始游戏
    gameMode = mode;
    isGameOver = false; // 重置游戏结束标志位
    // 恢复音频上下文
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const config = CONFIG[mode];  // 设置游戏参数
    lives = config.playerLives;
    gold = config.initialGold;
    monsterHits = 0;
    buffs = [];
    inventory = [];
    traps = [];
    chests = [];
    monsters = [];
    coins = [];
    exitPositions = [];
    purchasedShopItems = []; // 重置已购买物品列表
    currentShopItems = []; // 重置当前商店物品列表
    const mazeWidth = config.mazeWidth;// 初始化迷宫
    const mazeHeight = config.mazeHeight;
    maze = generateMaze(mazeWidth, mazeHeight);
    player = {
        x: 1,
        y: 1
    };
    generateExits(mazeWidth, mazeHeight);    // 生成出口
    generateTraps(config.trapsCount);
    generateCoins(config.coinsCount);
    generateChests(mazeWidth, mazeHeight);
    generateMonsters(config.monstersCount);
    for (let i = 0; i < config.initialItems; i++) {
        addRandomItemToInventory(false); // 开局道具不显示提示
    }
    updateDisplay();
    gameStartTime = Date.now();    // 开始游戏计时，重置累计时间
    elapsedGameTime = 0;
    startGameTimer();
    isFogActive = false; // 重置迷雾状态
    fogElapsedTime = 0; // 重置迷雾计时
    fogStartTime = Date.now(); // 记录开始计时的时间点
    // 清除之前的迷雾定时器
    fogTimers.forEach(timerId => clearTimeout(timerId));
    fogTimers = [];
    // 设置新的迷雾定时器
    const warningTimer = setTimeout(() => {
        if (!isPaused) showMessage('即将生成迷雾...');
    }, 9000);
    fogTimers.push(warningTimer);
    const fogTimer = setTimeout(() => {
        if (!isPaused) isFogActive = true;
    }, 10000);
    fogTimers.push(fogTimer);
    showScreen('game');    // 显示游戏界面
    if (typeof gameLoopId !== 'undefined') {// 开始游戏循环
        cancelAnimationFrame(gameLoopId);
    }
    gameLoopId = requestAnimationFrame(gameLoop);
    clearInterval(buffUpdateInterval); // 清除之前的定时器
    buffUpdateInterval = setInterval(updatebuffs, 1000); // 每秒检查一次buffs
    if (canvas) {// 确保canvas获得焦点，以便键盘事件能够正常触发
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
    }
}
function generateMaze(width, height) { // 迷宫生成算法 - 随机DFS
    const maze = Array(height).fill().map(() => Array(width).fill(1));// 初始化迷宫，所有单元格都是墙壁
    const stack = [];    // 深度优先搜索生成迷宫
    const startX = 1;  // 从左上角开始
    const startY = 1;
    maze[startY][startX] = 0; // 0表示通路
    stack.push({x: startX, y: startY});
    const directions = [
        {dx: 0, dy: -2}, // 上
        {dx: 2, dy: 0},  // 右
        {dx: 0, dy: 2},  // 下
        {dx: -2, dy: 0}  // 左
    ];
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const unvisited = [];
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze[ny][nx] === 1) { // 确保邻居不在边界上（边界应该始终是墙壁）
                unvisited.push({x: nx, y: ny, dir});
            }
        }
        if (unvisited.length > 0) {
            const next = unvisited[Math.floor(Math.random() * unvisited.length)]; // 随机选择一个未访问的邻居
            maze[next.y][next.x] = 0;  // 打通墙壁
            // 打通当前单元格和邻居之间的墙壁
            const wallX = current.x + next.dir.dx / 2;
            const wallY = current.y + next.dir.dy / 2;
            maze[wallY][wallX] = 0;
            stack.push({x: next.x, y: next.y});       // 将邻居加入栈
        } else {
            stack.pop(); // 回溯
        }
    }
    const extraPaths = Math.floor((width * height) * 0.1); 
    for (let i = 0; i < extraPaths; i++) {
        // 确保x和y在1到width-2和height-2之间，避免修改边界
        const x = Math.floor(Math.random() * (width - 2)) + 1;
        const y = Math.floor(Math.random() * (height - 2)) + 1;
        if (!(x === startX && y === startY) &&   // 确保不是玩家初始位置和出口位置，并且不是边界
            !(x === width - 2 && y === height - 2) &&
            !(x === Math.floor(width / 2) && y === height - 2) &&
            !(x === width - 2 && y === Math.floor(height / 2)) &&
            x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            maze[y][x] = 0;
        }
    }
    return maze;
}
function generateExits(mazeWidth, mazeHeight) {// 生成出口
    exitPositions = [    // 出口位置右下角落
        {x: mazeWidth - 2, y: mazeHeight - 2}
    ];
    for (const exit of exitPositions) {    // 确保出口是通路
        maze[exit.y][exit.x] = 0;
    }
    const exit = exitPositions[0];  // 只打通出口位置的墙壁，保留其他边界
    if (exit.x === mazeWidth - 2) {
        maze[exit.y][exit.x + 1] = 0;
    }
    if (exit.y === mazeHeight - 2) {
        maze[exit.y + 1][exit.x] = 0;
    }
}
function generateCoins(count) { // 生成金币
    const mazeWidth = maze[0].length;
    const mazeHeight = maze.length;
    for (let i = 0; i < count; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (mazeWidth - 2)) + 1;
            y = Math.floor(Math.random() * (mazeHeight - 2)) + 1;
        } while (
            maze[y][x] === 1 ||
            (x === player.x && y === player.y) ||
            exitPositions.some(exit => exit.x === x && exit.y === y) ||
            coins.some(coin => coin.x === x && coin.y === y) ||
            traps.some(trap => trap.x === x && trap.y === y) ||
            chests.some(chest => chest.x === x && chest.y === y)
        );
        coins.push({x, y, value: Math.floor(Math.random() * 3) + 3});
    }
}
let gameLoopId;// 全局变量：游戏循环ID
function gameLoop() { // 游戏循环
    if (currentScreen !== 'game' || isPaused) return;
    updateGame(); // 更新游戏状态
    drawGame(); // 绘制游戏
    checkGameEnd(); // 检查游戏结束条件
    gameLoopId = requestAnimationFrame(gameLoop); // 继续游戏循环
}
function updateGame() { // 更新游戏状态
    if (isPaused) return;
    const currentTime = Date.now();
    traps.forEach(trap => {
        // 如果陷阱可见，且距离隐藏还有1秒（即4秒后隐藏），显示提示
        if (trap.visible && trap.showUntil - currentTime > 0 && trap.showUntil - currentTime <= 1000) {
            showMessage('陷阱即将隐藏！');
        }
        if (trap.visible && currentTime > trap.showUntil) {  // 时间到了，隐藏陷阱
            trap.visible = false;
        }
    });
    updateMonsters(); // 更新怪物
    checkCollisions(); // 检查玩家与物品的碰撞
    updatebuffs(); // 更新buff
}

function checkGameEnd() {// 检查游戏结束条件
    if (lives <= 0) {
        endGame(false);
    }
}
function endGame(victory) {// 结束游戏
    if (isGameOver || currentScreen !== 'game') { // 防止重复调用endGame
        return;
    }
    isGameOver = true; // 设置游戏结束标志位
    pauseGameTimer();      // 停止游戏计时器
    if (gameLoopId) {   // 停止游戏循环
        cancelAnimationFrame(gameLoopId);
        gameLoopId = undefined;
    }    
    clearInterval(buffUpdateInterval);  // 清理buff更新定时器    
    if (music && !music.paused) {
        music.pause();
        music.currentTime = 0;
    }
    if (victory) {
        playSound('gameWin');
    } else {
        playSound('gameLose');
    }
    const finalGameTime = elapsedGameTime > 0 ? elapsedGameTime : (Date.now() - gameStartTime);    
    const gameResult = {
        mode: gameMode,
        time: finalGameTime,
        gold: gold,
        remainingLives: lives,
        monsterHits: monsterHits,
        victory: victory
    };
    saveGameResult(gameResult);
    showGameOver(victory, gameResult);
}

function backToMenu() {// 返回主菜单
    if (gameLoopId) {    // 停止游戏循环
        cancelAnimationFrame(gameLoopId);
        gameLoopId = undefined;
    }
    if (DOM.gameOverScreen) {// 隐藏游戏结束界面（如果存在）
        DOM.gameOverScreen.classList.add('hidden');
    }
    player = null;
    maze = null;
    traps = [];
    coins = [];
    chests = [];
    monsters = [];
    inventory = [];
    buffs = [];
    showScreen('start');
}
function restartGame() {// 重新开始游戏
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
        gameOverScreen.classList.add('hidden');
    }
    clearInterval(buffUpdateInterval);
    elapsedGameTime = 0;  // 重置游戏计时器
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    startGame(gameMode);// 重新开始游戏
}
function saveGameResult(result) {// 保存游戏结果
    const leaderboard = JSON.parse(localStorage.getItem('mazeLeaderboard') || '[]');
    leaderboard.push(result);
    localStorage.setItem('mazeLeaderboard', JSON.stringify(leaderboard));
}
function handleKeyPress(e) {// 处理键盘输入
    e.preventDefault(); // 阻止默认行为，避免页面滚动
    switch(e.key) {
        case 'Escape':
            if (currentScreen === 'game') {  // 返回菜单
                showScreen('start'); 
            }
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            handlePlayerMove(0, -1);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            handlePlayerMove(1, 0);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            handlePlayerMove(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            handlePlayerMove(-1, 0);
            break;
        case 'h':
        case 'H':
            if (currentScreen === 'game') showScreen('shop');
            break;
        case ' ':
            if (currentScreen === 'game') {
                const pauseScreenVisible = DOM.pauseScreen && !DOM.pauseScreen.classList.contains('hidden');
                if (!pauseScreenVisible) {
                    if (isPaused) {
                        resumeGame();  // 当前是游戏界面且游戏已暂停，恢复游戏
                    } else {
                        pauseGame();   // 当前是游戏界面且游戏正在运行，暂停游戏
                    }
                }
            }
            break;
        case '1':
            if (currentScreen === 'game') useItem(0);
            break;
        case '2':
            if (currentScreen === 'game') useItem(1);
            break;
        case '3':
            if (currentScreen === 'game') useItem(2);
            break;
        case '4':
            if (currentScreen === 'game') useItem(3);
            break;
        case '5':
            if (currentScreen === 'game') useItem(4);
            break;
        case '6':
            if (currentScreen === 'game') useItem(5);
            break;
    }
}
function handlePlayerMove(dx, dy) { // 处理玩家移动
    if (isPaused) return;
    if (!player) return;
    if (!maze) return;
    const freezebuff = buffs.find(buff => buff.type === 'freeze'); // 检查是否被定身
    if (freezebuff) return; // 定身时无法移动
    const reversebuff = buffs.find(buff => buff.type === 'reverse');    // 检查buff
    if (reversebuff) {
        dx = -dx;
        dy = -dy;
    }
    const newX = player.x + dx;
    const newY = player.y + dy;
    if (newX >= 0 &&newX < maze[0].length &&newY >= 0 &&newY < maze.length &&
        maze[Math.floor(newY)][Math.floor(newX)] === 0) {
        player.x = newX;
        player.y = newY;
        checkCollisions();
        drawGame();
    }
        if (newX >= 0 && newX < maze[0].length && newY >= 0 && newY < maze.length) {
        }
}
function addbuff(type, duration) {// 添加buff
    if (isPaused) return; // 游戏暂停时不添加新的buff
    buffs = buffs.filter(buff => buff.type !== type); // 移除同类型的buff
    buffs.push({
        type,
        expiresAt: Date.now() + duration
    });
    updatebuffDisplay(); // 立即更新buff显示
}
function updatebuffs() {// 更新buff
    if (isPaused) return; // 游戏暂停时不更新buff
    const now = Date.now();
    buffs = buffs.filter(buff => buff.expiresAt > now);  // 移除过期的buff
    updatebuffDisplay();// 更新buff显示
    const monstersCount = document.getElementById('monsters-count');
    if (monstersCount) {    // 更新怪物数量显示
        monstersCount.textContent = monsters.length;
    }
}
function updatebuffDisplay() {// 更新buff显示
    if (isPaused) return; // 游戏暂停时不更新buff显示
    const buffList = document.getElementById('buff-list');
    if (!buffList) return;
    buffList.innerHTML = '';// 清空当前显示
    buffs.forEach(buff => {    // 为每个buff创建显示元素
        const buffElement = document.createElement('div');
        buffElement.className = 'buff';
        let buffName = '';
        switch(buff.type) {
            case 'freeze':
                buffName = '定身';
                break;
            case 'reverse':
                buffName = '操作反向';
                break;
            case 'shield':
                buffName = '防护盾';
                break;
            case 'trapDetector':
                buffName = '陷阱探测器';
                break;
            case 'fan':
                buffName = '风扇';
                break;
            default:
                buffName = buff.type;
        }
        const remainingTime = Math.ceil((buff.expiresAt - Date.now()) / 1000);
        buffElement.textContent = `${buffName} (${remainingTime}s)`;
        buffElement.classList.add(`buff-${buff.type}`);  // 根据buff类型设置不同的样式
        buffList.appendChild(buffElement);
    });
}
// -----------------检查碰撞----------------------
function checkCollisions() { // 检查碰撞
    checkCoinCollisions(); // 检查与金币的碰撞
    checkTrapCollisions(); // 检查与陷阱的碰撞
    checkChestCollisions(); // 检查与宝箱的碰撞
    checkMonsterCollisions(); // 检查与怪物的碰撞
    checkExitCollisions(); // 检查与出口的碰撞
}
function checkCoinCollisions() { // 检查金币碰撞
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        if (Math.floor(player.x) === coin.x && Math.floor(player.y) === coin.y) {
            gold += coin.value;
            coins.splice(i, 1);
            playSound('coinChest');
            showMessage(`获得 ${coin.value} 金币！`);
            updateDisplay();
        }
    }
}
function checkTrapCollisions() { // 检查陷阱碰撞
    for (const trap of traps) {//陷阱激活 + 玩家坐标（取整）和陷阱坐标一致
        if (trap.active && Math.floor(player.x) === trap.x && Math.floor(player.y) === trap.y) {
            activateTrap(trap);// 触发陷阱效果
            trap.active = false;//陷阱失效（避免重复触发）
        }
    }
}
function checkChestCollisions() { // 检查宝箱碰撞
    for (const chest of chests) { // 条件：宝箱未打开 + 玩家坐标（取整）和宝箱坐标一致
        if (!chest.opened && Math.floor(player.x) === chest.x && Math.floor(player.y) === chest.y) {
            openChest(chest);
        }
    }
}

function checkMonsterCollisions() { // 检查怪物碰撞
    // 从后向前遍历怪物数组，确保在移除元素时不会影响后续元素的索引
    for (let i = monsters.length - 1; i >= 0; i--) {
        const monster = monsters[i];
        if (
            Math.abs(player.x - monster.x) < 0.5 &&
            Math.abs(player.y - monster.y) < 0.5
        ) {
            handleMonsterCollision(monster);
            monsters.splice(i, 1);   // 从怪物数组中移除该怪物
        }
    }
}
function checkExitCollisions() { // 检查出口碰撞
    for (const exit of exitPositions) {
        if (Math.floor(player.x) === exit.x && Math.floor(player.y) === exit.y) {
            endGame(true);
            return;
        }
    }
}

// ---------------------------- 按钮系统 ----------------------------
function bindEventListeners() { // 绑定事件监听器
    const startGameBtn = document.getElementById('start-game'); // 开始界面按钮
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('difficulty'); // 先显示难度选择界面
        });
    }
    const difficultySelectBtn = document.getElementById('difficulty-select');//难度选择按钮
    if (difficultySelectBtn) {
        difficultySelectBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('difficulty');
        });
    } 
    const settingsBtn = document.getElementById('settings');//设置按钮
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('settings');
            // 确保设置界面打开时，音乐和音效开关状态与当前设置一致
            const soundStatusSpan = document.getElementById('sound-status');
            if (soundStatusSpan) {
                soundStatusSpan.textContent = soundEffectsEnabled ? '开' : '关';
            }
            const musicStatusSpan = document.getElementById('music-status');
            if (musicStatusSpan) {
                musicStatusSpan.textContent = musicEnabled ? '开' : '关';
            }
        });
    } 
    const leaderboardBtn = document.getElementById('leaderboard');//排行榜按钮
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('ranking');
        });
    } 
    const recordBtn = document.getElementById('record');//对局记录按钮
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('leaderboard');
        });
    } 
    const instructionsBtn = document.getElementById('instructions');//说明按钮
    if (instructionsBtn) {
        instructionsBtn.addEventListener('click', () => {
            playSound('buttonClick');
            
            showScreen('instructions');
        });
    }  
    const easyModeBtn = document.getElementById('easy-mode');  // 难度选择按钮
    if (easyModeBtn) {
        easyModeBtn.addEventListener('click', () => {
            playSound('buttonClick');
            startGame('easy');
        });
    }
    const hardModeBtn = document.getElementById('hard-mode');
    if (hardModeBtn) {
        hardModeBtn.addEventListener('click', () => {
            playSound('buttonClick');
            startGame('hard');
        });
    }
    const backToStartBtn = document.getElementById('back-to-start');
    if (backToStartBtn) {
        backToStartBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('start');
        });
    }   
    const pauseGameBtn = document.getElementById('pause-game');    // 游戏控制按钮
    if (pauseGameBtn) {
        pauseGameBtn.addEventListener('click', () => {
            playSound('buttonClick');
            pauseGame();
        });
    }
    const openShopBtn = document.getElementById('open-shop');//商店按钮
    if (openShopBtn) {
        openShopBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('shop');
            updateShopDisplay(); // 打开商店时更新物品显示
        });
    }
    const openSettingsBtn = document.getElementById('open-settings');//设置按钮
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('settings');
        });
    }
    const backToMenuBtn = document.getElementById('back-to-menu');//返回菜单按钮
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            playSound('buttonClick');
            backToMenu();
        });
    }    
    const closeShopBtn = document.getElementById('close-shop');// 商店按钮
    if (closeShopBtn) {
        closeShopBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('game');
        });
    }
    const refreshShopBtn = document.getElementById('refresh-shop');//刷新商店按钮
    if (refreshShopBtn) {
        refreshShopBtn.addEventListener('click', () => {
            playSound('buttonClick');
            refreshShop();
        });
    }
    const backFromLeaderboardBtn = document.getElementById('back-from-leaderboard');// 排行榜返回按钮
    if (backFromLeaderboardBtn) {
        backFromLeaderboardBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('start');
        });
    }   
    const backFromRankingBtn = document.getElementById('back-from-ranking');// 排行榜返回按钮
    if (backFromRankingBtn) {
        backFromRankingBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('start');
        });
    }   
    const backFromInstructionsBtn = document.getElementById('back-from-instructions');  // 操作说明返回按钮
    if (backFromInstructionsBtn) {
        backFromInstructionsBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('start');
        });
    }
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageIndicator = document.getElementById('page-indicator');  // 操作说明翻页功能
    const pages = document.querySelectorAll('.instructions-page');
    let currentPage = 0;
    function updatePageDisplay() {   // 更新页码显示
    pages.forEach(page => page.classList.remove('active'));      // 隐藏所有页面
    pages[currentPage].classList.add('active');// 显示当前页面
    pageIndicator.textContent = `${currentPage + 1}/${pages.length}`;    // 更新页码指示器
    prevPageBtn.disabled = currentPage === 0;  // 更新按钮状态
    nextPageBtn.disabled = currentPage === pages.length - 1;
    }
    prevPageBtn.addEventListener('click', () => {//上一页按钮
        playSound('buttonClick');
        if (currentPage > 0) {
            currentPage--;
            updatePageDisplay();
        }
    });
    nextPageBtn.addEventListener('click', () => {    // 下一页按钮
        playSound('buttonClick');
        if (currentPage < pages.length - 1) {
            currentPage++;
            updatePageDisplay();
        }
    });
    updatePageDisplay();// 初始化页码显示
    const restartGameBtn = document.getElementById('restart-game');  // 游戏结束按钮
    if (restartGameBtn) {
        restartGameBtn.addEventListener('click', () => {
            playSound('buttonClick');
            restartGame();
        });
    }
    const restartGameInGameBtn = document.getElementById('restart-game-in-game');//重新开始按钮
    if (restartGameInGameBtn) {
        restartGameInGameBtn.addEventListener('click', () => {
            playSound('buttonClick');
            restartGame();
        });
    }
    const quitToStartBtn = document.getElementById('quit-to-start');//退出菜单按钮
    if (quitToStartBtn) {
        quitToStartBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen('start');
            const gameOverScreen = document.getElementById('game-over-screen');
            if (gameOverScreen) {
                gameOverScreen.classList.add('hidden');
            }
        });
    }
    const backFromSettingsBtn = document.getElementById('back-from-settings');   // 设置界面返回按钮
    if (backFromSettingsBtn) {
        backFromSettingsBtn.addEventListener('click', () => {
            playSound('buttonClick');
            showScreen(previousScreenBeforeSettings);
        });
    }   
    const soundEffectsToggleBtn = document.getElementById('sound-effects-toggle'); // 设置界面音效开关
    if (soundEffectsToggleBtn) {
        soundEffectsToggleBtn.addEventListener('click', () => {
            toggleSoundEffects();
            playSound('buttonClick');
            const soundStatusSpan = document.getElementById('sound-status');           // 更新按钮文本
            if (soundStatusSpan) {
                soundStatusSpan.textContent = soundEffectsEnabled ? '开' : '关';
            }
        });
    }
    const musicToggleBtn = document.getElementById('music-toggle'); // 设置界面音乐开关
    if (musicToggleBtn) {
        musicToggleBtn.addEventListener('click', () => {
            toggleMusic();
            playSound('buttonClick');
            const musicStatusSpan = document.getElementById('music-status'); // 更新按钮文本
            if (musicStatusSpan) {
                musicStatusSpan.textContent = musicEnabled ? '开' : '关';
            }
        });
    }
    document.addEventListener('keydown', handleKeyPress);
}
//-----------------时间--------------
function formatTime(ms) {// 格式化时间
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
function startGameTimer() {// 开始游戏计时器
    if (gameTimer) {
        clearInterval(gameTimer);
    }  
    if (elapsedGameTime > 0) {
        gameStartTime = Date.now() - elapsedGameTime;
    }   
    gameTimer = setInterval(() => {
        const elapsedTime = Date.now() - gameStartTime;
        const gameTimeElement = document.getElementById('game-time');
        if (gameTimeElement) {
            gameTimeElement.textContent = formatTime(elapsedTime);
        }
    }, 1000);
}
function pauseGameTimer() {// 暂停游戏计时器
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
        // 保存暂停前累计的游戏时间
        elapsedGameTime = Date.now() - gameStartTime;
    }
}
function pauseGame(showPauseUI = true) {//暂停游戏
    if (isPaused) return; // 避免重复暂停
    isPaused = true; // 设置游戏暂停标记
    // 暂停游戏计时器
    pauseGameTimer();
    // 暂停游戏循环
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    // 暂停buff更新定时器
    clearInterval(buffUpdateInterval);
    // 暂停迷雾生成计时器
    if (!isFogActive) {
        if (fogStartTime) {
            fogElapsedTime = Date.now() - fogStartTime;
        }
        // 清除所有迷雾定时器
        fogTimers.forEach(timerId => clearTimeout(timerId));
        fogTimers = [];
    }
    // 清除所有临时定时器
    tempTimers.forEach(timerId => clearTimeout(timerId));
    tempTimers = [];
    // 暂停背景音乐
    if (music && showPauseUI) {
        music.pause();
    }
    // 显示暂停界面
    if (showPauseUI) {
        showPauseScreen();
    }
}
function resumeGame() {//恢复游戏
    if (!isPaused) return; // 避免重复恢复
    isPaused = false; // 取消游戏暂停标记
    startGameTimer();  // 恢复游戏计时器
    if (!gameLoopId) {  // 恢复游戏循环
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    buffUpdateInterval = setInterval(updatebuffs, 1000);   // 恢复buff更新定时器
    if (!isFogActive) { // 恢复迷雾生成计时器
        fogStartTime = Date.now();
        const remainingTimeToWarning = Math.max(0, 9000 - fogElapsedTime);
        const remainingTimeToFog = Math.max(0, 10000 - fogElapsedTime);
        if (remainingTimeToWarning > 0) {// 设置新的迷雾定时器
            const warningTimer = setTimeout(() => {
                if (!isPaused) showMessage('即将生成迷雾...');
            }, remainingTimeToWarning);
            fogTimers.push(warningTimer);
        } else if (remainingTimeToFog > 0 && !isPaused) {
            showMessage('即将生成迷雾...');
        }
        if (remainingTimeToFog > 0) {
            const fogTimer = setTimeout(() => {
                if (!isPaused) isFogActive = true;
            }, remainingTimeToFog);
            fogTimers.push(fogTimer);
        } else {
            isFogActive = true;
        }
    }
    if (music && soundEnabled && musicEnabled && music.paused) {  // 恢复背景音乐
        music.play().catch(() => { // 播放失败时的处理
        });
    }
}

function showScreen(screenName) {// 显示指定屏幕
    document.querySelectorAll('.screen').forEach(screen => {    // 隐藏所有屏幕
        screen.classList.add('hidden');
    });
    const previousScreen = currentScreen;// 保存当前屏幕状态
    currentScreen = screenName;
    if (previousScreen === 'game' && screenName !== 'game') { // 如果从游戏界面切换到其他界面，暂停游戏
        pauseGame(false); // 暂停游戏但不显示暂停界面
    } else if (previousScreen !== 'game' && screenName !== 'game') { // 如果在非游戏界面之间切换，保持游戏暂停状态
        if (!isPaused) {
            pauseGame(false); // 暂停游戏但不显示暂停界面
        }
    }
    if (music && soundEnabled && musicEnabled) {   // 如果音乐已加载且启用，在任何界面都播放音乐
        if (music.paused) {
            music.play().catch(() => {
            });
        }
    }
    if (previousScreen !== 'game' && screenName === 'game') {// 如果从其他界面切换到游戏界面，恢复游戏
        resumeGame(); // 恢复游戏
        isPaused = false; // 取消游戏暂停标志
    }
    switch(screenName) {// 显示指定屏幕
        case 'start':
            DOM.startScreen.classList.remove('hidden');
            break;
        case 'difficulty':
            DOM.difficultyScreen.classList.remove('hidden');
            break;
        case 'game':
            DOM.gameScreen.classList.remove('hidden');
            setTimeout(() => { // 确保游戏界面获得焦点，以便键盘事件能够被触发
                if (canvas) {
                    canvas.setAttribute('tabindex', '0');
                    canvas.focus();
                    if (canvas !== document.activeElement) {
                        canvas.click();
                    }
                }
            }, 100);
            break;
        case 'shop':
            DOM.shopScreen.classList.remove('hidden');
            break;
        case 'leaderboard':
            DOM.leaderboardScreen.classList.remove('hidden');
            updateLeaderboard();
            break;
        case 'ranking':
            DOM.rankingScreen.classList.remove('hidden');
            updateRanking();
            break;
        case 'instructions':
            DOM.instructionsScreen.classList.remove('hidden');
            break;
        case 'settings':  // 保存进入设置界面之前的屏幕
            previousScreenBeforeSettings = previousScreen; 
            // 根据进入设置界面之前的屏幕类型设置不同的背景
            DOM.settingsScreen.classList.remove('menu-background', 'game-background');
            if (previousScreenBeforeSettings === 'start' || previousScreenBeforeSettings === 'difficulty' || 
                previousScreenBeforeSettings === 'leaderboard' || previousScreenBeforeSettings === 'ranking' || 
                previousScreenBeforeSettings === 'instructions') {
                DOM.settingsScreen.classList.add('menu-background');
            } else {
                DOM.settingsScreen.classList.add('game-background');
            }
            DOM.settingsScreen.classList.remove('hidden');
            break;
    }
    currentScreen = screenName;
}
function showMessage(text) {// 显示消息
    if (DOM.messageText) {
        DOM.messageText.textContent = text;
        DOM.messageText.style.display = 'block';
        DOM.messageText.style.opacity = '1';
        const messageHideTimer1 = setTimeout(() => { // 2秒后隐藏消息
            if (DOM.messageText) {
                DOM.messageText.style.opacity = '0';
                const messageHideTimer2 = setTimeout(() => {
                    if (DOM.messageText) {
                        DOM.messageText.style.display = 'none';
                    }
                }, 500); 
                tempTimers.push(messageHideTimer2);
            }
        }, 2000);
        tempTimers.push(messageHideTimer1);
    }
}
function showPauseScreen() {//显示暂停界面
    if (DOM.pauseScreen) { // 检查是否已经存在暂停界面
        return;
    }
    const pauseScreen = document.createElement('div');// 创建暂停界面
    pauseScreen.id = 'pause-screen';
    pauseScreen.className = 'screen overlay';    
    pauseScreen.innerHTML = `
        <div class="pause-content">
            <h2>游戏暂停</h2>
            <button id="resume-game-btn" class="resume-btn">取消暂停</button>
        </div>
    `;    
    if (DOM.gameContainer) {  // 添加到游戏容器
        DOM.gameContainer.appendChild(pauseScreen);
        DOM.pauseScreen = pauseScreen;
    }
    const resumeBtn = pauseScreen.querySelector('#resume-game-btn');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            resumeGame();
            pauseScreen.remove();
            DOM.pauseScreen = null;
        });
    }
    const handlePauseKeyPress = (e) => {
        if (e.key === ' ') {
            e.preventDefault();
            resumeGame();
            pauseScreen.remove();
            DOM.pauseScreen = null;
            document.removeEventListener('keydown', handlePauseKeyPress);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            resumeGame();
            pauseScreen.remove();
            DOM.pauseScreen = null;
            document.removeEventListener('keydown', handlePauseKeyPress);
            showScreen('start');
        }
    };
    document.addEventListener('keydown', handlePauseKeyPress);
}
function showGameOver(victory, gameResult) {// 显示游戏结束界面
    const gameOverScreen = DOM.gameOverScreen;
    if (!gameOverScreen) {
        return;
    }
    const titleElement = gameOverScreen.querySelector('h2');    // 更新标题
    const victoryText = victory ? '恭喜你逃离了迷宫！' : '游戏结束，你被怪物击败了！';
    const victoryClass = victory ? 'victory' : 'defeat';
    if (titleElement) {
        titleElement.textContent = victoryText;
        titleElement.className = victoryClass;
    }
    const timeElement = gameOverScreen.querySelector('#final-time');
    const goldElement = gameOverScreen.querySelector('#final-gold');
    const monsterHitsElement = gameOverScreen.querySelector('#final-monster-hits');
    if (timeElement) {
        timeElement.textContent = formatTime(gameResult.time);
    }
    if (goldElement) {
        goldElement.textContent = gameResult.gold;
    }
    if (monsterHitsElement) {
        monsterHitsElement.textContent = gameResult.monsterHits;
    }
    gameOverScreen.classList.remove('hidden');   // 显示游戏结束界面
}
function updateDisplay() {// 更新显示
    if (DOM.goldCount) {
        DOM.goldCount.textContent = gold;
    }
    if (DOM.livesCount) {
        DOM.livesCount.textContent = lives;
    }
    if (DOM.monstersCount) {
        DOM.monstersCount.textContent = monsters.length;
    }
    if (DOM.gameScreen && !DOM.gameScreen.classList.contains('hidden')) {
        updateInventory();
        updateShopDisplay();
    }
}
function updateLeaderboard() {// 更新对局记录
    const matchHistory = JSON.parse(localStorage.getItem('mazeLeaderboard') || '[]');
    DOM.matchHistoryList.innerHTML = '';    // 清空对局记录
    const headerRow = document.createElement('div'); // 添加标题行
    headerRow.className = 'leaderboard-header';
    headerRow.innerHTML = `
        <div>模式</div>
        <div>时间</div>
        <div>剩余血量</div>
        <div>是否获胜</div>
    `;
    DOM.matchHistoryList.appendChild(headerRow);
    const recentGames = matchHistory.slice(-10).reverse();    // 显示最近10条记录
    if (recentGames.length === 0) {
        DOM.matchHistoryList.innerHTML = '<div style="text-align: center; padding: 20px;">暂无对局记录</div>';
        return;
    }
    for (const game of recentGames) {    // 创建对局记录条目
        const entry = document.createElement('div');
        entry.className = `leaderboard-entry ${game.mode}-mode`;
        const modeText = game.mode === 'easy' ? '普通模式' : game.mode === 'hard' ? '困难模式' : game.mode;
        const victoryText = game.victory ? '成功' : '失败';
        entry.innerHTML = `
            <div>${modeText}</div>
            <div>${formatTime(game.time)}</div>
            <div>${game.remainingLives} 点</div>
            <div>${victoryText}</div>
        `;
        DOM.matchHistoryList.appendChild(entry);
    }
}
function updateRanking() {// 更新排行榜
    const matchHistory = JSON.parse(localStorage.getItem('mazeLeaderboard') || '[]');
    DOM.easyLeaderboard.innerHTML = '';// 更新排行榜
    DOM.hardLeaderboard.innerHTML = '';
    const easyGames = matchHistory.filter(game => game.mode === 'easy');// 将记录按模式分类
    const hardGames = matchHistory.filter(game => game.mode === 'hard');
    const sortGames = (games) => {  // 对记录进行排序：按时间升序，相同时间按剩余血量降序
        return games.sort((a, b) => {
            if (a.time !== b.time) {
                return a.time - b.time;
            }
            return b.remainingLives - a.remainingLives;
        });
    };
    const sortedEasyGames = sortGames(easyGames).slice(0, 10); // 取前10名
    const sortedHardGames = sortGames(hardGames).slice(0, 10); // 取前10名
    const showEmptyState = (container) => {
        container.innerHTML = '<div style="text-align: center; padding: 20px;">暂无对局记录</div>';
    };
    const displayLeaderboard = (container, games, mode) => {
        if (games.length === 0) {
            showEmptyState(container);
            return;
        }
        const headerRow = document.createElement('div');
        headerRow.className = 'leaderboard-header';
        headerRow.innerHTML = `
            <div>排名</div>
            <div>时间</div>
            <div>剩余血量</div>
            <div>是否获胜</div>
        `;
        container.appendChild(headerRow);
        for (let i = 0; i < games.length; i++) {
            const game = games[i];
            const entry = document.createElement('div');
            entry.className = `leaderboard-entry ${mode}-mode`;
            const victoryText = game.victory ? '成功' : '失败';
            entry.innerHTML = `
                <div>${i + 1}</div>
                <div>${formatTime(game.time)}</div>
                <div>${game.remainingLives} 点</div>
                <div>${victoryText}</div>
            `;
            container.appendChild(entry);
        }
    };
    displayLeaderboard(DOM.easyLeaderboard, sortedEasyGames, 'easy');
    displayLeaderboard(DOM.hardLeaderboard, sortedHardGames, 'hard');
}
function findPathCells() {// 辅助函数：在路径上找到单元格
    const pathCells = [];
    const mazeWidth = maze[0].length;
    const mazeHeight = maze.length;
    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            if (maze[y][x] === 0) {
                pathCells.push({x, y});
            }
        }
    }
    return pathCells.sort(() => Math.random() - 0.5);//随机排序
}
window.addEventListener('DOMContentLoaded', initGame);// 页面加载完成后初始化游戏
