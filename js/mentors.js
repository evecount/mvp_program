/**
 * Mamba MVP — Meet the Mentors.
 *
 * Add a mentor by adding an entry to MENTORS. Only `name` and `role` are
 * required; without a `photo` the card shows their initials.
 *
 *   {
 *     name: "Full Name",
 *     role: "Title",
 *     org: "Company",                       // optional
 *     photo: "assets/mentors/full-name.jpg", // optional, square works best
 *     bio: "One or two sentences.",          // optional
 *     focus: ["Go-to-market", "Fundraising"],// optional tags
 *     linkedin: "https://linkedin.com/in/…", // optional
 *   }
 */
const MENTORS = [
  { name: "James Sun", role: "Venture Partner", org: "Mamba Partners" },
];

(function () {
  const grid = document.getElementById("mentor-grid");
  if (!grid) return;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const initials = (name) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  for (const m of MENTORS) {
    const card = el("article", "mentor-card");
    let avatar;
    if (m.photo) {
      avatar = el("img", "mentor-avatar");
      avatar.src = m.photo;
      avatar.alt = m.name;
      avatar.loading = "lazy";
    } else {
      avatar = el("div", "mentor-avatar mentor-avatar--initials", initials(m.name));
      avatar.setAttribute("aria-hidden", "true");
    }
    card.append(avatar, el("h3", "mentor-name", m.name));
    card.append(el("p", "mentor-role", m.org ? `${m.role}, ${m.org}` : m.role));
    if (m.bio) card.append(el("p", "mentor-bio", m.bio));
    if (m.focus?.length) {
      const tags = el("div", "mentor-tags");
      for (const f of m.focus) tags.append(el("span", "mentor-tag", f));
      card.append(tags);
    }
    if (m.linkedin) {
      const a = el("a", "mentor-link", "LinkedIn →");
      a.href = m.linkedin;
      a.target = "_blank";
      a.rel = "noopener";
      card.append(a);
    }
    grid.append(card);
  }

  const soon = el("article", "mentor-card mentor-card--soon");
  soon.append(
    el("div", "mentor-avatar mentor-avatar--initials", "+"),
    el("h3", "mentor-name", "More mentors"),
    el("p", "mentor-role", "Announced ahead of the January 2027 cohort."),
  );
  grid.append(soon);
})();
