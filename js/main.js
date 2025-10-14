document.addEventListener("DOMContentLoaded", (event) => {
  fetch("projects.json")
    .then((response) => response.json())
    .then((projects) => renderProjects(projects))
    .catch((err) => console.error("Failed to load projects:", err));
});

function renderProjects(projects) {
  const container = document.getElementById("project-list");
  const template = container.querySelector(".project.template");

  const expandedMediaContainer = document.getElementById("expanded-media");
  const expandedTextContainer = document.getElementById("expanded-text");
  const zoomOverlay = document.getElementById("media-zoom-overlay");

  const hoverPreview = document.getElementById("project-hover-preview");

  projects.forEach((project, index) => {
    // Clone template
    const wrapper = template.cloneNode(true);
    wrapper.classList.remove("template");
    wrapper.style.display = ""; // make it visible

    // Fill in content
    wrapper.querySelector(".project-title").textContent = project.title;
    wrapper.querySelector(".title-year").textContent = project.year;
    wrapper.querySelector(".title-type").textContent = project.type;

    // Fill overlay text content

    wrapper.addEventListener("mouseenter", () => {
      if (!project.media || !project.media.length) return;

      const firstMedia = project.media[0];
      let el = document.createElement("img");

      if (firstMedia.match(/\.(mp4|webm)$/)) {
        // Use thumbnail instead of video
        const thumbSrc = firstMedia.replace(/\.(mp4|webm)$/, "-thumb.jpg");
        el.src = thumbSrc;
      } else {
        el.src = firstMedia; // normal image
      }

      el.alt = project.title;
      expandedMediaContainer.innerHTML = "";
      expandedMediaContainer.appendChild(el);
      expandedMediaContainer.style.display = "block";
    });
    wrapper.addEventListener("mouseleave", () => {
      expandedMediaContainer.style.display = "none";
      expandedMediaContainer.innerHTML = "";
    });

    container.appendChild(wrapper);

    // Add click behavior
    wrapper.addEventListener("click", () => {
      if (!project.media || !project.media.length) return;

      // Clear old overlay content (except close button)
      zoomOverlay.querySelectorAll(".project-media").forEach((m) => m.remove());

      // --- MEDIA WRAPPER (slideshow container) ---
      const mediaWrapper = document.createElement("div");
      mediaWrapper.classList.add("project-media");
      zoomOverlay.appendChild(mediaWrapper);

      // ✅ Correct placement – update overlay text on open
      const overlayText = document.getElementById("overlay-text");
      overlayText.querySelector(".overlay-title").textContent = project.title;
      overlayText.querySelector(".overlay-year").textContent = project.year;
      overlayText.querySelector(".overlay-type").textContent = project.type;
      overlayText.querySelector(".overlay-description").textContent =
        project.description || "";

      // Add all media as slides
      project.media.forEach((src) => {
        let el;
        if (src.match(/\.(mp4|webm)$/)) {
          el = document.createElement("video");
          el.src = src;
          el.controls = false;
          el.autoplay = true;
          el.muted = true;
          el.loop = true;
        } else {
          el = document.createElement("img");
          el.src = src;
          el.alt = project.title;
        }
        mediaWrapper.appendChild(el);
      });

      const slides = Array.from(mediaWrapper.children);
      let currentIndex = 0;

      function showSlide() {
        slides.forEach((slide, i) => {
          slide.style.display = i === currentIndex ? "block" : "none";
          slide.style.position = "absolute"; // stack slides
          slide.style.top = "0";
          slide.style.left = "0";
          slide.style.width = "100%";
          slide.style.height = "100%";
          slide.style.objectFit = "contain";
        });
      }
      showSlide();

      // --- Cursor + navigation across full screen ---
      // --- Cursor + navigation across full screen ---
      function updateCursor(e) {
        if (!zoomOverlay.classList.contains("active") || slides.length <= 1) {
          document.body.classList.remove("cursor-left", "cursor-right");
          return;
        }
        const marginTop = 60; // px safe zone at the top (for close button etc.)
        const marginSides = 60; // px safe zone left + right

        const withinY = e.clientY > marginTop;
        const withinX =
          e.clientX > marginSides &&
          e.clientX < window.innerWidth - marginSides;
        if (!withinY || !withinX) {
          document.body.classList.remove("cursor-left", "cursor-right");
          return;
        }
        const halfWidth = window.innerWidth / 2;
        document.body.classList.remove("cursor-left", "cursor-right");

        if (e.clientX < halfWidth) {
          document.body.classList.add("cursor-left");
        } else {
          document.body.classList.add("cursor-right");
        }
      }

      function handleClick(e) {
        if (!zoomOverlay.classList.contains("active") || slides.length <= 1)
          return;

        const marginTop = 60; // px safe zone at the top (for close button etc.)
        const marginSides = 60; // px safe zone left + right

        const withinY = e.clientY > marginTop;
        const withinX =
          e.clientX > marginSides &&
          e.clientX < window.innerWidth - marginSides;
        if (!withinY || !withinX) return;

        // prevent clicks on close button from triggering slide nav
        if (e.target.closest("#overlay-close")) return;

        const halfWidth = window.innerWidth / 2;
        if (e.clientX < halfWidth) {
          currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        } else {
          currentIndex = (currentIndex + 1) % slides.length;
        }
        showSlide();
      }

      // Attach AFTER overlay is active
      document.addEventListener("mousemove", updateCursor);

      setTimeout(() => {
        document.addEventListener("click", handleClick);
      }, 0); // this ensures the first click (open) is ignored

      // document.addEventListener("click", handleClick);

      // --- Keyboard navigation ---
      function handleKey(e) {
        if (!zoomOverlay.classList.contains("active")) return;
        if (e.key === "ArrowLeft") {
          currentIndex = (currentIndex - 1 + slides.length) % slides.length;
          showSlide();
        }
        if (e.key === "ArrowRight") {
          currentIndex = (currentIndex + 1) % slides.length;
          showSlide();
        }
        if (e.key === "Escape") {
          closeZoomOverlay();
        }
      }
      document.addEventListener("keydown", handleKey);

      // --- Animate from preview to overlay ---
      const preview = expandedMediaContainer.querySelector("img, video");
      const firstSlide = slides[currentIndex];
      const origRect = preview
        ? preview.getBoundingClientRect()
        : firstSlide.getBoundingClientRect();

      mediaWrapper.style.position = "absolute";
      mediaWrapper.style.top = `${origRect.top}px`;
      mediaWrapper.style.left = `${origRect.left}px`;
      mediaWrapper.style.width = `${origRect.width}px`;
      mediaWrapper.style.height = `${origRect.height}px`;

      zoomOverlay.classList.add("active");
      mediaWrapper.getBoundingClientRect(); // force reflow

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxWidth = viewportWidth * 0.75;
      const maxHeight = viewportHeight * 0.75;
      const ratio = origRect.width / origRect.height;
      let finalWidth = maxWidth;
      let finalHeight = finalWidth / ratio;
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = finalHeight * ratio;
      }

      mediaWrapper.style.top = `${(viewportHeight - finalHeight) / 2}px`;
      mediaWrapper.style.left = `${(viewportWidth - finalWidth) / 2}px`;
      mediaWrapper.style.width = `${finalWidth}px`;
      mediaWrapper.style.height = `${finalHeight}px`;

      const overlayClose = document.getElementById("overlay-close");
      overlayClose.addEventListener("click", closeZoomOverlay);

      // --- Close overlay ---
      function closeZoomOverlay() {
        const mediaWrapper = zoomOverlay.querySelector(".project-media");
        if (!mediaWrapper) return;

        overlayText.querySelector(".overlay-title").textContent = "";
        overlayText.querySelector(".overlay-year").textContent = "";
        overlayText.querySelector(".overlay-type").textContent = "";
        overlayText.querySelector(".overlay-description").textContent = "";

        const preview = expandedMediaContainer.querySelector("img, video");

        if (!preview) {
          zoomOverlay.classList.remove("active");
          mediaWrapper.remove();
          document.body.classList.remove("cursor-left", "cursor-right");
          document.removeEventListener("mousemove", updateCursor);
          document.removeEventListener("click", handleClick);
          document.removeEventListener("keydown", handleKey);
          return;
        }

        const origRect = preview.getBoundingClientRect();
        mediaWrapper.style.top = `${origRect.top}px`;
        mediaWrapper.style.left = `${origRect.left}px`;
        mediaWrapper.style.width = `${origRect.width}px`;
        mediaWrapper.style.height = `${origRect.height}px`;

        zoomOverlay.classList.remove("active");

        mediaWrapper.addEventListener(
          "transitionend",
          () => {
            mediaWrapper.remove();
            document.body.classList.remove("cursor-left", "cursor-right");
            document.removeEventListener("mousemove", updateCursor);
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleKey);
          },
          { once: true }
        );
      }
    });
  });
}
