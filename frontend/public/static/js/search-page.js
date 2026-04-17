(() => {
    const ENGINE_ICONS = {
        baidu: `<svg viewBox="0 0 1024 1024" aria-hidden="true"><path d="M184.310244 539.583133c111.396518-23.899253 96.196993-156.995092 92.797099-186.094183-5.499828-44.898596-58.198181-123.296146-129.795943-117.09634C57.214216 244.492357 44.014629 374.688287 44.014629 374.688287c-12.099622 60.198118 29.199087 188.794098 140.295615 164.894846zM302.506549 770.975899c-3.299897 9.399706-10.499672 33.298959-4.299866 54.098309 12.399612 46.69854 52.998343 48.798475 52.998343 48.798475h58.298178V731.377137h-62.398049c-27.999125 8.399737-41.5987 30.299053-44.598606 39.598762z m88.397236-454.485792c61.598074 0 111.196524-70.797787 111.196524-158.295052C502.100309 70.797787 452.50186 0 390.903785 0c-61.398081 0-111.196524 70.797787-111.196524 158.195055 0 87.497265 49.798443 158.295052 111.196524 158.295052z m264.89172 10.399675c82.197431 10.699666 135.095777-77.09759 145.495452-143.595512C811.990622 116.996343 758.992279 39.798756 700.794098 26.599169c-58.298178-13.399581-131.095902 79.997499-137.695695 140.895595-7.899753 74.497671 10.599669 148.795349 92.697102 159.395018z m201.393704 390.787784S729.993186 619.280641 655.795505 512.983964c-100.596855-156.795099-243.592385-92.997093-291.390891-13.299584-47.598512 79.697509-121.796193 130.19593-132.295865 143.495514-10.699666 13.199587-153.595199 90.297177-121.896189 231.192773 31.699009 140.795599 143.195524 138.19568 143.195524 138.19568s82.097434 8.099747 177.394454-13.199587c95.297021-21.199337 177.294458 5.299834 177.294458 5.299834s222.593042 74.497671 283.491138-68.997843c60.798099-143.595511-34.398925-217.993186-34.398925-217.993185zM476.301116 931.270889H331.605639c-62.498046-12.499609-87.397268-55.098278-90.597168-62.39805-3.099903-7.399769-20.79935-41.698697-11.399644-99.996874 26.999156-87.397268 103.996749-93.697071 103.99675-93.697071h76.997593v-94.69704l65.597949 0.999969 0.099997 349.789066z m269.591573-0.999969H579.297896c-64.597981-16.599481-67.597887-62.498046-67.597887-62.498046V683.578631l67.597887-1.099965V847.973493c4.099872 17.59945 26.099184 20.899347 26.099184 20.899346H673.994936V683.578631h71.897753v246.692289z m235.692632-491.784627c0-31.799006-26.399175-127.596011-124.396112-127.596011-98.19693 0-111.296521 90.397174-111.29652 154.295176 0 60.998093 5.199837 146.19543 127.096027 143.395518 121.996186-2.599919 108.596605-138.095683 108.596605-170.094683z"></path></svg>`,
        bing: '<i class="fa-brands fa-microsoft" aria-hidden="true"></i>',
        google: '<i class="fa-brands fa-google" aria-hidden="true"></i>',
        sogou: '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>',
        "360": '<i class="fa-solid fa-globe" aria-hidden="true"></i>',
        weibo: '<i class="fa-brands fa-weibo" aria-hidden="true"></i>',
        bilibili: '<i class="fa-regular fa-circle-play" aria-hidden="true"></i>',
        github: '<i class="fa-brands fa-github" aria-hidden="true"></i>',
        zhihu: '<i class="fa-brands fa-zhihu" aria-hidden="true"></i>'
    };

    const ENGINES = {
        baidu: { name: "百度", iconKey: "baidu", url: "https://www.baidu.com/s?wd=" },
        bing: { name: "必应", iconKey: "bing", url: "https://www.bing.com/search?q=" },
        google: { name: "Google", iconKey: "google", url: "https://www.google.com/search?q=" },
        sogou: { name: "搜狗", iconKey: "sogou", url: "https://www.sogou.com/web?query=" },
        360: { name: "360 搜索", iconKey: "360", url: "https://www.so.com/s?q=" },
        weibo: { name: "微博", iconKey: "weibo", url: "https://s.weibo.com/weibo?q=" },
        bilibili: { name: "BiliBili", iconKey: "bilibili", url: "https://search.bilibili.com/all?keyword=" },
        github: { name: "Github", iconKey: "github", url: "https://github.com/search?q=" },
        zhihu: { name: "知乎", iconKey: "zhihu", url: "https://www.zhihu.com/search?q=" }
    };

    const searchArea = document.getElementById("searchArea");
    const engineTrigger = document.getElementById("engineTrigger");
    const engineList = document.getElementById("engineList");
    const selectedEngineIcon = document.getElementById("selectedEngineIcon");
    const selectedEngineText = document.getElementById("selectedEngineText");
    const searchInput = document.getElementById("searchInput");
    const searchAction = document.getElementById("searchAction");
    const liveTime = document.getElementById("liveTime");
    const liveDate = document.getElementById("liveDate");

    let currentEngine = "baidu";

    function updateClock() {
        const now = new Date();
        if (liveTime) {
            liveTime.textContent = now.toLocaleTimeString("zh-CN", { hour12: false });
        }
        if (liveDate) {
            liveDate.textContent = now.toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long"
            });
        }
    }

    function openPanel() {
        searchArea?.classList.add("is-open");
        engineTrigger?.setAttribute("aria-expanded", "true");
    }

    function closePanel() {
        searchArea?.classList.remove("is-open");
        engineTrigger?.setAttribute("aria-expanded", "false");
    }

    function setEngine(engineKey) {
        const engine = ENGINES[engineKey];
        if (!engine) return;

        currentEngine = engineKey;
        selectedEngineIcon.setAttribute("data-engine", engine.iconKey);
        selectedEngineIcon.innerHTML = ENGINE_ICONS[engine.iconKey] || "";
        selectedEngineText.textContent = engine.name;

        document.querySelectorAll(".engine-item").forEach((item) => {
            const active = item.dataset.engine === engineKey;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", active ? "true" : "false");
        });

        closePanel();
    }

    function doSearch() {
        const keyword = searchInput?.value.trim();
        if (!keyword) {
            searchInput?.focus();
            return;
        }
        const endpoint = ENGINES[currentEngine]?.url || ENGINES.baidu.url;
        window.open(`${endpoint}${encodeURIComponent(keyword)}`, "_blank", "noopener");
    }

    engineTrigger?.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = searchArea?.classList.contains("is-open");
        if (isOpen) {
            closePanel();
            return;
        }
        openPanel();
    });

    engineList?.addEventListener("click", (event) => {
        const option = event.target.closest(".engine-item");
        if (!option) return;
        setEngine(option.dataset.engine);
    });

    document.addEventListener("click", (event) => {
        if (!searchArea?.contains(event.target)) {
            closePanel();
        }
    });

    searchAction?.addEventListener("click", doSearch);
    searchInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            doSearch();
        }
    });

    document.querySelectorAll(".engine-item").forEach((item) => {
        const iconWrap = item.querySelector("[data-engine-icon]");
        const icon = ENGINE_ICONS[item.dataset.engine] || "";
        if (iconWrap) {
            iconWrap.innerHTML = icon;
            iconWrap.setAttribute("data-engine", item.dataset.engine);
        }
    });

    updateClock();
    setInterval(updateClock, 1000);
    setEngine(currentEngine);
})();
