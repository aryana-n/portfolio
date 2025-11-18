let projects = []; // global scope

document.addEventListener("DOMContentLoaded", () => {
  fetch("projects.json")
    .then((response) => response.json())
    .then((data) => {
      projects = data; // save to global
      renderProjects(projects);
      preloadThumbnails(projects);

      // Check URL for direct project link
      const pathSlug = window.location.hash.slice(2); // remove "#/"
      if (pathSlug) {
        const project = projects.find((p) => p.slug === pathSlug);
        if (project) {
          openProjectOverlay(project, expandedMediaContainer, zoomOverlay);
        } else if (pathSlug === "info") {
          openInfoOverlay(false);
        }
      }
    })
    .catch((err) => console.error("Failed to load projects:", err));

  setupInfoOverlay(); // initialize the header overlay

  // Optional: Click on name to reset (reload)
  // const myName = document.getElementById("my-name");
  // if (myName) {
  //   myName.style.cursor = "pointer"; // make it clear it’s clickable
  //   myName.addEventListener("click", () => {
  //     window.location.reload(); // simple way to reset everything
  //   });
  // }
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

    // reset visibility
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
      history.pushState({ info: true }, "", "/info");
    }
  }

  function closeInfoOverlay(pushHistory = true) {
    infoOverlayText.style.opacity = 0;
    infoOverlayClose.style.opacity = 0;
    infoOverlay.classList.remove("active");
    if (pushHistory) {
      history.pushState({}, "", "/");
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

function preloadThumbnails(projects) {
  projects.forEach((project) => {
    if (!project.media || !project.media.length) return;

    const firstMedia = project.media[0];
    if (firstMedia.match(/\.(mp4|webm)$/)) {
      // Replace video with thumbnail
      const thumbSrc = firstMedia.replace(/\.(mp4|webm)$/, "-thumb.jpg");
      const img = new Image();
      img.src = thumbSrc; // browser downloads it in background
    } else {
      const img = new Image();
      img.src = firstMedia; // normal image
    }
  });
}

function renderProjects(projects) {
  const container = document.getElementById("project-list");
  const template = container.querySelector(".project.template");
  const expandedMediaContainer = document.getElementById("expanded-media");
  const zoomOverlay = document.getElementById("media-zoom-overlay");

  // Generate all project elements once
  projects.forEach((project, index) => {
    const wrapper = template.cloneNode(true);
    wrapper.classList.remove("template");
    wrapper.style.display = "";
    wrapper.dataset.index = index;

    wrapper.querySelector(".project-title").textContent = project.title;
    wrapper.querySelector(".title-year").textContent = project.year;
    wrapper.querySelector(".title-type").textContent = project.type;

    container.appendChild(wrapper);
  });

  // === Event Delegation ===
  // Hover Preview
  container.addEventListener(
    "mouseenter",
    (e) => {
      const wrapper = e.target.closest(".project");
      if (!wrapper) return;

      const project = projects[wrapper.dataset.index];
      if (!project.media || !project.media.length) return;

      const firstMedia = project.media[0];
      const el = document.createElement("img");

      if (firstMedia.match(/\.(mp4|webm)$/)) {
        el.src = firstMedia.replace(/\.(mp4|webm)$/, "-thumb.jpg");
      } else {
        el.src = firstMedia;
      }

      el.alt = project.title;
      expandedMediaContainer.innerHTML = "";
      expandedMediaContainer.appendChild(el);
      expandedMediaContainer.style.display = "block";
    },
    true
  );

  container.addEventListener(
    "mouseleave",
    (e) => {
      const wrapper = e.target.closest(".project");
      if (!wrapper) return;
      expandedMediaContainer.style.display = "none";
      expandedMediaContainer.innerHTML = "";
    },
    true
  );

  // Click to open overlay
  container.addEventListener("click", (e) => {
    const wrapper = e.target.closest(".project");
    if (!wrapper) return;

    const project = projects[wrapper.dataset.index];
    openProjectOverlay(project, expandedMediaContainer, zoomOverlay);
  });
}

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
  if (!project.media || !project.media.length) return;

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

  overlayText.querySelector(".overlay-title").textContent = project.title;
  overlayText.querySelector(".overlay-year").textContent = project.year;
  overlayText.querySelector(".overlay-type").textContent = project.type;
  overlayText.querySelector(".overlay-description").innerHTML = (
    project.description || ""
  ).replace(/\n/g, "<br>");

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
      slide.style.display = i === overlayState.currentIndex ? "block" : "none";
      slide.style.position = "absolute";
      slide.style.top = "0";
      slide.style.left = "0";
      slide.style.width = "100%";
      slide.style.height = "100%";
      slide.style.objectFit = "contain";
      slide.style.opacity = i === overlayState.currentIndex ? "1" : "0";
      slide.style.transition = "opacity 0.4s ease";
    });

    slideCounter.textContent = `${overlayState.currentIndex + 1} / ${
      overlayState.slides.length
    }`;
  }

  // Update URL
  history.pushState({ project: project.slug }, "", `/${project.slug}`);

  // --- Animate in from preview ---
  const preview =
    previewElement || expandedMediaContainer.querySelector("img, video");
  const firstSlide = overlayState.slides[0];

  const origRect = preview
    ? preview.getBoundingClientRect()
    : {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        width: firstSlide.naturalWidth || 300,
        height: firstSlide.naturalHeight || 200,
      };
  mediaWrapper.style.position = "absolute";
  mediaWrapper.style.top = `${origRect.top}px`;
  mediaWrapper.style.left = `${origRect.left}px`;
  mediaWrapper.style.width = `${origRect.width}px`;
  mediaWrapper.style.height = `${origRect.height}px`;

  // --- Activate overlay (same as info overlay pattern) ---
  zoomOverlay.classList.add("active");
  zoomOverlay.getBoundingClientRect(); // force reflow for CSS transition timing

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const marginX = vw * 0.21;
  const availableW = vw - marginX * 2;
  const availableH = vh * 0.8;
  const ratio = origRect.width / origRect.height;

  let finalW = availableW;
  let finalH = finalW / ratio;
  if (finalH > availableH) {
    finalH = availableH;
    finalW = finalH * ratio;
  }

  const targetTop = vh / 2 - finalH / 2;
  const targetLeft = vw / 2 - finalW / 2;

  requestAnimationFrame(() => {
    mediaWrapper.style.top = `${targetTop}px`;
    mediaWrapper.style.left = `${targetLeft}px`;
    mediaWrapper.style.width = `${finalW}px`;
    mediaWrapper.style.height = `${finalH}px`;
  });
  // --- Make media responsive on window resize ---
  function handleResize() {
    if (!zoomOverlay.classList.contains("active")) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const marginX = vw * 0.21;
    const availableW = vw - marginX * 2;
    const availableH = vh * 0.8;
    const ratio = origRect.width / origRect.height;

    let newW = availableW;
    let newH = newW / ratio;
    if (newH > availableH) {
      newH = availableH;
      newW = newH * ratio;
    }

    const newTop = vh / 2 - newH / 2;
    const newLeft = vw / 2 - newW / 2;

    mediaWrapper.style.top = `${newTop}px`;
    mediaWrapper.style.left = `${newLeft}px`;
    mediaWrapper.style.width = `${newW}px`;
    mediaWrapper.style.height = `${newH}px`;
  }

  window.addEventListener("resize", handleResize);

  // --- Fade in overlay text, close, and counter after slide zoom finishes ---
  mediaWrapper.addEventListener(
    "transitionend",
    () => {
      overlayText.style.transition = "opacity 0.3s ease";
      overlayClose.style.transition = "opacity 0.3s ease";
      slideCounter.style.transition = "opacity 0.3s ease";

      overlayText.getBoundingClientRect(); // force reflow

      requestAnimationFrame(() => {
        overlayText.style.opacity = 1;
        overlayClose.style.opacity = 1;
        slideCounter.style.opacity = 1;
      });

      showSlide(0);
    },
    { once: true }
  );

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

  if (!e.state || !e.state.project) {
    if (activeOverlay) activeOverlay.close(true);
  } else {
    const projectSlug = e.state.project;
    const project = projects.find((p) => p.slug === projectSlug);
    if (!project) return;

    // Always rebuild the overlay, with a fallback preview for animation
    const preview = document.querySelector(
      `.project[data-index="${projects.indexOf(
        project
      )}"] img, .project[data-index="${projects.indexOf(project)}"] video`
    );
    openProjectOverlay(project, expandedMediaContainer, zoomOverlay, preview);
  }
});
