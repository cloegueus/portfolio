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

// Capture annotée : chaque texte décrit une zone de la capture (data-zone="x,y,largeur,hauteur" en %).
document.querySelectorAll(".schema").forEach((schema) => {
  const svg = schema.querySelector(".traits");
  const image = schema.querySelector(".capture img");
  const notes = [...schema.querySelectorAll(".zone-note")];
  const zones = notes.map((note) => note.dataset.zone.split(",").map(Number));
  const ns = "http://www.w3.org/2000/svg";
  const creer = (parent, nom, attributs) => {
    const el = document.createElementNS(ns, nom);
    Object.entries(attributs).forEach(([cle, valeur]) => el.setAttribute(cle, valeur));
    return parent.appendChild(el);
  };
  let elements = [];
  let trou = null;

  // Trait coudé à angles arrondis : horizontal d'abord pour les côtés, vertical d'abord pour le bas.
  const coude = (a, b, vertical) => {
    const r = 8;
    if (vertical) {
      const my = (a.y + b.y) / 2, s = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y);
      if (Math.abs(b.x - a.x) < 2 * r) return `M${a.x},${a.y} V${b.y}`;
      return `M${a.x},${a.y} V${my - dy * r} Q${a.x},${my} ${a.x + s * r},${my} H${b.x - s * r} Q${b.x},${my} ${b.x},${my + dy * r} V${b.y}`;
    }
    const mx = (a.x + b.x) / 2, s = Math.sign(b.y - a.y), dx = Math.sign(b.x - a.x);
    if (Math.abs(b.y - a.y) < 2 * r) return `M${a.x},${a.y} H${b.x}`;
    return `M${a.x},${a.y} H${mx - dx * r} Q${mx},${a.y} ${mx},${a.y + s * r} V${b.y - s * r} Q${mx},${b.y} ${mx + dx * r},${b.y} H${b.x}`;
  };

  const tracer = () => {
    svg.replaceChildren();
    const cadre = schema.getBoundingClientRect();
    const img = image.getBoundingClientRect();
    const ix = img.left - cadre.left, iy = img.top - cadre.top;

    // Voile sombre sur la capture, percé à l'endroit de la zone survolée.
    const masque = creer(creer(svg, "defs", {}), "mask", { id: "trou-" + schema.id });
    creer(masque, "rect", { x: ix, y: iy, width: img.width, height: img.height, fill: "#fff" });
    trou = creer(masque, "rect", { rx: 6, fill: "#000", width: 0, height: 0 });
    creer(svg, "rect", { class: "voile", x: ix, y: iy, width: img.width, height: img.height, mask: `url(#trou-${schema.id})` });

    elements = notes.map((note, i) => {
      const [x, y, l, h] = zones[i];
      const z = { x: ix + img.width * x / 100, y: iy + img.height * y / 100, l: img.width * l / 100, h: img.height * h / 100 };
      const cadreZone = creer(svg, "rect", { class: "cadre", x: z.x, y: z.y, width: z.l, height: z.h, rx: 6 });
      const n = note.getBoundingClientRect();
      const titre = note.querySelector("strong").getBoundingClientRect();
      const ty = titre.top + titre.height / 2 - cadre.top;
      const cote = note.closest(".notes-zone").classList;
      let d;
      if (cote.contains("gauche")) d = coude({ x: n.right - cadre.left + 10, y: ty }, { x: z.x, y: z.y + z.h / 2 });
      else if (cote.contains("droite")) d = coude({ x: n.left - cadre.left - 10, y: ty }, { x: z.x + z.l, y: z.y + z.h / 2 });
      else d = coude({ x: n.left + n.width / 2 - cadre.left, y: n.top - cadre.top - 10 }, { x: z.x + z.l / 2, y: z.y + z.h }, true);
      return { cadreZone, chemin: creer(svg, "path", { d }), z };
    });
  };

  const activer = (i) => {
    schema.classList.toggle("survol", i !== null);
    notes.forEach((note, j) => {
      note.classList.toggle("active", j === i);
      elements[j].cadreZone.classList.toggle("active", j === i);
      elements[j].chemin.classList.toggle("active", j === i);
    });
    if (i !== null) {
      const { z } = elements[i];
      Object.entries({ x: z.x, y: z.y, width: z.l, height: z.h }).forEach(([cle, valeur]) => trou.setAttribute(cle, valeur));
    }
  };

  notes.forEach((note, i) => {
    note.tabIndex = 0;
    note.addEventListener("mouseenter", () => activer(i));
    note.addEventListener("focus", () => activer(i));
    note.addEventListener("mouseleave", () => activer(null));
    note.addEventListener("blur", () => activer(null));
  });
  // Survoler la capture allume aussi l'explication de la zone pointée.
  image.addEventListener("mousemove", (e) => {
    const img = image.getBoundingClientRect();
    const px = (e.clientX - img.left) / img.width * 100, py = (e.clientY - img.top) / img.height * 100;
    const i = zones.findIndex(([x, y, l, h]) => px >= x && px <= x + l && py >= y && py <= y + h);
    activer(i === -1 ? null : i);
  });
  image.addEventListener("mouseleave", () => activer(null));

  new ResizeObserver(tracer).observe(schema);
  image.addEventListener("load", tracer);
  tracer();
});
