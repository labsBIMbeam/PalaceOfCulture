import { useState } from "react";
import {
  CULTURE_DIRECTORY_LINKS,
  CULTURE_PROJECTS,
  type CultureCategory,
} from "../frontend/cultureProjects";
import { Icon } from "../frontend/icons";

const FILTERS: ReadonlyArray<{ id: "all" | CultureCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "audio", label: "Audio" },
  { id: "music", label: "Music" },
  { id: "live", label: "Live" },
  { id: "articles", label: "Articles" },
  { id: "v4v", label: "V4V" },
];

/** Filterable launchpad for the open apps connected to the Culture layer. */
export function CultureDirectory() {
  const [filter, setFilter] = useState<"all" | CultureCategory>("all");
  const visible = CULTURE_PROJECTS.filter(
    (project) => filter === "all" || project.category === filter,
  );

  return (
    <section className="culture-directory">
      <header className="culture-panel-head">
        <div>
          <small>Open ecosystem</small>
          <strong>Explore the culture layer</strong>
        </div>
        <span>{visible.length} projects</span>
      </header>
      <div className="culture-filters" role="tablist" aria-label="Culture project categories">
        {FILTERS.map((entry) => (
          <button
            aria-selected={filter === entry.id}
            className={
              filter === entry.id ? "culture-filter culture-filter--active" : "culture-filter"
            }
            key={entry.id}
            onClick={() => setFilter(entry.id)}
            role="tab"
            type="button"
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="culture-projects">
        {visible.map((project) => (
          <a
            className="culture-project"
            href={project.href}
            key={project.name}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className={`culture-project-icon culture-project-icon--${project.category}`}>
              <Icon name={project.icon} size={15} />
            </span>
            <span className="culture-project-copy">
              <strong>{project.name}</strong>
              <small>{project.description}</small>
            </span>
            <span className="culture-project-protocol">{project.protocol}</span>
          </a>
        ))}
      </div>
      <footer className="culture-directory-foot">
        <a
          href="https://github.com/aljazceru/awesome-nostr"
          rel="noopener noreferrer"
          target="_blank"
        >
          awesome-nostr
        </a>
        <a href="https://nostrapps.com/" rel="noopener noreferrer" target="_blank">
          nostrapps
        </a>
        <a href={CULTURE_DIRECTORY_LINKS.compass} rel="noopener noreferrer" target="_blank">
          nostrcompass
        </a>
      </footer>
    </section>
  );
}
