let currentMode = "projects";
let projects = [];
let objects = [];
let isOverlayOpen = false;

document.addEventListener("DOMContentLoaded", () => {
  fetch("projects.json")
    .then((response) => response.json())
    .then((data) => {
      projects = data; // save to global
      renderProjects(projects);
      preloadThumbnails(projects);

      const pathSlug = window.location.pathname.slice(1);
      if (pathSlug) {
        if (pathSlug === "objects") {
          setMode("objects"); // switch to objects if /objects
        } else {
          const project = projects.find((p) => p.slug === pathSlug);
          if (project) {
            const expandedMediaContainer =
              document.getElementById("expanded-media");
            const zoomOverlay = document.getElementById("media-zoom-overlay");
            openProjectOverlay(project, expandedMediaContainer, zoomOverlay);
          }
        }
      } else {
        setMode("projects"); // default
      }
    })
    .catch((err) => console.error("Failed to load projects:", err));

  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelector('.nav-item[data-mode="projects"]')
    ?.classList.add("active");

  setMode("projects");
  setupInfoOverlay(); // initialize the header overlay
  setupProjectClickHandler();

  //  change for div rather than buttons

  document
    .querySelector('.nav-item[data-mode="projects"]')
    ?.addEventListener("click", () => {
      if (currentMode === "projects") return;
      setMode("projects");
      history.pushState(null, "", "/");
    });

  document
    .querySelector('.nav-item[data-mode="objects"]')
    ?.addEventListener("click", () => {
      if (currentMode === "objects") return;
      setMode("objects");
      history.pushState({ mode: "objects" }, "", "/objects");
    });

  // Optional: Click on name to reset (reload)
  const myName = document.getElementById("my-name");
  if (myName) {
    myName.style.cursor = "pointer"; // make it clear it’s clickable
    myName.addEventListener("click", () => {
      window.location.reload(); // simple way to reset everything
    });
  }
});

/* ==========================================================================
   INFO OVERLAY (modular, like project overlay)
   ========================================================================== */
function setupInfoOverlay() {
  const infoButton = document.querySelector(".info");
  const infoOverlay = document.getElementById("info-overlay");
  const infoOverlayText = document.getElementById("info-overlay-text");
  const infoOverlayClose = document.getElementById("info-overlay-close");

  if (!infoButton || !infoOverlay) return;

  function openInfoOverlay(pushHistory = true) {
    infoOverlay.classList.add("active");

    infoOverlayText.style.opacity = 0;
    infoOverlayClose.style.opacity = 0;
    infoOverlay.getBoundingClientRect(); // force reflow

    requestAnimationFrame(() => {
      infoOverlayText.style.transition = "opacity 0.3s ease";
      infoOverlayText.style.opacity = 1;
      infoOverlayClose.style.transition = "opacity 0.3s ease";
      infoOverlayClose.style.opacity = 1;
    });

    if (pushHistory) {
      // use same key as projects for consistency
      history.pushState({ overlay: "info" }, "", "/info");
    }
  }

  function closeInfoOverlay(pushHistory = true) {
    infoOverlayText.style.opacity = 0;
    infoOverlayClose.style.opacity = 0;
    infoOverlay.classList.remove("active");

    if (pushHistory) {
      history.pushState({ overlay: null }, "", "/");
    }
  }

  infoButton.addEventListener("click", () => openInfoOverlay(true));
  infoOverlayClose.addEventListener("click", () => closeInfoOverlay(true));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && infoOverlay.classList.contains("active")) {
      closeInfoOverlay();
    }
  });
  window.addEventListener("popstate", (e) => {
    if (!e.state || !e.state.overlay) {
      // Close info overlay if open
      if (infoOverlay.classList.contains("active")) {
        closeInfoOverlay(false);
      }
    } else if (e.state.overlay === "info") {
      openInfoOverlay(false);
    }
  });
}

