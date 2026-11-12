"""
Import des règles de Brave New World depuis les PDF vers src/data/*.json.

    python scripts/import_data.py "B:/WARHAMMER/Brave new world/Règles"

Lit, dans le dossier donné, la version la plus récente de chaque document :
  - Brave New World V*.pdf   -> rules.json (sections du livret) + images dans public/img/regles/
  - Profils <Faction> v*.pdf -> profils des unités (factions.json)
  - LA <Faction> V*.pdf      -> pouvoirs, règles spéciales et tableaux de faction (factions.json)
  - Ref Rapide V*.pdf        -> quickref.json

Dépendance : PyMuPDF (pip install pymupdf).
Les choix faits sur les données floues sont listés dans HYPOTHESES.md.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from corrections import Corrector  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
IMG = ROOT / "public" / "img" / "regles"

FACTIONS = [
    # id, nom affiché, préfixe du fichier Profils, préfixe du fichier LA
    ("cabale", "Cabale", "Profils Cabale", "LA Cabale"),
    ("corpo", "Corporations", "Profils Corpo", "LA Corpo"),
    ("umbra", "Umbra Sapiens", "Profils Umbra", "LA Umbra Sapiens"),
    ("vespara", "Vespara", "Profils Vespara", "LA Vespara"),
]

# Titre du profil -> emplacement dans l'arbre de recrutement.
SLOTS = {
    "véhicule léger": "leger",
    "véhicule moyen": "moyen",
    "véhicule lourd": "lourd",
    "volant léger": "volant-leger",
    "volant moyen": "volant-moyen",
    "artillerie": "artillerie",
    "unité spéciale": "speciale",
    "commandant": "commandant",
    "colosse": "colosse",
}

# Bonus d'arme -> identifiant de compétence (section 6 du livret).
BONUS = {
    "anti infanterie": "anti-infanterie",
    "anti-infanterie": "anti-infanterie",
    "anti air": "anti-aerien",
    "anti-air": "anti-aerien",
    "anti aérien": "anti-aerien",
    "sol uniquement": "sol-uniquement",
    "sol uniqement": "sol-uniquement",
    "air uniquement": "air-uniquement",
}

ZW = "\u200b\ufeff\u00a0"
BULLETS = "-•\uf0b7\uf0a7\uf0d8\u25cf\u25aa\u2022\u25e6o"


def clean(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    for c in ZW:
        s = s.replace(c, " " if c == "\u00a0" else "")
    s = s.replace("’", "'")
    s = re.sub(r"(\d)\s*[\u201d\"]", r'\1"', s)  # pouces : 3"
    s = s.replace("“", "« ").replace("”", " »")
    return re.sub(r"\s+", " ", s).strip()


def latest(folder: Path, prefix: str) -> Path:
    """Fichier le plus récent pour un préfixe (numéro de version le plus haut)."""
    cands = [p for p in folder.glob("*.pdf") if p.name.lower().startswith(prefix.lower())]
    if not cands:
        raise SystemExit(f"Aucun fichier « {prefix}*.pdf » dans {folder}")

    def version(p: Path):
        m = re.search(r"v\s*(\d+(?:\.\d+)*)", p.stem, re.I)
        return tuple(int(x) for x in m.group(1).split(".")) if m else (0,)

    return max(cands, key=version)


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def cell_texts(page, table):
    """Lignes d'un tableau, texte relu dans chaque cellule (find_tables perd les espaces)."""
    rows = []
    for row in table.rows:
        cells = []
        for c in row.cells:
            if c is None:
                continue
            t = clean(page.get_textbox(pymupdf.Rect(c)))
            cells.append(t)
        rows.append([c for c in cells if c != ""])
    return [r for r in rows if r]


# --------------------------------------------------------------------------- profils


def is_profile_table(rows) -> bool:
    """Tableau au format d'un profil d'unité (entêtes Nom/Bonus/Arc, puis Mouvement et Taille)."""
    firsts = [r[0] for r in rows]
    return "Nom" in firsts and "Mouvement" in firsts and "Taille" in firsts


