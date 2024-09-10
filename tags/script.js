let currentScene = 0;  
  
const scenes = [  
    {  
        id: 0,  
        text: "Wandering for what? Do you know?：",
        choices: [  
            { text: '继续前行', action: 'goForward' },  
            { text: '返回原路', action: 'turnBack' },  
            { text: '寻找声音来源', action: 'searchSounds' } // 新增选项  
        ]  
    },  
    {  
        id: 1,  
        text: "你决定继续前行，穿过密林。突然，你发现一条清澈的小溪，水流声正是你之前听到的声音。",  
        choices: [  
            { text: '跟随小溪走', action: 'followStream' },  
            { text: '离开小溪继续探索', action: 'leaveStream' }  
        ]  
    },  
    // ... 添加更多场景 ...  
    {  
        id: 2,  
        text: "你决定返回原路，但发现来时的路被藤蔓挡住了。你必须：",  
        choices: [  
            { text: '清除藤蔓', action: 'clearVines' },  
            { text: '寻找其他出路', action: 'findOtherWay' }  
        ]  
    },  
    // ...  
];  
  
function chooseAction(action) {  
    for (let scene of scenes) {  
        if (scene.choices.some(choice => choice.action === action)) {  
            // 找到对应的场景转移逻辑（这里简单使用场景ID递增作为示例）  
            // 实际游戏中，你可能需要根据action来查找下一个场景ID  
            const nextSceneIndex = scenes.findIndex(s => s.choices.some(c => c.action === action && s.id > currentScene.id));  
            if (nextSceneIndex !== -1) {  
                currentScene = nextSceneIndex;  
                updateStory();  
                return;  
            }  
        }  
    }  
    document.getElementById('feedback').textContent = '无效的选择，请重试。';  
}  
  
function updateStory() {  
    const storyElement = document.getElementById('story');  
    const feedbackElement = document.getElementById('feedback');  
    const choiceContainer = document.getElementById('choice-container');  
  
    // 清空当前选择和反馈  
    choiceContainer.innerHTML = '';  
    feedbackElement.textContent = '';  
  
    // 显示当前场景的故事文本  
    storyElement.textContent = scenes[currentScene].text;  
  
    // 生成当前场景的选择按钮  
    scenes[currentScene].choices.forEach(choice => {  
        const button = document.createElement('button');  
        button.textContent = choice.text;  
        button.onclick = () => chooseAction(choice.action);  
        choiceContainer.appendChild(button);  
    });  
}  
  
// 初始化游戏  
updateStory();