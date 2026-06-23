# Growables — Bauteil-für-Bauteil wachsende Objekte

*Was hier liegt und wie es entstand. Stand: 2026-06-23.*

In "600 Billion" werden Bitcoin-Timelocks zu sichtbaren, ownable Objekten, die ueber Zeit
**wachsen** — "a tree, a vehicle, a 21-year spaceship". Dieses Verzeichnis liefert genau solche
Objekte als wiederverwendbare Assets, gebaut nach der Invariante **"Art is static, state is data"**.

## Was wir gebaut haben

Drei prozedural in Blender erzeugte "Growables", jeweils als statische glTF-Geometrie plus eine
Wachstums-Datendatei. Der Aufbau/Wuchs ist **nicht** ins Modell gebacken, sondern wird zur Laufzeit
aus einem einzigen Fortschrittswert `progress` (0..1) gefahren.

| Asset | Bedeutung im Spiel | Geometrie | Daten | Teile |
|---|---|---|---|---|
| **Apfelbaum** (im Terrakotta-Topf) | "a tree" — Lebenszyklus mit Bluete & Frucht | `apple-tree.glb` | `apple-tree.growth.json` | 947 |
| **Starship-Stack** (SpaceX-Style: Super Heavy + Starship + Mechazilla-Turm) | "a 21-year spaceship" — Legende | `starship-stack.glb` | `starship-stack.growth.json` | 663 |
| **Leviathan** (modulares Kapitalschiff, 36 Module) | erstes Konzept: 21-Jahres-Bauphasen | `leviathan.glb` | `leviathan.growth.json` | 36 |

Begleitcode: `loadGrowable.ts` (framework-agnostisch) und `GrowableObject.tsx` (react-three-fiber).
2D-Vorschauen (Sprite-Thumbnails der Wuchsstufen) liegen in `previews/`.

## Entstehungsweg (Pipeline)

1. **Prozedurale Erzeugung in Blender** via Python — keine Drittanbieter-Assets. Jedes Bauteil ist
   ein eigenes Objekt mit Position, Material und einem zugewiesenen Wachstums-Zeitpunkt `t0`.
   - Baum: rekursive Verzweigung (Stamm -> Aeste -> Zweige -> Blaetter), danach Bluete und Apfel je
     Zweigspitze. Deterministischer Zufall (LCG, Seed 20260623) — identisch reproduzierbar.
   - Starship: parametrischer Stack (Ringe, 33 Raptor-Triebwerke im echten 3+10+20-Muster, Gridfins,
     Hitzekacheln, Nosecone, Flaps) plus Mechazilla-Turm und offener Starttisch.
   - Leviathan: 36 benannte Module ueber 21 Baujahre.
2. **Export** als `.glb` (Y-up, Draco-faehig) ueber den Blender-glTF-Exporter, dazu ein
   `.growth.json` mit dem Wachstums-Zeitplan pro Node.
3. **Laufzeit** im Client: `loadGrowable()` laedt beides, merkt sich die Basis-Skalierung je Node
   aus dem glTF und skaliert die Teile gemaess `progress` ein.

Die interaktiven Web-Vorschauen (Three.js-Widgets) nutzen exakt dieselbe Logik und denselben Seed,
d. h. Vorschau und Spiel-Asset sehen gleich aus.

## Wachstums-Datenmodell (`*.growth.json`)

```jsonc
{
  "asset": "apple-tree",
  "totalParts": 947,
  "phases": [ { "name": "Bluetezeit", "range": [0.62, 0.80] }, ... ],
  "nodes": [
    { "node": "AT_0006_branch",  "t0": 0.11, "win": 0.10, "group": "branch" },
    { "node": "AT_0420_blossom", "t0": 0.64, "win": 0.05, "group": "blossom",
      "fadeStart": 0.80, "fadeWin": 0.07 }
  ]
}
```

- `node` = glTF-Node-Name (= Blender-Objektname).
- `t0` / `win` = Start und Dauer des Einwachsens.
- `group` = Kategorie (zum Clustern/Instancing).
- `fadeStart`/`fadeWin` (optional) = Teil schrumpft wieder auf 0 (Apfelblueten).
- `year` (nur Leviathan) = [Baubeginn, Fertig] in Jahren (0..21).

**Formel je Node** (siehe `loadGrowable.ts`):
```
s = clamp((progress - t0) / win, 0, 1)
f = smoothstep(s)
if fadeStart: f *= 1 - smoothstep(clamp((progress - fadeStart) / fadeWin, 0, 1))
node.scale = baseScale * f ;  node.visible = f > 0.004
```

## Nutzung

```ts
import { loadGrowable } from "./loadGrowable";

const tree = await loadGrowable("/assets/apple-tree.glb", "/assets/apple-tree.growth.json");
scene.add(tree.root);
// progress aus Timelock-Reife: vergangene Zeit / Laufzeit
tree.setGrowth(0.73);
hud.textContent = tree.phaseAt(0.73); // -> "Bluetezeit"
```

react-three-fiber: `<GrowableObject glbUrl=... manifestUrl=... progress={p} />`.

## Hinweise

- **Mobile 30 FPS (hartes Budget):** Diese GLBs bestehen aus vielen kleinen Meshes (PoC-Qualitaet).
  Fuer Produktion gleichartige Teile per `group` zu `InstancedMesh` clustern und LOD ergaenzen
  (z. B. Hitzekacheln, Blaetter, Raptors, Ringe). Das Wachstum wird dann ueber Instanz-Matrizen
  statt Einzel-Nodes gefahren.
- **Provenance/Lizenz:** Vollstaendig prozedural/original. Keine Twinmotion-/SpeedTree-/Fremd-Assets.
  Frei im Projekt verwendbar.
- **Status:** PoC-Assets fuer den v1-Slice. Geometrie ist bewusst einfach gehalten und
  datengetrieben erweiterbar.
