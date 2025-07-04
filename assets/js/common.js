const header = document.querySelector("header");
let lastScroll = 0;
window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;

  if (currentScroll <= 0) {
    header.classList.remove("hidden");
    return;
  }

  if (currentScroll > lastScroll && !header.classList.contains("hidden")) {
    header.classList.add("hidden");
  } else if (
    currentScroll < lastScroll &&
    header.classList.contains("hidden")
  ) {
    header.classList.remove("hidden");
  }

  lastScroll = currentScroll;
});

const backToTopBtn = document.querySelector(".back-to-top");
window.addEventListener("scroll", () => {
  backToTopBtn.classList.toggle("show", window.scrollY > 300);
});
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
