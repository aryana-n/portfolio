document.addEventListener("DOMContentLoaded", (event) => {
  fetch("projects.json")
    .then((response) => response.json())
    .then((projects) => renderProjects(projects))
    .catch((err) => console.error("Failed to load projects:", err));
});

function renderProjects(projects) {
  const container = document.getElementById("project-list");
  const expandedMediaContainer = document.getElementById("expanded-media");
  const expandedTextContainer = document.getElementById("expanded-text");

  projects.forEach((project, index) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("project");

    // --- Project title ---
    const title = document.createElement("div");
    title.classList.add("project-title");
    title.innerHTML = `
      <span class="title-number">${index + 1}</span>
      <span class="title-text">${project.title}</span>
      <span class="title-meta-wrapper">
        <span class="title-meta">${project.type}</span><br>
        <span class="title-meta">${project.year}</span>
      </span>
    `;

    title.addEventListener("click", () => {
      const isCurrentlyOpen = wrapper.classList.contains("expanded");

      // Close all projects
      document
        .querySelectorAll(".project")
        .forEach((p) => p.classList.remove("expanded", "inactive"));

      // Clear previous expanded content
      expandedMediaContainer.innerHTML = "";
      expandedTextContainer.innerHTML = "";

      if (!isCurrentlyOpen) {
        wrapper.classList.add("expanded");

        // Dim other projects
        document.querySelectorAll(".project").forEach((p) => {
          if (p !== wrapper) p.classList.add("inactive");
        });

        // --- MEDIA ---
        const mediaWrapper = document.createElement("div");
        mediaWrapper.classList.add("project-media");

        project.media.forEach((src) => {
          let el;
          if (src.match(/\.(mp4|webm)$/)) {
            el = document.createElement("video");
            el.src = src;
            el.controls = false;
            el.autoplay = true;
            el.muted = true;
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
          });
        }
        showSlide();

        const zoomOverlay = document.getElementById("media-zoom-overlay");

        // --- Mouse-based slide navigation ---
        mediaWrapper.addEventListener("mousemove", (e) => {
          const rect = mediaWrapper.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const thirdWidth = rect.width / 4;

          // Remove both classes by default
          mediaWrapper.classList.remove("cursor-left", "cursor-right");

          if (mouseX < thirdWidth) {
            // Left 1/3
            mediaWrapper.classList.add("cursor-left");
          } else if (mouseX > rect.width - thirdWidth) {
            // Right 1/3
            mediaWrapper.classList.add("cursor-right");
          }
          // Middle 1/3: no cursor class
        });

        mediaWrapper.addEventListener("click", (e) => {
          const rect = mediaWrapper.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const thirdWidth = rect.width / 4;

          if (mouseX < thirdWidth) {
            // Left third → previous
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            showSlide();
          } else if (mouseX > rect.width - thirdWidth) {
            // Right third → next
            currentIndex = (currentIndex + 1) % slides.length;
            showSlide();
          } else {
            // Middle section → zoom in
            const original = slides[currentIndex];
            const clone = original.cloneNode(true);

            zoomOverlay.innerHTML = ""; // clear previous
            zoomOverlay.appendChild(clone);

            // Position clone where the original is
            const origRect = original.getBoundingClientRect();
            clone.style.top = `${origRect.top}px`;
            clone.style.left = `${origRect.left}px`;
            clone.style.width = `${origRect.width}px`;
            clone.style.height = `${origRect.height}px`;

            // Activate overlay immediately (background still transparent)
            zoomOverlay.classList.add("active");

            // Force reflow so transition triggers
            clone.getBoundingClientRect();

            // Target size (centered)
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const maxWidth = viewportWidth * 0.95;
            const maxHeight = viewportHeight * 0.95;
            const ratio = origRect.width / origRect.height;
            let finalWidth = maxWidth;
            let finalHeight = finalWidth / ratio;
            if (finalHeight > maxHeight) {
              finalHeight = maxHeight;
              finalWidth = finalHeight * ratio;
            }

            clone.style.top = `${(viewportHeight - finalHeight) / 2}px`;
            clone.style.left = `${(viewportWidth - finalWidth) / 2}px`;
            clone.style.width = `${finalWidth}px`;
            clone.style.height = `${finalHeight}px`;
          }
        });

        zoomOverlay.addEventListener("click", () => {
          const img = zoomOverlay.querySelector("img, video");
          if (!img) return;

          const orig = slides[currentIndex];
          const origRect = orig.getBoundingClientRect();

          // Animate back to original
          img.style.top = `${origRect.top}px`;
          img.style.left = `${origRect.left}px`;
          img.style.width = `${origRect.width}px`;
          img.style.height = `${origRect.height}px`;

          // Fade background to transparent
          zoomOverlay.classList.remove("active");

          // Clean up after transition
          img.addEventListener(
            "transitionend",
            () => {
              zoomOverlay.innerHTML = "";
              zoomOverlay.classList.remove("active"); // ensure reset
              zoomOverlay.removeAttribute("style"); // clear pointer-events override
            },
            { once: true }
          );
        });

        // Append media to expanded container
        expandedMediaContainer.appendChild(mediaWrapper);

        // --- TEXT ---
        const textWrapper = document.createElement("div");
        textWrapper.classList.add("project-text");
        const description = document.createElement("p");
        description.textContent = project.description;
        description.classList.add("project-description");
        textWrapper.appendChild(description);
        expandedTextContainer.appendChild(textWrapper);

        // Optional: smooth-scroll to project
        const rect = wrapper.getBoundingClientRect();
        const elementTop = rect.top + window.pageYOffset;
        const elementHeight = rect.height;
        const offset = (window.innerHeight - elementHeight) / 2;
        const scrollTo = elementTop - offset;
        window.scrollTo({ top: scrollTo, behavior: "smooth" });
      }
    });

    wrapper.appendChild(title);
    container.appendChild(wrapper);
  });
}
