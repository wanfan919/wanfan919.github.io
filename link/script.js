let currentScene = 0;  
  
const scenes = [  
    {  
        text: "你决定继续前行，穿过密林。突然，你听到远处传来奇怪的声音。",  
        choices: ['goForward', 'searchSounds']  
    },  
    {  
        text: "你决定返回原路，但发现来时的路已经消失在茂密的树木中。你感到有些不安。",  
        choices: ['stayCalm', 'panic']  
    },  
    // 可以继续添加更多的场景  
];  
  
let choicesMap = {  
    'goForward': 1, // 跳转到场景1  
    'turnBack': 1, // 假设返回也进入场景1，但逻辑上可能需要调整  
    'searchSounds': 2, // 假设存在场景2  
    // 其他选择对应的场景编号  
};  
  
function chooseAction(action) {  
    const nextSceneIndex = choicesMap[action];  
    if (nextSceneIndex !== undefined && nextSceneIndex < scenes.length) {  
        currentScene = nextSceneIndex;  
        updateStory();  
    } else {  
        document.getElementById('feedback').textContent = '无效的选择，请重试。';  
    }  
}  
  
function updateStory() {  
    const storyElement = document.getElementById('story');  
    const feedbackElement = document.getElementById('feedback');  
    storyElement.textContent = scenes[currentScene].text;  
    feedbackElement.textContent = ''; // 清空反馈  
  
    // 假设每个场景都有两个选择按钮  
    const buttons = document.getElementsByTagName('button');  
    for (let i = 0; i < buttons.length; i++) {  
        buttons[i].remove(); // 移除所有现有按钮  
    }  
  
    // 添加新场景的按钮  
    for (let choice of scenes[currentScene].choices) {  
        const button = document.createElement('button');  
        button.textContent = choice.charAt(0).toUpperCase() + choice.slice(1); // 首字母大写  
        button.onclick = () => chooseAction(choice);  
        document.body.appendChild(button);  
    }  
}  
  
// 初始化游戏  
updateStory();