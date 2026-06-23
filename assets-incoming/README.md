# assets-incoming — wachsende Objekte (Blender → glTF)

Prozedural in Blender erzeugte Assets fuer "600 Billion". Folgt der Invariante
**"Art is static, state is data"**: Die `.glb` enthaelt nur die *statische* Geometrie
(Vollwuchs). Das Wachstum ist **Daten** in `<asset>.growth.json` und wird zur Laufzeit
ueber einen Fortschritt `progress` (0..1) gefahren — nichts ist ins Modell gebacken.

## Dateien
| Asset | Geometrie | Daten | Teile |
|---|---|---|---|
| Apfelbaum (im Topf) | `apple-tree.glb` | `apple-tree.growth.json` | 947 |
| Starship-Stack (SpaceX-Style) | `starship-stack.glb` | `starship-stack.growth.json` | 663 |
| Leviathan (36-Modul Konzeptschiff) | `leviathan.glb` | `leviathan.growth.json` | 36 |

Koordinaten: glTF **Y-up** (Standard fuer three.js). GLB = Draco-faehig, eine Datei.

## growth.json — Schema
```jsonc
{
  "asset": "apple-tree",
  "totalParts": 947,
  "growthModel": "siehe Formel unten",
  "phases": [ { "name": "...", "range": [0.0, 0.14] }, ... ],
  "nodes": [
    { "node": "AT_0006_branch", "t0": 0.11, "win": 0.10, "group": "branch" },
    { "node": "AT_0420_blossom", "t0": 0.64, "win": 0.05, "group": "blossom",
      "fadeStart": 0.80, "fadeWin": 0.07 }   // Blueten erscheinen und fallen wieder ab
  ]
}
```
- `node`  : Name des glTF-Node (entspricht 1:1 dem Objektnamen im GLB).
- `t0`    : Fortschritt, bei dem das Teil zu wachsen beginnt.
- `win`   : Wachstumsfenster (Dauer bis voll).
- `group` : Kategorie (branch/leaf/blossom/apple/stem/pot bzw. tower/booster/raptor/tile/...).
- `fadeStart`/`fadeWin` (optional): Teil schrumpft wieder auf 0 (z. B. Apfelblueten).

## Client-Wachstumsformel (three.js / r3f)
Beim Laden je Node die Basis-Skalierung merken, dann pro Frame:
```ts
const smooth = (s:number)=> s*s*(3-2*s);
function applyGrowth(node:Object3D, m:NodeMeta, base:Vector3, progress:number){
  let s = THREE.MathUtils.clamp((progress - m.t0) / m.win, 0, 1);
  let f = smooth(s);
  if (m.fadeStart != null) {
    const fd = THREE.MathUtils.clamp((progress - m.fadeStart) / m.fadeWin, 0, 1);
    f *= (1 - smooth(fd));
  }
  node.scale.copy(base).multiplyScalar(f);
  node.visible = f > 0.004;
}
```
`progress` ist die Daten-Groesse (z. B. abgeleitet aus der Timelock-Reife: vergangene Zeit / Laufzeit).

## Hinweise
- **Mobile 30 FPS:** Diese GLBs haben viele kleine Meshes (PoC). Fuer Produktion ueber
  `InstancedMesh`/LOD clustern (z. B. Hitzekacheln, Blaetter, Raptors als Instanzen),
  Geometrie ist absichtlich gruppierbar (gleiche `group`).
- **Lizenz:** Vollstaendig prozedural/original erzeugt — keine Drittanbieter-Assets,
  keine Twinmotion/SpeedTree-Inhalte. Frei verwendbar im Projekt.
- Quelle der Wachstumslogik ist identisch zu den interaktiven Web-Vorschauen (gleicher
  deterministischer Seed beim Baum).