function preloadThumbnails(items, callback) {
  if (!items.length) {
    if (callback) callback();
    return;
  }

  let loadedCount = 0;
  const total = items.length;

  items.forEach((item) => {
    if (!item.media || !item.media.length) {
      loadedCount++;
      if (loadedCount === total && callback) callback();
      return;
    }

    const firstMedia = item.media[0];
    let src = firstMedia;

    if (firstMedia.match(/\.(mp4|webm)$/)) {
      src = firstMedia.replace(/\.(mp4|webm)$/, "-thumb.jpg");
    }

    const img = new Image();
    img.src = src;
    img.onload = img.onerror = () => {
      loadedCount++;
      if (loadedCount === total && callback) callback();
    };
  });
}

function setMode(mode) {
  if (mode !== "projects" && mode !== "objects") return;
  if (currentMode === mode) return;

  currentMode = mode;
  document.body.dataset.mode = mode;

  // nav active state
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));
  const activeNav = document.querySelector(`.nav-item[data-mode="${mode}"]`);
  if (activeNav) activeNav.classList.add("active");

  const container = document.getElementById("project-list");

  // 1. Fade OUT
  container.style.opacity = 0;

  // 2. Swap content after fade out
  setTimeout(() => {
    container
      .querySelectorAll(".project:not(.template)")
      .forEach((el) => el.remove());

    if (mode === "projects") {
      // preload first images, then render
      preloadThumbnails(projects, () => {
        renderProjects(projects);
        fadeInContainer(container);
      });
    } else {
      if (!objects.length) {
        fetch("objects.json")
          .then((res) => res.json())
          .then((data) => {
            objects = data;
            preloadThumbnails(objects, () => {
              renderObjects(objects);
              fadeInContainer(container);
            });
          });
        return;
      } else {
        preloadThumbnails(objects, () => {
          renderObjects(objects);
          fadeInContainer(container);
        });
      }
    }
  }, 200); // MUST match CSS duration
}

function fadeInContainer(container) {
  requestAnimationFrame(() => {
    container.style.opacity = 1;
  });
}

function setupHoverEffects() {
  const container = document.getElementById("project-list");

  function attachHover(wrapper, index) {
    if (wrapper.classList.contains("objects")) return; // objects handled by CSS

    const previewImg = wrapper.querySelector(".project-preview");
    const item = projects[index];
    if (!item?.media?.length) return;

    const defaultSrc = previewImg.src;
    const hoverSrc = item.media[0].match(/\.(mp4|webm)$/)
      ? item.media[0].replace(/\.(mp4|webm)$/, "-thumb.jpg")
      : item.media[0];

    wrapper.addEventListener("mouseenter", () => {
      previewImg.src = hoverSrc;
      previewImg.style.opacity = 0.7;
      wrapper.querySelector(".project-title").style.opacity = 1;
      wrapper.querySelector(".title-year").style.opacity = 1;
    });

    wrapper.addEventListener("mouseleave", () => {
      previewImg.src = defaultSrc;
      previewImg.style.opacity = 1;
      wrapper.querySelector(".project-title").style.opacity = 0;
      wrapper.querySelector(".title-year").style.opacity = 0;
    });
  }

  const items = container.querySelectorAll(".project:not(.template)");
  items.forEach((wrapper) => attachHover(wrapper, wrapper.dataset.index));
}

function setupProjectClickHandler() {
  const container = document.getElementById("project-list");
  const expandedMediaContainer = document.getElementById("expanded-media");
  const zoomOverlay = document.getElementById("media-zoom-overlay");

  if (!container) return;

  container.addEventListener("click", (e) => {
    const wrapper = e.target.closest(".project:not(.template)");
    if (!wrapper) return;

    const index = Number(wrapper.dataset.index);
    if (Number.isNaN(index)) return;
    const item = currentMode === "projects" ? projects[index] : objects[index];
    if (!item) return;

    openProjectOverlay(item, expandedMediaContainer, zoomOverlay);

    // ✅ Push history for objects
    if (currentMode === "objects") {
      history.pushState(
        { mode: "objects", objectIndex: index },
        "",
        `/objects/${item.slug}`
      );
    }
  });
}

