const sections = document.querySelectorAll('.reveal');
const parallaxTargets = document.querySelectorAll('[data-speed]');
const cursorAura = document.getElementById('cursorAura');
const pulseToggle = document.getElementById('pulseToggle');
const hotList = document.getElementById('hotList');
const timeStamp = document.getElementById('timeStamp');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  document.body.classList.add('reduced-motion');
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

sections.forEach((el, idx) => {
  el.style.transitionDelay = `${Math.min(idx * 90, 540)}ms`;
  revealObserver.observe(el);
});

let effectsOn = true;
function setEffectsState(on) {
  effectsOn = on;
  document.body.classList.toggle('reduced-motion', !on || prefersReducedMotion);
  pulseToggle.textContent = `动效节奏: ${on ? 'ON' : 'OFF'}`;
}

pulseToggle.addEventListener('click', () => setEffectsState(!effectsOn));

if (!prefersReducedMotion) {
  window.addEventListener('scroll', () => {
    if (!effectsOn) return;
    const y = window.scrollY;
    parallaxTargets.forEach((el) => {
      const speed = Number(el.dataset.speed || 0);
      const offset = Math.round(y * speed * -0.2);
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
    });
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    if (!effectsOn || !cursorAura) return;
    cursorAura.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
}

const tiltCards = document.querySelectorAll('.tilt-card');

tiltCards.forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (!effectsOn) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -8;
    const ry = ((x / rect.width) - 0.5) * 12;
    card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  });

  card.addEventListener('pointerleave', () => {
    card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
  });
});

const hotSeed = [
  { topic: '春季校园音乐节阵容公布', score: 986411 },
  { topic: '国产科幻短片获国际大奖', score: 917233 },
  { topic: 'AI 辅助学习工具体验报告', score: 853110 },
  { topic: '城市晨跑路线热度飙升', score: 803957 },
  { topic: '独立开发者 7 天上线挑战', score: 775009 },
  { topic: '新中式穿搭摄影爆火', score: 731884 },
  { topic: '毕业生租房避坑指南', score: 688632 },
  { topic: '长文写作效率方法论', score: 650412 },
  { topic: '周末短途旅行地图', score: 612407 },
  { topic: '居家健身打卡计划', score: 594880 }
];

function mutateHotData(items) {
  return items
    .map((item) => {
      const swing = Math.round((Math.random() - 0.5) * 42000);
      const next = Math.max(120000, item.score + swing);
      return { ...item, score: next };
    })
    .sort((a, b) => b.score - a.score);
}

function formatScore(score) {
  if (score >= 10000) {
    return `${(score / 10000).toFixed(1)}万`;
  }
  return String(score);
}

function renderHotList(items) {
  if (!hotList) return;
  hotList.innerHTML = items
    .slice(0, 10)
    .map((item, idx) => {
      const rank = idx + 1;
      const topClass = rank <= 3 ? 'hot-item hot-top' : 'hot-item';
      return `
        <li class="${topClass}">
          <span class="rank">${rank}</span>
          <span class="topic">${item.topic}</span>
          <span class="score">热度 ${formatScore(item.score)}</span>
        </li>
      `;
    })
    .join('');

  if (timeStamp) {
    const now = new Date();
    timeStamp.textContent = `Last Pulse: ${now.toLocaleString('zh-CN')}`;
  }
}

let currentHot = mutateHotData(hotSeed);
renderHotList(currentHot);
setInterval(() => {
  currentHot = mutateHotData(currentHot);
  renderHotList(currentHot);
}, 6000);
