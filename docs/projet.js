// Comportement des pages projet : onglets, repères sur les captures, agrandissement.
document.documentElement.classList.add("js");

// Repères : leur position est donnée en pourcentage de la capture (data-gauche, data-haut).
document.querySelectorAll(".repere").forEach((repere) => {
  repere.style.left = repere.dataset.gauche + "%";
  repere.style.top = repere.dataset.haut + "%";
});

// Lien entre un repère et son explication, dans chaque panneau.
document.querySelectorAll(".panneau").forEach((panneau) => {
  const activer = (numero) => {
    panneau.querySelectorAll("[data-note]").forEach((el) =>
      el.classList.toggle("actif", el.dataset.note === numero));
  };
  panneau.querySelectorAll("[data-note]").forEach((el) => {
    el.addEventListener("click", () => activer(el.dataset.note));
    el.addEventListener("mouseenter", () => activer(el.dataset.note));
  });
  panneau.querySelectorAll(".repere").forEach((repere) => {
    const titre = panneau.querySelector(`.note[data-note="${repere.dataset.note}"] strong`);
    if (titre) repere.setAttribute("aria-label", `Repère ${repere.dataset.note} : ${titre.textContent}`);
  });
});

// Onglets : clic et flèches du clavier.
const onglets = [...document.querySelectorAll(".onglet")];
const choisir = (onglet) => {
  onglets.forEach((o) => {
    const actif = o === onglet;
    o.setAttribute("aria-selected", actif);
    o.tabIndex = actif ? 0 : -1;
    document.getElementById(o.getAttribute("aria-controls")).hidden = !actif;
  });
  onglet.focus();
};
onglets.forEach((onglet, i) => {
  onglet.addEventListener("click", () => choisir(onglet));
  onglet.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") choisir(onglets[(i + 1) % onglets.length]);
    if (e.key === "ArrowLeft") choisir(onglets[(i - 1 + onglets.length) % onglets.length]);
  });
});

// Agrandissement de la capture.
const fenetre = document.getElementById("agrandissement");
if (fenetre) {
  const grande = fenetre.querySelector("img");
  document.querySelectorAll(".agrandir").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const image = bouton.closest(".panneau, .tuile").querySelector(".capture img");
      grande.src = image.src;
      grande.alt = image.alt;
      fenetre.showModal();
    });
  });
  // Un clic sur une capture de visuel l'ouvre aussi en grand.
  document.querySelectorAll(".tuile .capture img").forEach((image) => {
    image.addEventListener("click", () => {
      grande.src = image.src;
      grande.alt = image.alt;
      fenetre.showModal();
    });
  });
  fenetre.querySelector(".fermer").addEventListener("click", () => fenetre.close());
  fenetre.addEventListener("click", (e) => { if (e.target === fenetre) fenetre.close(); });
}

// Capture annotée : chaque bulle pointe vers un endroit de la capture (data-cible="x,y" en %).
document.querySelectorAll(".schema").forEach((schema) => {
  const svg = schema.querySelector(".fleches");
  const image = schema.querySelector(".capture img");
  const bulles = [...schema.querySelectorAll(".bulle")];
  const ns = "http://www.w3.org/2000/svg";
  const creer = (nom, attributs) => {
    const el = document.createElementNS(ns, nom);
    Object.entries(attributs).forEach(([cle, valeur]) => el.setAttribute(cle, valeur));
    return svg.appendChild(el);
  };
  bulles.forEach((bulle, i) => bulle.querySelector("strong").dataset.num = i + 1);

  const tracer = () => {
    svg.replaceChildren();
    const cadre = schema.getBoundingClientRect();
    const img = image.getBoundingClientRect();
    const empile = matchMedia("(max-width: 1100px)").matches;
    bulles.forEach((bulle, i) => {
      const [x, y] = bulle.dataset.cible.split(",").map(Number);
      const cx = img.left - cadre.left + img.width * x / 100;
      const cy = img.top - cadre.top + img.height * y / 100;
      if (empile) {
        creer("circle", { class: "pastille", cx, cy, r: 9 });
        creer("text", { x: cx, y: cy }).textContent = i + 1;
        return;
      }
      const b = bulle.getBoundingClientRect();
      const gauche = bulle.closest(".gauche");
      const bx = (gauche ? b.right : b.left) - cadre.left;
      const by = b.top + b.height / 2 - cadre.top;
      creer("line", { x1: bx, y1: by, x2: cx, y2: cy });
      creer("circle", { class: "point", cx: bx, cy: by, r: 3 });
      creer("circle", { class: "pastille", cx, cy, r: 9 });
      creer("text", { x: cx, y: cy }).textContent = i + 1;
    });
  };
  new ResizeObserver(tracer).observe(schema);
  image.addEventListener("load", tracer);
  tracer();
});