function renderProjects(projects) {
  const container = document.getElementById("project-list");
  const template = container.querySelector(".project.template");
  const expandedMediaContainer = document.getElementById("expanded-media");
  const zoomOverlay = document.getElementById("media-zoom-overlay");

  container
    .querySelectorAll(".project:not(.template)")
    .forEach((el) => el.remove());

  // Generate all project elements once
  projects.forEach((project, index) => {
    const wrapper = template.cloneNode(true);
    wrapper.classList.remove("template");
    wrapper.style.display = "";
    wrapper.dataset.index = index;
    // project number looks like this: ( x )
    wrapper.querySelector(".project-number").textContent = `( ${index + 1} )`;

    wrapper.querySelector(".project-title").textContent = project.title;
    wrapper.querySelector(".title-year").textContent = project.year;
    wrapper.querySelector(".title-type").textContent = project.type;

    const previewImg = document.createElement("img");
    let thumbSrc = project.media[0];
    if (thumbSrc.match(/\.(mp4|webm)$/)) {
      thumbSrc = thumbSrc.replace(/\.(mp4|webm)$/, "-thumb.jpg");
    }
    previewImg.src = thumbSrc;
    previewImg.alt = project.title;
    previewImg.classList.add("project-preview");

    wrapper.appendChild(previewImg);

    container.appendChild(wrapper);
  });

  // call after renderProjects
  renderGridCrosses();
  window.addEventListener("resize", renderGridCrosses);
}

function renderObjects(objects) {
  const container = document.getElementById("project-list");
  const template = container.querySelector(".project.template");

  // Clear existing grid
  container
    .querySelectorAll(".project:not(.template)")
    .forEach((el) => el.remove());

  objects.forEach((obj, index) => {
    const wrapper = template.cloneNode(true);
    wrapper.classList.remove("template");
    wrapper.classList.add("objects"); // new class for CSS targeting
    wrapper.style.display = "";
    wrapper.dataset.index = index;

    // Add image first with fade-in
    const img = document.createElement("img");
    img.src = obj.media[0]; // main image URL
    img.alt = obj.title || "";
    img.classList.add("project-preview");
    img.style.opacity = 0; // start hidden
    wrapper.appendChild(img);

    // Fade in once loaded (like hover preview)
    img.onload = () => {
      img.getBoundingClientRect(); // force reflow
      requestAnimationFrame(() => {
        img.style.transition = "opacity 0.5s ease"; // same as hover
        img.style.opacity = 1;
      });
    };

    // Add text overlay
    const textOverlay = document.createElement("div");
    textOverlay.classList.add("project-text");

    const titleEl = document.createElement("div");
    titleEl.classList.add("project-title");
    titleEl.textContent = obj.title || "";
    textOverlay.appendChild(titleEl);

    const dimensionsEl = document.createElement("div");
    dimensionsEl.classList.add("title-year");
    dimensionsEl.textContent = obj.dimensions || "";
    textOverlay.appendChild(dimensionsEl);

    wrapper.appendChild(textOverlay);

    container.appendChild(wrapper);
  });

  renderGridCrosses();
  window.addEventListener("resize", renderGridCrosses);
}

function renderGridCrosses() {
  const container = document.getElementById("project-list");
  const crossesContainer = document.getElementById("grid-crosses");
  crossesContainer.innerHTML = ""; // reset

  const cells = Array.from(
    container.querySelectorAll(".project:not(.template)")
  );
  if (!cells.length) return;

  const columns = 5; // same as grid-template-columns
  const rows = Math.ceil(cells.length / columns);

  // Get container padding
  const containerStyle = getComputedStyle(container);
  const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
  const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
  const gapX = parseFloat(containerStyle.columnGap) || 0;
  const gapY = parseFloat(containerStyle.rowGap) || 0;

  // Get first cell dimensions for sizing
  const refCell = cells[0];
  const cellWidth = refCell.offsetWidth;
  const cellHeight = refCell.offsetHeight;

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= columns; c++) {
      const cross = document.createElement("div");
      cross.classList.add("grid-cross");

      // Calculate position relative to container, accounting for padding
      const left = paddingLeft + c * (cellWidth + gapX);
      const top = paddingTop + r * (cellHeight + gapY);

      cross.style.left = left + "px";
      cross.style.top = top + "px";

      crossesContainer.appendChild(cross);
    }
  }
}
setupHoverEffects(); // initialize hover effects

