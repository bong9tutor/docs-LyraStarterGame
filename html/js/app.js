/* ============================================================
   LyraStarterGame 분석·학습 다이나믹 HTML 전역 스크립트
   사양: docs/common/dynamic-html-spec.md
   ============================================================ */

(function () {
  "use strict";

  const SYSTEMS = [
    {
      id: "animation",
      title: "애니메이션",
      pages: [
        { id: "animation-overview",              file: "lyra-animation-overview.html",              title: "1. 전체 지도" },
        { id: "animation-runtime-state",         file: "lyra-animation-runtime-state.html",         title: "2. 런타임 상태 입력" },
        { id: "animation-base-abp",              file: "lyra-animation-base-abp.html",              title: "3. Base ABP pose graph" },
        { id: "animation-locomotion-sm",         file: "lyra-animation-locomotion-sm.html",         title: "4. Locomotion 상태 머신" },
        { id: "animation-linked-layers",         file: "lyra-animation-linked-layers.html",         title: "5. Linked Item Layers" },
        { id: "animation-selection-rules",       file: "lyra-animation-selection-rules.html",       title: "6. 장비·cosmetic 선택 규칙" },
        { id: "animation-actions-montage",       file: "lyra-animation-actions-montage.html",       title: "7. Ability 와 Montage Slot" },
        { id: "animation-aiming-additives",      file: "lyra-animation-aiming-additives.html",      title: "8. Aiming · Additives" },
        { id: "animation-warping-ik",            file: "lyra-animation-warping-ik.html",            title: "9. Warping · IK" },
        { id: "animation-effects-tests-recipes", file: "lyra-animation-effects-tests-recipes.html", title: "10. Effects · Tests · Recipes" },
        { id: "animation-animbp-ali-tradeoffs",  file: "lyra-animation-animbp-ali-tradeoffs.html",  title: "11. ABP/ALI 분배 트레이드오프" },
        { id: "animation-invisible-copy-pose",   file: "lyra-animation-invisible-copy-pose.html",   title: "12. 보이지 않는 mesh + Copy Pose" },
      ],
    },
    {
      id: "ui",
      title: "CommonUI",
      pages: [
        { id: "ui-overview",                  file: "lyra-ui-overview.html",                  title: "1. 전체 지도" },
        { id: "ui-input-activation",          file: "lyra-ui-input-activation.html",          title: "2. 입력 라우팅 · 활성화" },
        { id: "ui-hud-manager",               file: "lyra-ui-hud-manager.html",               title: "3. HUD 액터 · UI 매니저" },
        { id: "ui-hud-layout",                file: "lyra-ui-hud-layout.html",                title: "4. HUDLayout · 메뉴 · 컨트롤러 분리" },
        { id: "ui-widget-injection",          file: "lyra-ui-widget-injection.html",          title: "5. 위젯 주입 (AddWidgets · UIExtension)" },
        { id: "ui-tagged-widget-visibility",  file: "lyra-ui-tagged-widget-visibility.html",  title: "6. Tagged Widget · 가시성" },
        { id: "ui-styles-widgets",            file: "lyra-ui-styles-widgets.html",            title: "7. Common Style · 위젯 라이브러리" },
      ],
    },
    {
      id: "asset-loading",
      title: "에셋 비동기 로딩",
      pages: [
        { id: "asset-loading-overview",                file: "lyra-asset-loading-overview.html",                title: "1. 전체 지도" },
        { id: "asset-loading-assetmanager-bootstrap",  file: "lyra-asset-loading-assetmanager-bootstrap.html",  title: "2. AssetManager 부팅" },
        { id: "asset-loading-startup-jobs",            file: "lyra-asset-loading-startup-jobs.html",            title: "3. StartupJob · 진행률" },
        { id: "asset-loading-gamedata",                file: "lyra-asset-loading-gamedata.html",                title: "4. ULyraGameData 전역 자산" },
        { id: "asset-loading-primary-asset-types",     file: "lyra-asset-loading-primary-asset-types.html",     title: "5. Primary Asset Type 8 종" },
        { id: "asset-loading-experience-state-machine",file: "lyra-asset-loading-experience-state-machine.html",title: "6. Experience 7 단계 state" },
        { id: "asset-loading-asset-bundles",           file: "lyra-asset-loading-asset-bundles.html",           title: "7. AssetBundle 메타" },
        { id: "asset-loading-bp-async-loading-screen", file: "lyra-asset-loading-bp-async-loading-screen.html", title: "8. BP Async · Loading Screen" },
        { id: "asset-loading-porting-guide",           file: "lyra-asset-loading-porting-guide.html",           title: "9. 포팅 가이드" },
      ],
    },
    {
      id: "gas",
      title: "GAS",
      pages: [
        { id: "gas-overview",           file: "lyra-gas-overview.html",           title: "1. 전체 지도" },
        { id: "gas-asc-init",           file: "lyra-gas-asc-init.html",           title: "2. ASC 초기화 4 경로" },
        { id: "gas-ability-set",        file: "lyra-gas-ability-set.html",        title: "3. AbilitySet · Grant" },
        { id: "gas-ability-policy",     file: "lyra-gas-ability-policy.html",     title: "4. 활성 정책 (Policy · Group · Cost)" },
        { id: "gas-tag-relationships",  file: "lyra-gas-tag-relationships.html",  title: "5. 태그 관계 매핑" },
        { id: "gas-damage-pipeline",    file: "lyra-gas-damage-pipeline.html",    title: "6. 데미지 파이프라인" },
        { id: "gas-cues",               file: "lyra-gas-cues.html",               title: "7. GameplayCue 시스템" },
        { id: "gas-game-phase",         file: "lyra-gas-game-phase.html",         title: "8. Game Phase" },
        { id: "gas-globals-context",    file: "lyra-gas-globals-context.html",    title: "9. Globals · Context 확장" },
      ],
    },
  ];

  function initTheme() {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", dark);
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isDark = document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
      });
    });
  }

  function buildSidebar() {
    const sb = document.getElementById("sidebar");
    if (!sb) return;
    const currentId = document.body.dataset.pageId || "";
    const onHome = !currentId;
    const home = document.createElement("a");
    home.href = onHome ? "#" : "../index.html";
    home.className = "sidebar-home";
    home.textContent = "Lyra 분석·학습";
    sb.appendChild(home);
    for (const sys of SYSTEMS) {
      const sec = document.createElement("div");
      sec.className = "sidebar-section";
      const h3 = document.createElement("h3");
      h3.textContent = sys.title;
      sec.appendChild(h3);
      const ul = document.createElement("ul");
      for (const p of sys.pages) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = (onHome ? "pages/" : "") + p.file;
        a.textContent = p.title;
        if (p.id === currentId) a.setAttribute("aria-current", "page");
        li.appendChild(a);
        ul.appendChild(li);
      }
      sec.appendChild(ul);
      sb.appendChild(sec);
    }
  }

  function buildPageToc() {
    const toc = document.getElementById("page-toc");
    if (!toc) return;
    const headers = Array.from(document.querySelectorAll(
      ".content section .block-head h2, .content section .flow-head h2, .content > .learn-index > h2"
    ));
    if (headers.length === 0) return;
    const h3 = document.createElement("h3");
    h3.textContent = "이 페이지";
    toc.appendChild(h3);
    const ol = document.createElement("ol");
    const items = [];
    headers.forEach((h) => {
      let target = h.closest("section");
      if (!target) target = h.closest(".learn-index");
      if (!target || !target.id) return;
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + target.id;
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      ol.appendChild(li);
      items.push({ a, target });
    });
    toc.appendChild(ol);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            items.forEach((it) => it.a.classList.toggle("is-active", it.target === e.target));
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    items.forEach((it) => io.observe(it.target));
  }

  function buildPager() {
    const main = document.querySelector("main.content");
    if (!main) return;
    const currentId = document.body.dataset.pageId || "";
    if (!currentId) return;
    let sys = null, idx = -1;
    for (const s of SYSTEMS) {
      const i = s.pages.findIndex((p) => p.id === currentId);
      if (i >= 0) { sys = s; idx = i; break; }
    }
    if (!sys) return;
    const pager = document.createElement("nav");
    pager.className = "page-pager";
    pager.setAttribute("aria-label", "페이지 이동");
    pager.appendChild(makePagerCell("prev", "이전", sys.pages[idx - 1]));
    pager.appendChild(makePagerCell("next", "다음", sys.pages[idx + 1]));
    main.appendChild(pager);
  }

  function makePagerCell(cls, label, page) {
    if (!page) {
      const span = document.createElement("span");
      span.className = "empty";
      return span;
    }
    const a = document.createElement("a");
    a.className = cls;
    a.href = page.file;
    const l = document.createElement("span");
    l.className = "label";
    l.textContent = label;
    const t = document.createElement("span");
    t.className = "title";
    t.textContent = page.title;
    a.appendChild(l);
    a.appendChild(t);
    return a;
  }

  function initMobileMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const sb = document.getElementById("sidebar");
    if (!toggle || !sb) return;
    let backdrop = document.querySelector(".sidebar-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      document.body.appendChild(backdrop);
    }
    const close = () => { sb.classList.remove("is-open"); backdrop.classList.remove("is-open"); };
    toggle.addEventListener("click", () => {
      const open = sb.classList.toggle("is-open");
      backdrop.classList.toggle("is-open", open);
    });
    backdrop.addEventListener("click", close);
    sb.addEventListener("click", (e) => { if (e.target.tagName === "A") close(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    buildSidebar();
    buildPageToc();
    buildPager();
    initMobileMenu();
  });
})();
