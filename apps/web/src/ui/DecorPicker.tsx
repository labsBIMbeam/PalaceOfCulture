// The decorate-mode UI (DOM overlay): pick an object from the catalog, then click the floor to place
// it. Selecting a placed piece reveals its controls — rotate, resize, set the image/video for a
// frame/screen, or remove it. Pure presentation; all state lives in PalaceScene + decorStore.

import { useEffect, useState } from "react";
import { Icon } from "../frontend/icons";
import type { PlacedItem } from "../scene/decorStore";
import type { DecorDef } from "../scene/furnitureCatalog";

type Selected = { item: PlacedItem; def: DecorDef } | null;

export function DecorPicker({
  catalog,
  pendingDefId,
  selected,
  count,
  limit,
  onPick,
  onPlace,
  onRotatePending,
  onClearPending,
  onRotate,
  onScale,
  onSetMedia,
  onDelete,
  onDeselect,
}: {
  catalog: DecorDef[];
  pendingDefId: string | null;
  selected: Selected;
  count: number;
  /** Anti-spam cap (public palace): picking/placing locks when count reaches it. */
  limit?: number;
  onPick: (defId: string) => void;
  onPlace: () => void;
  onRotatePending: (deltaRad: number) => void;
  onClearPending: () => void;
  onRotate: (deltaRad: number) => void;
  onScale: (factor: number) => void;
  onSetMedia: (url: string) => void;
  onDelete: () => void;
  onDeselect: () => void;
}) {
  const [mediaDraft, setMediaDraft] = useState("");
  const selectedUid = selected?.item.uid;
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-sync only when the selected item changes — depending on `selected` (a fresh object each render) would wipe what the user is typing
  useEffect(() => {
    if (selected) setMediaDraft(selected.item.mediaUrl ?? selected.def.defaultMedia ?? "");
  }, [selectedUid]);

  const full = limit !== undefined && count >= limit;
  const pending = pendingDefId ? catalog.find((def) => def.id === pendingDefId) : undefined;
  const hasMedia = selected?.def.kind === "frame" || selected?.def.kind === "screen";

  return (
    <section className="decor-panel">
      <header className="decor-head">
        <Icon name="brush" size={16} />
        <span>Decorate</span>
        <small>{limit !== undefined ? `${count} / ${limit} placed` : `${count} placed`}</small>
      </header>

      <div className="decor-grid">
        {catalog.map((def) => (
          <button
            className={`decor-tile${pendingDefId === def.id ? " decor-tile--active" : ""}`}
            disabled={full}
            key={def.id}
            onClick={() => onPick(def.id)}
            type="button"
          >
            <span className="decor-glyph">{def.glyph}</span>
            <span className="decor-label">{def.label}</span>
          </button>
        ))}
      </div>

      {full && !selected ? (
        <p className="decor-hint decor-hint--limit">
          Palace limit reached — absorb one of your pieces to place another. The cap keeps the
          shared plaza generous for everyone.
        </p>
      ) : null}
      {pending ? (
        <div className="decor-controls">
          <p className="decor-hint">
            Placing <strong>{pending.label}</strong> — aim, rotate with Q / E, then Place.
          </p>
          <div className="decor-row">
            <button
              className="decor-btn"
              onClick={() => onRotatePending(-Math.PI / 4)}
              type="button"
            >
              ⟲ Turn
            </button>
            <button
              className="decor-btn"
              onClick={() => onRotatePending(Math.PI / 4)}
              type="button"
            >
              Turn ⟳
            </button>
          </div>
          <div className="decor-row">
            <button className="decor-btn decor-btn--place" onClick={onPlace} type="button">
              Place (F)
            </button>
            <button className="decor-btn" onClick={onClearPending} type="button">
              Done
            </button>
          </div>
        </div>
      ) : (
        <p className="decor-hint decor-hint--idle">
          Pick a piece, walk up and aim, then Place (F). Click a placed piece to edit it.
        </p>
      )}

      {selected ? (
        <div className="decor-controls">
          <div className="decor-controls-title">
            <span>{selected.def.label}</span>
            <button className="decor-mini" onClick={onDeselect} type="button">
              Deselect
            </button>
          </div>
          <div className="decor-row">
            <button className="decor-btn" onClick={() => onRotate(-Math.PI / 12)} type="button">
              ⟲ Rotate
            </button>
            <button className="decor-btn" onClick={() => onRotate(Math.PI / 12)} type="button">
              Rotate ⟳
            </button>
            <button className="decor-btn" onClick={() => onScale(1 / 1.15)} type="button">
              − Smaller
            </button>
            <button className="decor-btn" onClick={() => onScale(1.15)} type="button">
              Bigger +
            </button>
          </div>
          {hasMedia ? (
            <div className="decor-media">
              <input
                className="decor-input"
                onChange={(event) => setMediaDraft(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") onSetMedia(mediaDraft.trim());
                }}
                placeholder={selected.def.kind === "frame" ? "image URL…" : "video URL (mp4/webm)…"}
                value={mediaDraft}
              />
              <button
                className="decor-mini"
                onClick={() => onSetMedia(mediaDraft.trim())}
                type="button"
              >
                Set
              </button>
            </div>
          ) : null}
          <button className="decor-btn decor-btn--danger" onClick={onDelete} type="button">
            Remove
          </button>
        </div>
      ) : null}
    </section>
  );
}
