// Keep everyday navigation together, followed by people and community planning.
{
  const navigation = document.querySelector(".nav");
  const groups = [
    ["bookmarks", "rules"],
    ["activity", "ideas", "tasks", "contributions"],
    ["people", "exchange", "resource"],
    ["framework", "governance", "process", "requests"],
  ];
  groups.forEach((group, groupIndex) =>
    group.forEach((section, index) => {
      const link = navigation.querySelector(`[data-view="${section}"]`);
      if (!link) return;
      link.classList.toggle("nav-group-start", groupIndex > 0 && index === 0);
      link
        .querySelectorAll("svg, [data-icon]")
        .forEach((icon) => icon.remove());
      link.querySelectorAll("span").forEach((span) => {
        if (!span.textContent.trim() && !span.children.length) span.remove();
      });
      navigation.append(link);
    }),
  );
}

document.querySelectorAll(".sidebar .brand").forEach((brand) => {
  brand.innerHTML =
    '<img class="brand-wordmark" src="/mapleforge-wordmark-transparent.png" alt="MapleForge" width="2170" height="725">';
});
