const quizSubmit = document.getElementById('quiz-submit');
const quizFeedback = document.getElementById('quiz-feedback');

quizSubmit.addEventListener('click', () => {
  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected) {
    quizFeedback.textContent = '请先选择一个答案。';
    quizFeedback.className = 'feedback error';
    return;
  }

  const correct = selected.value === 'elephant' || selected.value === 'zebra';
  quizFeedback.textContent = correct ? '回答正确！大象和斑马都属于草食性动物。' : '回答错误，再试试看。';
  quizFeedback.className = `feedback ${correct ? 'ok' : 'error'}`;
});

const scenes = {
  start: {
    text: '你醒来后发现自己身处雾气弥漫的森林，远处有微弱光点闪烁。你决定：',
    choices: [
      { label: '朝光点前进', next: 'light' },
      { label: '沿溪流寻找出口', next: 'river' }
    ]
  },
  light: {
    text: '你靠近光点，发现是一盏悬浮的灯笼。它照亮了一条石路。',
    choices: [
      { label: '沿石路继续走', next: 'safe' },
      { label: '回到原地', next: 'start' }
    ]
  },
  river: {
    text: '你沿着溪流前进，听到水声愈发湍急，前方像是瀑布边缘。',
    choices: [
      { label: '停下观察地形', next: 'safe' },
      { label: '冒险跳下去', next: 'fail' }
    ]
  },
  safe: {
    text: '你找到一条安全小径并成功走出森林。',
    choices: [{ label: '重新开始', next: 'start' }],
    feedback: '结局：你顺利脱困。'
  },
  fail: {
    text: '你踩空跌入深坑，幸好被藤蔓拦住，但暂时无法离开。',
    choices: [{ label: '重新开始', next: 'start' }],
    feedback: '结局：这次冒险失败了。'
  }
};

const story = document.getElementById('story');
const adventureActions = document.getElementById('adventure-actions');
const adventureFeedback = document.getElementById('adventure-feedback');

function renderScene(sceneKey) {
  const scene = scenes[sceneKey];
  story.textContent = scene.text;
  adventureFeedback.textContent = scene.feedback || '';
  adventureFeedback.className = `feedback ${sceneKey === 'safe' ? 'ok' : sceneKey === 'fail' ? 'error' : ''}`.trim();

  adventureActions.innerHTML = '';
  scene.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = choice.label;
    button.addEventListener('click', () => renderScene(choice.next));
    adventureActions.appendChild(button);
  });
}

renderScene('start');
