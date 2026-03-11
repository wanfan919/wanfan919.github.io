const quizSubmit = document.getElementById('quiz-submit');
const quizFeedback = document.getElementById('quiz-feedback');

quizSubmit.addEventListener('click', () => {
  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected) {
    quizFeedback.textContent = '你还没有选择答案。';
    quizFeedback.className = 'feedback error';
    return;
  }

  const correct = selected.value === 'balance';
  quizFeedback.textContent = correct
    ? '回答正确：WF 的风格在理性与幻想的拉扯里生长。'
    : '这个答案偏离了 WF 的气质，再感受一次故事张力吧。';
  quizFeedback.className = `feedback ${correct ? 'ok' : 'error'}`;
});

const story = document.getElementById('story');
const speaker = document.getElementById('speaker');
const adventureActions = document.getElementById('adventure-actions');
const adventureFeedback = document.getElementById('adventure-feedback');
const statReason = document.getElementById('stat-reason');
const statFantasy = document.getElementById('stat-fantasy');
const statEcho = document.getElementById('stat-echo');

const state = { reason: 50, fantasy: 50, echo: 0 };

const scenes = {
  intro: {
    speaker: '旁白',
    text: '夜幕下，你在废弃剧场醒来。舞台中央漂浮着一枚写着“WF”的光符。',
    choices: [
      { label: '伸手触碰光符', next: 'touch', effect: { fantasy: 10, echo: 1 } },
      { label: '先观察周围痕迹', next: 'observe', effect: { reason: 10 } }
    ]
  },
  touch: {
    speaker: '投影少女',
    text: '“你终于来了。我们在每一次重写里，寻找一个完整的自我。”',
    choices: [
      { label: '询问她是谁', next: 'identity', effect: { reason: 5, echo: 1 } },
      { label: '直接跟她离开', next: 'corridor', effect: { fantasy: 8 } }
    ]
  },
  observe: {
    speaker: '你',
    text: '地面散落手稿，字句互相覆盖：理性是骨架，幻想是血肉。',
    choices: [
      { label: '整理手稿再前进', next: 'identity', effect: { reason: 8, echo: 1 } },
      { label: '点燃手稿照亮通道', next: 'corridor', effect: { fantasy: 5, reason: -3 } }
    ]
  },
  identity: {
    speaker: '投影少女',
    text: '“我是你删掉却始终回来的段落。你写我，也被我反写。”',
    choices: [
      { label: '接受共存', next: 'gate', effect: { fantasy: 6, echo: 1 } },
      { label: '坚持分离现实与虚构', next: 'gate', effect: { reason: 6 } }
    ]
  },
  corridor: {
    speaker: '旁白',
    text: '长廊两侧挂着失真的镜面，每一面都映出不同版本的你。',
    choices: [
      { label: '逐一凝视镜像', next: 'gate', effect: { fantasy: 7, echo: 1 } },
      { label: '闭眼快步穿过', next: 'gate', effect: { reason: 7 } }
    ]
  },
  gate: {
    speaker: '系统',
    text: '你抵达终端门扉。门锁要求：在理性与幻想之间找到可持续的平衡。',
    choices: [
      { label: '进行最终抉择', next: 'ending' }
    ]
  }
};

function applyEffect(effect = {}) {
  state.reason = Math.max(0, Math.min(100, state.reason + (effect.reason || 0)));
  state.fantasy = Math.max(0, Math.min(100, state.fantasy + (effect.fantasy || 0)));
  state.echo = Math.max(0, state.echo + (effect.echo || 0));
  updateStats();
}

function updateStats() {
  statReason.textContent = state.reason;
  statFantasy.textContent = state.fantasy;
  statEcho.textContent = state.echo;
}

function getEnding() {
  const delta = Math.abs(state.reason - state.fantasy);
  if (delta <= 10 && state.echo >= 3) {
    return {
      speaker: '终章 · 漂流合鸣',
      text: '门扉开启。你将理性写成航线，将幻想写成风，WF 在你手里成为可持续的漂流。',
      mood: 'ok'
    };
  }
  if (state.reason > state.fantasy) {
    return {
      speaker: '终章 · 冷光定式',
      text: '你建立了稳定却冰冷的秩序。故事不再失控，也不再发光。',
      mood: 'error'
    };
  }
  return {
    speaker: '终章 · 幻海迷航',
    text: '你沉入繁盛幻象，情绪汹涌却失去锚点。下一轮重写仍会继续。',
    mood: 'error'
  };
}

function renderScene(key) {
  if (key === 'ending') {
    const ending = getEnding();
    speaker.textContent = ending.speaker;
    story.textContent = ending.text;
    adventureFeedback.textContent = `结算：理性 ${state.reason} / 幻想 ${state.fantasy} / 回响 ${state.echo}`;
    adventureFeedback.className = `feedback ${ending.mood}`;
    adventureActions.innerHTML = '';

    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = '重开这段漂流';
    replay.addEventListener('click', () => {
      state.reason = 50;
      state.fantasy = 50;
      state.echo = 0;
      updateStats();
      adventureFeedback.textContent = '新一轮投影已加载。';
      adventureFeedback.className = 'feedback';
      renderScene('intro');
    });
    adventureActions.appendChild(replay);
    return;
  }

  const scene = scenes[key];
  speaker.textContent = scene.speaker;
  story.textContent = scene.text;

  adventureActions.innerHTML = '';
  scene.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = choice.label;
    button.addEventListener('click', () => {
      applyEffect(choice.effect);
      renderScene(choice.next);
    });
    adventureActions.appendChild(button);
  });
}

function initClickBurst() {
  document.addEventListener('pointerdown', (event) => {
    const burst = document.createElement('span');
    burst.className = 'click-burst';
    burst.style.left = `${event.clientX}px`;
    burst.style.top = `${event.clientY}px`;
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 650);
  });
}

function initParticleBackground() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let particles = [];
  const particleCount = 52;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.6 + 0.2
    };
  }

  function setup() {
    particles = Array.from({ length: particleCount }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(170, 202, 255, ${p.alpha})`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(128, 162, 255, ${(1 - dist / 120) * 0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  setup();
  draw();
  window.addEventListener('resize', () => {
    resize();
    setup();
  });
}

updateStats();
renderScene('intro');
initClickBurst();
initParticleBackground();