def parse_profile(rows, example=False):
    """Un tableau de profil -> dict. Structure : titre, Armes, entêtes, armes…, Mouvement…, Taille…

    example=True : profil d'exemple du livret (2.2), sans emplacement dans l'arbre.
    """
    title = " ".join(rows[0][1:]).strip()
    slot = SLOTS.get(title.lower())
    if not slot and not example:
        raise ValueError(f"Profil inconnu : {title!r}")
    i = 0
    while rows[i][0] != "Nom":
        i += 1
    i += 1
    weapons = []
    while rows[i][0] != "Mouvement":
        r = rows[i]
        # 4 colonnes si le bonus est vide, 5 sinon.
        if len(r) == 5:
            name, bonus, arc, rng, shots = r
        elif len(r) == 4:
            name, arc, rng, shots = r
            bonus = ""
        else:
            raise ValueError(f"Arme illisible : {r}")
        bonus = "" if bonus.strip() in ("-", "") else bonus
        weapons.append(
            {
                "name": name,
                "bonus": BONUS.get(bonus.lower()) if bonus else None,
                "bonusLabel": bonus or None,
                "arc": arc,
                "range": int(rng),
                "shots": int(shots),
            }
        )
        i += 1
    move, defense, shield, zar = rows[i + 1]
    size, models, kind, power, points = rows[i + 3]
    a, m, b = (int(x) for x in power.split("/"))
    return {
        "slot": slot,
        "title": title,
        "move": move,
        "def": [int(x) for x in defense.split("+")],
        "shield": int(shield),
        "zar": int(zar),
        "size": size,
        "models": int(models),
        "type": "Air" if kind.lower() == "air" else "Sol",
        "power": {"A": a, "M": m, "B": b},
        "destruction": int(points),
        "weapons": weapons,
        "rules": [],
    }


def parse_profiles(path: Path):
    doc = pymupdf.open(path)
    units, infantry, notes = {}, None, []
    for page in doc:
        tables = page.find_tables().tables
        rects = [pymupdf.Rect(t.bbox) for t in tables]
        for t in tables:
            rows = cell_texts(page, t)
            if rows and rows[0] == ["Infanterie"]:
                infantry = {"def": int(rows[2][0]), "shield": int(rows[2][1]), "zar": int(rows[2][2])}
                continue
            p = parse_profile(rows)
            units[p["slot"]] = p
        for b in page.get_text("blocks"):
            if any(pymupdf.Rect(b[:4]).intersects(r) for r in rects):
                continue
            t = clean(b[4])
            if t:
                notes.append(t)
    # Notes de bas de page (« Nom : effet ») : rattachées à l'unité spéciale (cf. HYPOTHESES.md).
    for n in notes:
        name, _, text = n.partition(":")
        units["speciale"]["rules"].append({"name": clean(name), "text": clean(text)})
    return units, infantry


# --------------------------------------------------------------------------- texte mis en forme


def line_text(line) -> str:
    """Texte d'une ligne, gras en **…**."""
    out = ""
    for s in line["spans"]:
        t = s["text"]
        if not clean(t):
            out += t
            continue
        if s["flags"] & 16:
            lead = len(t) - len(t.lstrip())
            trail = len(t) - len(t.rstrip())
            core = t.strip()
            out += t[:lead] + "**" + core + "**" + (t[len(t) - trail :] if trail else "")
        else:
            out += t
    out = out.replace("****", "")
    return clean(out)


def is_bullet(t: str) -> bool:
    return len(t) <= 2 and all(c in BULLETS for c in t) and t != ""


def strip_bullet(t: str) -> tuple[bool, str]:
    m = re.match(r"^([" + re.escape(BULLETS.replace("o", "")) + r"])\s+(.*)$", t)
    if m:
        return True, m.group(2)
    return False, t