/* ==========================================================================
   Optimized Overlay + Slideshow Logic (full feature parity)
   ========================================================================== */

let activeOverlay = null; // single overlay state

function openProjectOverlay(
  project,
  expandedMediaContainer,
  zoomOverlay,
  previewElement = null
) {
  isOverlayOpen = true;

  if (!project || !Array.isArray(project.media) || !project.media.length) {
    console.warn("Invalid project passed to overlay:", project);
    return;
  }

  // Close existing overlay if open
  if (activeOverlay && typeof activeOverlay.close === "function") {
    activeOverlay.close(true);
  }

  const overlayState = {
    project,
    expandedMediaContainer,
    zoomOverlay,
    currentIndex: 0,
    slides: [],
    closing: false,
  };
  activeOverlay = overlayState;

  // --- Clear old media ---
  zoomOverlay.querySelectorAll(".project-media").forEach((m) => m.remove());

  // --- Create wrapper ---
  const mediaWrapper = document.createElement("div");
  mediaWrapper.classList.add("project-media");
  zoomOverlay.appendChild(mediaWrapper);

  // --- Build slides ---
  project.media.forEach((src) => {
    let el;
    if (src.match(/\.(mp4|webm)$/)) {
      el = document.createElement("video");
      el.src = src;
      el.autoplay = true;
      el.loop = true;
      el.muted = true;
      el.controls = true;
    } else {
      el = document.createElement("img");
      el.src = src;
      el.alt = project.title;
    }
    el.style.display = "none";
    mediaWrapper.appendChild(el);
    overlayState.slides.push(el);
  });

  // --- UI elements ---
  const overlayText = document.getElementById("overlay-text");
  const slideCounter = document.getElementById("slide-counter");
  const overlayClose = document.getElementById("overlay-close");

  const titleEl = overlayText.querySelector(".overlay-title");
  const yearEl = overlayText.querySelector(".overlay-year");
  const typeEl = overlayText.querySelector(".overlay-type");
  const descEl = overlayText.querySelector(".overlay-description");

  titleEl.textContent = project.title || "";

  // PROJECTS
  if (currentMode === "projects") {
    yearEl.textContent = project.year || "";
    yearEl.style.display = "";

    typeEl.textContent = project.type || "";
    typeEl.style.display = "";

    descEl.innerHTML = (project.description || "").replace(/\n/g, "<br>");
    descEl.style.display = "";
  }

  // OBJECTS
  // OBJECTS
  else {
    yearEl.textContent = "";
    yearEl.style.display = "none";

    typeEl.textContent = project.dimensions || "";
    typeEl.style.display = "";

    descEl.innerHTML = (project.description || "").replace(/\n/g, "<br>");
    descEl.style.display = "";
  }

  // Reset opacity (for fade-in)
  overlayText.style.opacity = 0;
  overlayClose.style.opacity = 0;
  slideCounter.style.opacity = 0;
  slideCounter.textContent = "";

  // --- Show slide ---
  function showSlide(index = overlayState.currentIndex) {
    overlayState.currentIndex =
      (index + overlayState.slides.length) % overlayState.slides.length;

    overlayState.slides.forEach((slide, i) => {
      const isActive = i === overlayState.currentIndex;
      slide.style.display = i === overlayState.currentIndex ? "block" : "none";
      slide.style.opacity = i === overlayState.currentIndex ? "1" : "0";
      slide.style.transition = "opacity 0.3s ease";

      if (isActive) sizeMediaToViewport(slide);

      if (slide.tagName === "VIDEO") {
        if (isActive) {
          // Play the video when active
          slide.play().catch(() => {}); // .catch avoids autoplay-block errors
        } else {
          // Pause the video when inactive
          slide.pause();
          // Optional: reset to start
          // slide.currentTime = 0;
        }
      }
    });

    slideCounter.textContent = `${overlayState.currentIndex + 1} / ${
      overlayState.slides.length
    }`;
  }

  // Update URL
  history.pushState({ project: project.slug }, "", `/${project.slug}`);

  // --- Animate in from preview ---

  // --- Activate overlay (same as info overlay pattern) ---
  zoomOverlay.classList.add("active");
  // zoomOverlay.getBoundingClientRect(); // force reflow for CSS transition timing

  function sizeMediaToViewport(slide) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const marginX = vw * 0.21;
    const maxH = vh * 0.8; // 80% of viewport height
    const maxW = vw - marginX * 2; // optional max width

    let intrinsicW = slide.naturalWidth || slide.videoWidth || 800;
    let intrinsicH = slide.naturalHeight || slide.videoHeight || 600;
    let ratio = intrinsicW / intrinsicH;

    let finalW = intrinsicW;
    let finalH = intrinsicH;

    // First fit by height
    if (finalH > maxH) {
      finalH = maxH;
      finalW = finalH * ratio;
    }

    // Then fit by width if too wide
    if (finalW > maxW) {
      finalW = maxW;
      finalH = finalW / ratio;
    }

    slide.style.position = "absolute";
    slide.style.top = `${vh / 2 - finalH / 2}px`;
    slide.style.left = `${vw / 2 - finalW / 2}px`;
    slide.style.width = `${finalW}px`;
    slide.style.height = `${finalH}px`;
    slide.style.objectFit = "contain";
  }

  // --- Make media responsive on window resize ---
  function handleResize() {
    if (!zoomOverlay.classList.contains("active")) return;
    const slide = overlayState.slides[overlayState.currentIndex];
    if (slide) sizeMediaToViewport(slide);
  }
  window.addEventListener("resize", handleResize);

  // --- Fade in overlay text, close, and counter after slide zoom finishes ---
  // Immediately show overlay UI
  overlayText.style.transition = "opacity 0.3s ease";
  overlayClose.style.transition = "opacity 0.3s ease";
  slideCounter.style.transition = "opacity 0.3s ease";

  // force reflow
  overlayText.getBoundingClientRect();

  requestAnimationFrame(() => {
    overlayText.style.opacity = 1;
    overlayClose.style.opacity = 1;
    slideCounter.style.opacity = 1;
  });

  // Show first slide
  // Show first slide correctly after it has loaded
  const firstSlide = overlayState.slides[0];
  if (firstSlide) {
    if (firstSlide.tagName === "IMG") {
      firstSlide.onload = () => showSlide(0);
    } else if (firstSlide.tagName === "VIDEO") {
      firstSlide.onloadedmetadata = () => showSlide(0);
    }
  } else {
    showSlide(0);
  }

  // --- Cursor update (unchanged) ---
  let cursorAnimationFrame = null;
  function updateCursor(e) {
    if (
      !zoomOverlay.classList.contains("active") ||
      overlayState.slides.length <= 1
    ) {
      document.body.classList.remove("cursor-left", "cursor-right");
      return;
    }

    const hoveredEl = document.elementFromPoint(e.clientX, e.clientY);
    if (hoveredEl && hoveredEl.tagName === "VIDEO") {
      document.body.classList.remove("cursor-left", "cursor-right");
      return;
    }

    const marginTop = 80;
    const marginSides = 60;
    const withinY = e.clientY > marginTop;
    const withinX =
      e.clientX > marginSides && e.clientX < window.innerWidth - marginSides;
    if (!withinY || !withinX) {
      document.body.classList.remove("cursor-left", "cursor-right");
      return;
    }
    const halfWidth = window.innerWidth / 2;
    document.body.classList.remove("cursor-left", "cursor-right");
    if (e.clientX < halfWidth) document.body.classList.add("cursor-left");
    else document.body.classList.add("cursor-right");
  }

  function handleMouseMove(e) {
    if (!zoomOverlay.classList.contains("active")) return;
    if (!cursorAnimationFrame) {
      cursorAnimationFrame = requestAnimationFrame(() => {
        updateCursor(e);
        cursorAnimationFrame = null;
      });
    }
  }

  // --- Click navigation (unchanged) ---
  function handleClick(e) {
    if (
      !zoomOverlay.classList.contains("active") ||
      overlayState.slides.length <= 1
    )
      return;
    if (e.target.closest("#overlay-close")) return;

    const marginTop = 60;
    const marginSides = 60;
    const withinY = e.clientY > marginTop;
    const withinX =
      e.clientX > marginSides && e.clientX < window.innerWidth - marginSides;
    if (!withinY || !withinX) return;

    const halfWidth = window.innerWidth / 2;
    const next = e.clientX >= halfWidth;
    showSlide(
      next ? overlayState.currentIndex + 1 : overlayState.currentIndex - 1
    );
  }

  // --- Keyboard navigation (unchanged) ---
  function handleKey(e) {
    if (!zoomOverlay.classList.contains("active")) return;
    if (e.key === "ArrowLeft") showSlide(overlayState.currentIndex - 1);
    if (e.key === "ArrowRight") showSlide(overlayState.currentIndex + 1);
    if (e.key === "Escape") overlayState.close();
  }

  // --- Attach listeners ---
  document.addEventListener("mousemove", handleMouseMove);
  setTimeout(() => document.addEventListener("click", handleClick), 0);
  document.addEventListener("keydown", handleKey);

  // --- Close overlay (fade-out only, no scale) ---
  overlayState.close = function (instant = false) {
    if (overlayState.closing) return;
    overlayState.closing = true;
    // Revert URL
    history.pushState({}, "", "/");

    // fade out everything
    overlayText.style.transition = "opacity 0.3s ease";
    overlayClose.style.transition = "opacity 0.3s ease";
    slideCounter.style.transition = "opacity 0.3s ease";
    mediaWrapper.style.transition = "opacity 0.3s ease";

    overlayText.style.opacity = 0;
    slideCounter.style.opacity = 0;
    overlayClose.style.opacity = 0;
    mediaWrapper.style.opacity = 0;

    const cleanup = () => {
      zoomOverlay.classList.remove("active");
      document.body.classList.remove("cursor-left", "cursor-right");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
      mediaWrapper.remove();
      activeOverlay = null;
      cursorAnimationFrame = null;
      isOverlayOpen = false;
      window.removeEventListener("resize", handleResize);
    };

    if (instant) {
      cleanup();
      return;
    }

    setTimeout(cleanup, 300); // match fade duration
  };

  overlayClose.addEventListener("click", () => overlayState.close());
}

