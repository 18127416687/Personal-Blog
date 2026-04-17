const scriptPromises = new Map();

export function ensureScript(src) {
  if (!src) return Promise.resolve(false);
  const resolvedSrc = new URL(src, window.location.href).href;

  if (scriptPromises.has(resolvedSrc)) {
    return scriptPromises.get(resolvedSrc).then(() => false);
  }

  const existing = Array.from(document.querySelectorAll("script")).find((item) => item.src === resolvedSrc);
  if (existing) {
    const pending = existing.dataset.loaded === "true"
      ? Promise.resolve(false)
      : new Promise((resolve, reject) => {
          existing.addEventListener("load", () => resolve(false), { once: true });
          existing.addEventListener("error", () => reject(new Error(`Failed to load script: ${resolvedSrc}`)), { once: true });
        });
    scriptPromises.set(resolvedSrc, pending);
    return pending;
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = resolvedSrc;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve(true);
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        scriptPromises.delete(resolvedSrc);
        reject(new Error(`Failed to load script: ${resolvedSrc}`));
      },
      { once: true }
    );
    document.body.appendChild(script);
  });

  scriptPromises.set(resolvedSrc, promise);
  return promise;
}

export function runLegacyInit(fnName) {
  const fn = window?.[fnName];
  if (typeof fn === "function") fn();
}
