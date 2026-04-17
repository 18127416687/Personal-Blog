const clockEl = document.getElementById("clock");

function renderClock() {
  if (!clockEl) return;
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  clockEl.textContent = formatter.format(now);
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll(".reveal").forEach((el, idx) => {
  el.style.transitionDelay = `${Math.min(idx * 90, 500)}ms`;
  observer.observe(el);
});

renderClock();
setInterval(renderClock, 1000);