window.addEventListener("popstate", (e) => {
  const expandedMediaContainer = document.getElementById("expanded-media");
  const zoomOverlay = document.getElementById("media-zoom-overlay");
  const infoOverlay = document.getElementById("info-overlay");

  const path = window.location.pathname.slice(1); // current path

  // Handle info overlay
  if (e.state?.overlay === "info") {
    openInfoOverlay(false);
    return;
  }

  // Close any active overlay first
  if (activeOverlay) activeOverlay.close(true);
  if (infoOverlay.classList.contains("active")) closeInfoOverlay(false);

  // Restore objects
  if (e.state?.mode === "objects" || path.startsWith("objects")) {
    setMode("objects");

    // If the URL has a specific object, open overlay
    const slug = path.split("/")[1]; // second part after "/objects/"
    if (slug) {
      const index = objects.findIndex((o) => o.slug === slug);
      if (index >= 0) {
        const obj = objects[index];
        openProjectOverlay(obj, expandedMediaContainer, zoomOverlay);
      }
    }

    return;
  }

  // Restore project overlay if state exists
  if (e.state?.project) {
    const projectSlug = e.state.project;
    const project = projects.find((p) => p.slug === projectSlug);
    if (!project) return;
    const preview = document.querySelector(
      `.project[data-index="${projects.indexOf(
        project
      )}"] img, .project[data-index="${projects.indexOf(project)}"] video`
    );
    openProjectOverlay(project, expandedMediaContainer, zoomOverlay, preview);
    return;
  }

  // Default to projects
  setMode("projects");
});