def lines_of(page, skip_rects=()):
    """Lignes de la page (hors tableaux) avec taille de police, position et texte."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        if any(pymupdf.Rect(b["bbox"]).intersects(r) for r in skip_rects):
            continue
        for ln in b["lines"]:
            raw = "".join(s["text"] for s in ln["spans"])
            t = clean(raw)
            if not t:
                continue
            s0 = next(s for s in ln["spans"] if clean(s["text"]))
            out.append(
                {
                    "text": t,
                    "rich": line_text(ln),
                    "size": round(s0["size"]),
                    "x": ln["bbox"][0],
                    "y": ln["bbox"][1],
                    "y1": ln["bbox"][3],
                    "x1": ln["bbox"][2],
                    "block": id(b),
                }
            )
    return out


ORDINAL = re.compile(r"^(\d+|[a-h]|[ivx]+)\.$")
ORDINAL_START = re.compile(r"^(\d+|[a-h]|[ivx]+)\.\s+\S")


def to_blocks(lines, base_x=72):
    """Lignes de texte -> blocs {p | li}.

    Dans ces PDF, puces et numéros (« a. », « ii. ») sont souvent des lignes à part.
    Une ligne courte termine son paragraphe, sauf si la suivante commence par une minuscule
    (Google Docs n'ajoute pas toujours d'espace entre paragraphes).
    """
    right = max((l["x1"] for l in lines), default=0)
    blocks = []
    cur = None
    marker = None  # puce ou numéro en attente
    prev = None
    for ln in lines:
        t = ln["rich"]
        raw = ln["text"]
        if is_bullet(raw):
            marker = ("", ln["x"])
            continue
        m = ORDINAL.match(raw)
        if m:
            marker = (raw + " ", ln["x"])
            continue
        # « Ramassage des pions ordres ii. » : numéro collé en fin de ligne.
        tail = re.search(r"\s((?:[ivx]+|[a-h])\.)$", raw)
        bullet, t = strip_bullet(t)
        numbered = bool(ORDINAL_START.match(raw))
        first = re.sub(r"^[*«\s]+", "", t)[:1]
        short = prev is not None and prev["x1"] < right - 45
        ended = short and not first.islower()
        bold_start = t.startswith("**") and prev is not None and re.search(r"[.)]$", prev["text"]) is not None
        new_para = (
            cur is None
            or marker is not None
            or bullet
            or numbered
            or ended
            or bold_start
            or (prev is not None and ln["y"] - prev["y1"] > 8)
            or (cur["type"] == "li" and ln["x"] <= base_x + 4 and not first.islower())
        )
        if new_para:
            x = marker[1] if marker else ln["x"]
            is_li = marker is not None or bullet or numbered
            cur = {"type": "li" if is_li else "p", "text": ((marker[0] if marker else "") + t)}
            if is_li:
                label = (marker[0] if marker else raw.split(" ")[0]).strip().rstrip(".")
                if marker and not marker[0] and not numbered:
                    cur["level"] = 0 if x <= base_x + 24 else 1
                elif label.isdigit():
                    cur["level"] = 0
                elif re.fullmatch(r"[ivx]+", label):
                    cur["level"] = 2
                else:
                    cur["level"] = 1
            blocks.append(cur)
        else:
            cur["text"] += " " + t
        marker = None
        if tail:
            cur["text"] = cur["text"][: -len(tail.group(1))].rstrip()
            marker = (tail.group(1) + " ", ln["x"])
        prev = ln
    for b in blocks:
        b["text"] = b["text"].replace("** **", " ").replace("****", "").strip()
    return blocks


# --------------------------------------------------------------------------- fiches de faction (LA)


def parse_la(path: Path):
    doc = pymupdf.open(path)
    sections: dict[str, list] = {}
    tables = []
    current = None
    for page in doc:
        tabs = page.find_tables().tables
        rects = [pymupdf.Rect(t.bbox) for t in tabs]
        for t in tabs:
            rows = cell_texts(page, t)
            tables.append({"columns": rows[0], "rows": rows[1:]})
        for ln in lines_of(page, rects):
            if ln["size"] >= 24:
                continue  # nom de la faction
            if ln["size"] >= 18:
                current = ln["text"]
                sections[current] = []
                continue
            if current:
                sections[current].append(ln)

    def text(name):
        return " ".join(l["text"] for l in sections.get(name, [])).strip()

    # Règles spéciales : un titre en gras terminé par « : », puis le texte.
    rules = []
    intro = []
    for ln in sections.get("Règles spéciales", []):
        m = re.match(r"^\*\*(.+?)\s*:\s*\*\*\s*(.*)$", ln["rich"]) or re.match(r"^\*\*(.+?)\*\*\s*:\s*(.*)$", ln["rich"])
        if m and ln["rich"].startswith("**"):
            rules.append({"name": clean(m.group(1)), "lines": [m.group(2)] if m.group(2) else []})
        elif rules:
            rules[-1]["lines"].append(ln["rich"])
        else:
            intro.append(ln["text"])
    special = []
    for r in rules:
        paras = []
        for l in r["lines"]:
            l = l.replace("**", "")
            if paras and not re.search(r"[.:)»]$", paras[-1]):
                paras[-1] += " " + l
            else:
                paras.append(l)
        special.append({"name": r["name"], "text": paras})
    return {
        "lore": text("Lore") or None,
        "factionPower": text("Pouvoir de faction"),
        "colossusPower": text("Pouvoir de Colosse"),
        "specialIntro": " ".join(intro) or None,
        "specialRules": special,
        "tables": tables,
    }


# --------------------------------------------------------------------------- livret de règles


HEADING = re.compile(r"^(\d+(?:\.\d+)*)\.?\s+(.+)$")


def parse_rulebook(path: Path):
    doc = pymupdf.open(path)
    IMG.mkdir(parents=True, exist_ok=True)
    for old in IMG.glob("*.png"):
        old.unlink()
    sections = []
    cur = None
    started = False
    for pno, page in enumerate(doc):
        tabs = page.find_tables().tables
        rects = [pymupdf.Rect(t.bbox) for t in tabs]
        items = []  # (y, kind, payload)
        for ln in lines_of(page, rects):
            if re.fullmatch(r"\d+", ln["text"]) and ln["y"] > page.rect.height - 80:
                continue  # numéro de page
            items.append((ln["y"], "line", ln))
        for t in tabs:
            items.append((t.bbox[1], "table", cell_texts(page, t)))
        for n, info in enumerate(page.get_image_info(xrefs=True)):
            if not info.get("xref"):
                continue
            name = f"p{pno + 1}-{n + 1}.png"
            pix = pymupdf.Pixmap(doc, info["xref"])
            if pix.n - pix.alpha >= 4:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            # Images très lourdes (fonds) réduites à une largeur raisonnable.
            if pix.width > 1400:
                page.get_pixmap(clip=pymupdf.Rect(info["bbox"]), dpi=150).save(IMG / name)
            else:
                pix.save(IMG / name)
            items.append((info["bbox"][1], "img", f"img/regles/{name}"))
        items.sort(key=lambda x: x[0])

        buf = []
        images = []

        def flush():
            if cur is not None and buf:
                cur["blocks"].extend(to_blocks(buf))
            buf.clear()

        for _, kind, payload in items:
            if kind == "line":
                ln = payload
                m = HEADING.match(ln["text"])
                if ln["size"] >= 12 and m:
                    flush()
                    num = m.group(1)
                    if num == "1":
                        started = True  # les pages précédentes sont le sommaire
                    if not started:
                        continue
                    cur = {
                        "id": num,
                        "title": clean(m.group(2)),
                        "level": num.count(".") + 1,
                        "blocks": [],
                    }
                    sections.append(cur)
                elif started and cur is not None:
                    buf.append(ln)
            elif started and cur is not None:
                if kind == "table":
                    flush()
                    if is_profile_table(payload):
                        # Profil d'exemple : affiché avec la même fiche que les unités du site.
                        prof = parse_profile(payload, example=True)
                        prof["faction"] = payload[0][0]
                        cur["blocks"].append({"type": "profile", "profile": prof})
                    else:
                        cur["blocks"].append({"type": "table", "rows": payload})
                else:
                    images.append((cur, payload))
        flush()
        for sec, src in images:
            sec["blocks"].append({"type": "img", "src": src})
        images.clear()
    return sections


def skills_from(sections):
    """Section 6 : « Nom = effet »."""
    sec = next(s for s in sections if s["id"] == "6")
    skills = []
    for b in sec["blocks"]:
        m = re.match(r"^([^=]+?)\s*=\s*(.+)$", b["text"].replace("**", ""))
        if m:
            name = m.group(1).strip()
            skills.append({"id": slug(name).replace("anti-aerien", "anti-aerien"), "name": name, "text": m.group(2).strip()})
    return skills


# --------------------------------------------------------------------------- référence rapide


def parse_quickref(path: Path):
    doc = pymupdf.open(path)
    page = doc[0]
    mid = page.rect.width / 2
    cards = []
    for col in (0, 1):
        lines = [l for l in lines_of(page) if (l["x"] < mid - 20) == (col == 0)]
        lines.sort(key=lambda l: l["y"])
        cur = None
        buf = []
        for l in lines:
            if l["size"] >= 12 and l["text"].endswith(":"):
                if cur:
                    cur["blocks"] = to_blocks(buf, base_x=l["x"])
                    buf = []
                cur = {"title": l["text"].rstrip(" :"), "blocks": []}
                cards.append(cur)
            elif l["size"] >= 12:
                continue  # titre de la page
            elif cur:
                buf.append(l)
        if cur:
            cur["blocks"] = to_blocks(buf, base_x=lines[0]["x"] if lines else 72)
    return cards


# --------------------------------------------------------------------------- main


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    folder = Path(sys.argv[1])
    DATA.mkdir(parents=True, exist_ok=True)

    book = latest(folder, "Brave New World")
    rules = parse_rulebook(book)
    lore_by_faction = {}
    for s in rules:
        if s["id"] in ("7.1.1", "7.2.1", "7.3.1", "7.4.1"):
            lore_by_faction[s["id"]] = " ".join(b["text"] for b in s["blocks"])

    factions = []
    sources = {"rules": book.name}
    for idx, (fid, name, prof_prefix, la_prefix) in enumerate(FACTIONS):
        prof = latest(folder, prof_prefix)
        la = latest(folder, la_prefix)
        units, infantry = parse_profiles(prof)
        info = parse_la(la)
        # Umbra : les unités moyennes et lourdes ont la règle « Relais » (règle spéciale de faction).
        if fid == "umbra":
            for u in units.values():
                if u["size"] in ("Moyen", "Lourd"):
                    u["rules"].append({"name": "Relais", "text": "Relaie la distribution d'énergie (L) depuis le véhicule de commandement."})
        missing = [s for s in SLOTS.values() if s not in units]
        if missing:
            raise SystemExit(f"{prof.name} : profils manquants {missing}")
        factions.append(
            {
                "id": fid,
                "name": name,
                "lore": info["lore"],
                "background": lore_by_faction.get(f"7.{idx + 1}.1"),
                "factionPower": info["factionPower"],
                "colossusPower": info["colossusPower"],
                "specialIntro": info["specialIntro"],
                "specialRules": info["specialRules"],
                "tables": info["tables"],
                "infantry": infantry,
                "units": units,
                "sources": {"profiles": prof.name, "list": la.name},
            }
        )
        print(f"{name:15} {len(units)} profils · {len(info['specialRules'])} règles spéciales · {len(info['tables'])} tableau(x)  [{prof.name}, {la.name}]")

    quick = latest(folder, "Ref Rapide")
    sources["quickref"] = quick.name

    # Corrections du texte (scripts/corrections.py), avant d'en tirer les compétences.
    fix = Corrector()
    factions = fix.walk(factions)
    rules = fix.walk(rules)
    quickref = fix.walk(parse_quickref(quick))
    # Arme de l'exemple 2.2 : même nom que dans les profils des factions.
    for s in rules:
        for b in s["blocks"]:
            if b["type"] == "profile":
                for w in b["profile"]["weapons"]:
                    if w["name"] == "Machinegun":
                        w["name"] = "Machine gun"
    fix.report()

    write("factions.json", factions)
    write("rules.json", rules)
    write("skills.json", skills_from(rules))
    write("quickref.json", quickref)
    write("sources.json", sources)
    print(f"Règles : {len(rules)} sections ({book.name}), images dans {IMG.relative_to(ROOT)}")


def write(name, data):
    (DATA / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
