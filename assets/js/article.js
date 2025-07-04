const links = document.querySelectorAll(".sidebar-nav a");
const map = {};
const sidebar = document.querySelector("aside");

let isManualClick = false;
links.forEach((link) => {
  link.addEventListener("click", (e) => {
    isManualClick = true;
    links.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    setTimeout(() => {
      isManualClick = false;
    }, 500);
  });
});

links.forEach((l) => (map[l.getAttribute("href").slice(1)] = l));
const io = new IntersectionObserver(
  (entries) => {
    if (isManualClick) return;
    entries.forEach((e) => {
      if (e.intersectionRatio > 0) {
        links.forEach((l) => l.classList.remove("active"));
        //   map[e.target.id]?.classList.add("active");
        const activeLink = map[e.target.id];
        if (activeLink) {
          activeLink.classList.add("active");
          const sidebarRect = sidebar.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          const scrollAmount =
            linkRect.top - sidebarRect.top - sidebarRect.height / 2;
          sidebar.scrollBy({
            top: scrollAmount,
            behavior: "smooth",
          });
        }
      }
    });
  },
  {
    threshold: 0,
    rootMargin: "0px 0px -80% 0px",
  }
);
document
  .querySelectorAll("article h2,article h3,article h4,article h5,article h6")
  .forEach((h) => io.observe(h));

document.querySelectorAll("pre > code").forEach((codeBlock) => {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "Copy";

  codeBlock.parentNode.prepend(btn);

  btn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(codeBlock.textContent)
      .then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 2000);
      })
      .catch((err) => console.error("Fail:", err));
  });
});
