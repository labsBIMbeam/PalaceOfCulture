/*
 * Palace napplet runtime — host side.
 *
 * Runs in the Godot web-export page, above the canvas. Loads a pinned napplet
 * into an `iframe sandbox="allow-scripts"` with no `allow-same-origin`, so the
 * napplet gets an opaque origin and no ambient browser authority: it cannot
 * fetch, cannot open a socket, cannot reach storage, and cannot see the signer.
 * Everything privileged happens here and is proxied over postMessage (NIP-5D).
 *
 * Authority split:
 *   napplet  → asks, renders, holds nothing
 *   host     → relays, bytes, scoped storage, policy, theme
 *   NIP-07   → the key. Every signature goes to window.nostr; this file never
 *              sees, stores or derives a private key.
 *
 * Godot talks to `window.PalaceNapplet` (see scripts/net/napplet_runtime.gd).
 */
(() => {
  const STORAGE_PREFIX = "palace.napplet.";
  const STORAGE_QUOTA_BYTES = 512 * 1024;
  const RELAY_TIMEOUT_MS = 6000;
  const RESOURCE_TIMEOUT_MS = 12000;
  const RESOURCE_MAX_BYTES = 8 * 1024 * 1024;

  /* ---------------------------------------------------------------- prelude */

  /*
   * Injected into the iframe ahead of the napplet's own scripts. This is the
   * `window.napplet` the napplet consumes: the object shape comes from
   * @napplet/core's NappletGlobal, the transport below it is ours.
   *
   * Follow-up before third-party napplets are allowed in: swap this for the
   * published @napplet/shim and re-run @napplet/conformance against the pair,
   * so any napplet behaves here exactly as it does in other runtimes.
   */
  const PRELUDE = [
    "(function () {",
    "  var pending = new Map();",
    "  var subs = new Map();",
    "  var seq = 0;",
    "  var nextId = function () { seq += 1; return 'n' + seq; };",
    "  var send = function (type, payload) {",
    "    var id = nextId();",
    "    var message = Object.assign({ type: type, id: id }, payload || {});",
    "    return new Promise(function (resolve, reject) {",
    "      pending.set(id, { resolve: resolve, reject: reject });",
    "      window.parent.postMessage(message, '*');",
    "    });",
    "  };",
    "  window.addEventListener('message', function (event) {",
    "    var msg = event.data;",
    "    if (!msg || typeof msg !== 'object' || typeof msg.id !== 'string') return;",
    "    if (msg.type === 'nap.stream') {",
    "      var handlers = subs.get(msg.id);",
    "      if (handlers && handlers[msg.event]) handlers[msg.event](msg.payload);",
    "      return;",
    "    }",
    "    var slot = pending.get(msg.id);",
    "    if (!slot) return;",
    "    pending.delete(msg.id);",
    "    if (msg.error) {",
    "      var err = new Error(msg.message || msg.error);",
    "      err.code = msg.error;",
    "      slot.reject(err);",
    "      return;",
    "    }",
    "    slot.resolve(msg.result);",
    "  });",
    "  var stream = function (type, payload) {",
    "    var id = nextId();",
    "    var handlers = {};",
    "    subs.set(id, handlers);",
    "    window.parent.postMessage(Object.assign({ type: type, id: id }, payload || {}), '*');",
    "    return {",
    "      on: function (name, cb) { handlers[name] = cb; },",
    "      close: function () {",
    "        subs.delete(id);",
    "        window.parent.postMessage({ type: 'outbox.close', id: id }, '*');",
    "      }",
    "    };",
    "  };",
    "  var listeners = { theme: [], identity: [] };",
    "  window.addEventListener('message', function (event) {",
    "    var msg = event.data;",
    "    if (!msg || msg.type !== 'nap.push') return;",
    "    (listeners[msg.channel] || []).forEach(function (cb) { cb(msg.payload); });",
    "  });",
    "  var subscribeTo = function (channel, cb) {",
    "    listeners[channel].push(cb);",
    "    return { close: function () {",
    "      listeners[channel] = listeners[channel].filter(function (f) { return f !== cb; });",
    "    } };",
    "  };",
    "  window.napplet = {",
    "    identity: {",
    "      getPublicKey: function () { return send('identity.getPublicKey'); },",
    "      onChanged: function (cb) { return subscribeTo('identity', cb); },",
    "      getProfile: function () { return send('identity.getProfile'); },",
    "      getRelays: function () { return send('identity.getRelays'); }",
    "    },",
    "    outbox: {",
    "      query: function (filters, options) {",
    "        return send('outbox.query', { filters: filters, options: options || {} });",
    "      },",
    "      getEvent: function (eventId, options) {",
    "        return send('outbox.getEvent', { eventId: eventId, options: options || {} });",
    "      },",
    "      publish: function (template, options) {",
    "        return send('outbox.publish', { template: template, options: options || {} });",
    "      },",
    "      subscribe: function (filters, options) {",
    "        return stream('outbox.subscribe', { filters: filters, options: options || {} });",
    "      }",
    "    },",
    "    storage: {",
    "      getItem: function (k) { return send('storage.getItem', { key: k }); },",
    "      setItem: function (k, v) { return send('storage.setItem', { key: k, value: v }); },",
    "      removeItem: function (k) { return send('storage.removeItem', { key: k }); },",
    "      keys: function () { return send('storage.keys'); }",
    "    },",
    "    resource: {",
    "      bytes: function (url) {",
    "        return send('resource.bytes', { url: url }).then(function (r) {",
    "          return new Blob([r.bytes], { type: r.mime || 'application/octet-stream' });",
    "        });",
    "      },",
    "      bytesAsObjectURL: function (url) {",
    "        var handle = { url: '', revoke: function () {} };",
    "        var objectUrl = null;",
    "        var revoked = false;",
    "        var ready = window.napplet.resource.bytes(url).then(function (blob) {",
    "          if (revoked) return;",
    "          objectUrl = URL.createObjectURL(blob);",
    "          handle.url = objectUrl;",
    "          return objectUrl;",
    "        });",
    "        handle.revoke = function () {",
    "          if (revoked) return;",
    "          revoked = true;",
    "          if (objectUrl) URL.revokeObjectURL(objectUrl);",
    "        };",
    "        Object.defineProperty(handle, 'ready', { value: ready, enumerable: false });",
    "        return handle;",
    "      }",
    "    },",
    "    link: { open: function (url, o) { return send('link.open', { url: url, options: o || {} }); } },",
    "    theme: {",
    "      get: function () { return send('theme.get'); },",
    "      onChanged: function (cb) { return subscribeTo('theme', cb); }",
    "    },",
    "    count: { query: function (f, o) { return send('count.query', { filters: f, options: o || {} }); } },",
    "    common: {",
    "      getProfile: function (t) { return send('common.getProfile', { target: t }); },",
    "      encodeNip19: function (i) { return send('common.encodeNip19', { input: i }); },",
    "      decodeNip19: function (v) { return send('common.decodeNip19', { value: v }); },",
    "      follows: function () { return send('common.follows'); },",
    "      react: function (id, r) { return send('common.react', { targetEventId: id, reaction: r }); }",
    "    }",
    "  };",
    "  window.parent.postMessage({ type: 'nap.ready', id: 'boot' }, '*');",
    "  window.addEventListener('error', function (e) {",
    "    window.parent.postMessage({",
    "      type: 'nap.error', id: 'boot',",
    "      message: String((e.error && e.error.message) || e.message)",
    "    }, '*');",
    "  });",
    "})();",
  ].join("\n");

  /* ------------------------------------------------------------------ relays */

  /* Minimal NIP-01 client. One socket per relay, shared across subscriptions. */
  function RelayPool() {
    this.sockets = new Map();
    this.subs = new Map();
  }

  RelayPool.prototype.socket = function (url) {
    const existing = this.sockets.get(url);
    if (existing && existing.readyState <= 1) return existing;
    const ws = new WebSocket(url);
    ws.addEventListener("message", (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch (err) {
        return;
      }
      const kind = frame[0];
      const subId = frame[1];
      const sub = this.subs.get(subId);
      if (!sub) return;
      if (kind === "EVENT") sub.onEvent(frame[2], url);
      else if (kind === "EOSE") sub.onEose(url);
      else if (kind === "CLOSED") sub.onClosed(url, frame[2]);
    });
    ws.addEventListener("close", () => {
      this.sockets.delete(url);
    });
    this.sockets.set(url, ws);
    return ws;
  };

  RelayPool.prototype.send = function (url, frame) {
    const ws = this.socket(url);
    const payload = JSON.stringify(frame);
    if (ws.readyState === 1) {
      ws.send(payload);
      return;
    }
    ws.addEventListener(
      "open",
      () => {
        ws.send(payload);
      },
      { once: true },
    );
  };

  /* One-shot query: collect until EOSE from every relay, or the timeout. */
  RelayPool.prototype.query = function (relays, filters, timeoutMs) {
    const subId = `q${Math.floor(performance.now() * 1000).toString(36)}${this.subs.size}`;
    const seen = new Map();
    const pendingRelays = new Set(relays);
    return new Promise((resolve) => {
      let done = false;
      const finish = (incomplete) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.subs.delete(subId);
        relays.forEach((url) => {
          try {
            this.send(url, ["CLOSE", subId]);
          } catch (err) {
            /* socket already gone */
          }
        });
        resolve({ events: Array.from(seen.values()), incomplete: incomplete });
      };
      const timer = setTimeout(() => {
        finish(true);
      }, timeoutMs || RELAY_TIMEOUT_MS);
      this.subs.set(subId, {
        onEvent: (event, url) => {
          if (seen.has(event.id)) return;
          seen.set(event.id, { event: event, sidecar: { relayHints: [url] } });
        },
        onEose: (url) => {
          pendingRelays.delete(url);
          if (pendingRelays.size === 0) finish(false);
        },
        onClosed: (url) => {
          pendingRelays.delete(url);
          if (pendingRelays.size === 0) finish(false);
        },
      });
      const frame = ["REQ", subId].concat(Array.isArray(filters) ? filters : [filters]);
      relays.forEach((url) => {
        this.send(url, frame);
      });
    });
  };

  /* Live subscription. Returns a close handle; events stream through onEvent. */
  RelayPool.prototype.subscribe = function (relays, filters, onEvent) {
    const subId = `s${Math.floor(performance.now() * 1000).toString(36)}${this.subs.size}`;
    const seen = new Set();
    this.subs.set(subId, {
      onEvent: (event, url) => {
        if (seen.has(event.id)) return;
        seen.add(event.id);
        onEvent({ event: event, sidecar: { relayHints: [url] } });
      },
      onEose: () => {},
      onClosed: () => {},
    });
    const frame = ["REQ", subId].concat(Array.isArray(filters) ? filters : [filters]);
    relays.forEach((url) => {
      this.send(url, frame);
    });
    return () => {
      this.subs.delete(subId);
      relays.forEach((url) => {
        try {
          this.send(url, ["CLOSE", subId]);
        } catch (err) {
          /* socket already gone */
        }
      });
    };
  };

  RelayPool.prototype.publish = function (relays, event) {
    const results = {};
    relays.forEach((url) => {
      try {
        this.send(url, ["EVENT", event]);
        results[url] = true;
      } catch (err) {
        results[url] = false;
      }
    });
    return results;
  };

  RelayPool.prototype.closeAll = function () {
    this.subs.clear();
    this.sockets.forEach((ws) => {
      try {
        ws.close();
      } catch (err) {
        /* already closing */
      }
    });
    this.sockets.clear();
  };

  /* ------------------------------------------------------------------ signer */

  /*
   * NIP-07 bridge. The extension holds the key and prompts the user; the host
   * only ever hands it a template and receives a signed event back.
   */
  const Signer = {
    available: () => typeof window.nostr === "object" && window.nostr !== null,
    getPublicKey: () => {
      if (!Signer.available()) return Promise.resolve("");
      return Promise.resolve(window.nostr.getPublicKey()).catch(() => "");
    },
    getRelays: () => {
      if (!Signer.available() || typeof window.nostr.getRelays !== "function") {
        return Promise.resolve({});
      }
      return Promise.resolve(window.nostr.getRelays()).catch(() => ({}));
    },
    sign: (template) => {
      if (!Signer.available()) return Promise.reject(new Error("no-signer"));
      return Promise.resolve(window.nostr.signEvent(template));
    },
  };

  /* ------------------------------------------------------------------- host */

  function Host() {
    this.frame = null;
    this.entry = null;
    this.pool = new RelayPool();
    this.streams = new Map();
    this.status = { state: "idle", napplet: "", error: "" };
    this.theme = null;
    this.statusListeners = [];
    this.onMessage = this.handle.bind(this);
  }

  Host.prototype.setStatus = function (state, error) {
    this.status = {
      state: state,
      napplet: this.entry ? this.entry.id : "",
      error: error || "",
    };
    const snapshot = this.status;
    this.statusListeners.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        /* listener owns its failures */
      }
    });
  };

  Host.prototype.onStatus = function (cb) {
    this.statusListeners.push(cb);
  };

  function toHex(buffer) {
    return Array.prototype.map
      .call(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /*
   * Load a pinned napplet. `entry` comes from the Godot-side allowlist and must
   * carry an expected sha256 of the artifact; a mismatch refuses to mount.
   */
  Host.prototype.mount = function (entry, rect) {
    this.unmount();
    this.entry = entry;
    this.setStatus("loading");

    return fetch(entry.artifactUrl, { credentials: "omit", redirect: "error" })
      .then((response) => {
        if (!response.ok) throw new Error(`artifact ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) =>
        crypto.subtle.digest("SHA-256", buffer).then((digest) => {
          const actual = toHex(digest);
          if (entry.sha256 && entry.sha256 !== actual) {
            throw new Error(`artifact hash mismatch: expected ${entry.sha256}, got ${actual}`);
          }
          return new TextDecoder().decode(buffer);
        }),
      )
      .then((html) => {
        const prelude = `<script>${PRELUDE}</script>`;
        const injected = /<head(\s[^>]*)?>/i.test(html)
          ? html.replace(/<head(\s[^>]*)?>/i, (m) => m + prelude)
          : prelude + html;

        const frame = document.createElement("iframe");
        frame.setAttribute("sandbox", "allow-scripts");
        frame.setAttribute("title", entry.title || entry.id);
        frame.style.position = "fixed";
        frame.style.border = "0";
        frame.style.zIndex = "40";
        frame.style.background = "transparent";
        frame.srcdoc = injected;
        document.body.appendChild(frame);
        this.frame = frame;
        this.applyRect(rect);
        window.addEventListener("message", this.onMessage);
        this.setStatus("running");
        return true;
      })
      .catch((err) => {
        this.setStatus("error", String(err?.message ? err.message : err));
        return false;
      });
  };

  Host.prototype.applyRect = function (rect) {
    if (!this.frame || !rect) return;
    this.frame.style.left = `${rect.x}px`;
    this.frame.style.top = `${rect.y}px`;
    this.frame.style.width = `${rect.width}px`;
    this.frame.style.height = `${rect.height}px`;
  };

  Host.prototype.unmount = function () {
    if (this.frame) {
      window.removeEventListener("message", this.onMessage);
      this.frame.remove();
      this.frame = null;
    }
    this.streams.forEach((close) => {
      close();
    });
    this.streams.clear();
    this.pool.closeAll();
    this.entry = null;
    this.setStatus("idle");
  };

  Host.prototype.post = function (message) {
    if (!this.frame || !this.frame.contentWindow) return;
    this.frame.contentWindow.postMessage(message, "*");
  };

  Host.prototype.reply = function (id, result) {
    this.post({ type: "nap.result", id: id, result: result });
  };

  Host.prototype.fail = function (id, code, message) {
    this.post({ type: "nap.result", id: id, error: code, message: message || code });
  };

  Host.prototype.push = function (channel, payload) {
    this.post({ type: "nap.push", id: "push", channel: channel, payload: payload });
  };

  Host.prototype.setTheme = function (theme) {
    this.theme = theme;
    this.push("theme", theme);
  };

  Host.prototype.relaysFor = function (options) {
    const entry = this.entry || {};
    const hinted = options?.relays || [];
    const allowed = entry.relays || [];
    /* Napplet hints are candidates, not instructions: policy is the pinned list. */
    const merged = allowed.concat(
      hinted.filter((url) => allowed.indexOf(url) === -1 && entry.acceptRelayHints),
    );
    return merged.length ? merged : allowed;
  };

  Host.prototype.storageKey = function (key) {
    return `${STORAGE_PREFIX + (this.entry ? this.entry.id : "unknown")}.${key}`;
  };

  Host.prototype.handle = function (event) {
    if (!this.frame || event.source !== this.frame.contentWindow) return;
    const msg = event.data;
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;
    const id = msg.id;

    switch (msg.type) {
      case "nap.ready":
        if (this.theme) this.push("theme", this.theme);
        return;
      case "nap.error":
        this.setStatus("error", String(msg.message || "napplet threw during boot"));
        return;

      case "identity.getPublicKey":
        Signer.getPublicKey().then((pk) => {
          this.reply(id, pk);
        });
        return;
      case "identity.getRelays":
        Signer.getRelays().then((relays) => {
          this.reply(id, relays);
        });
        return;
      case "identity.getProfile":
        this.reply(id, null);
        return;

      case "outbox.query":
        this.pool
          .query(this.relaysFor(msg.options), msg.filters, msg.options?.timeoutMs)
          .then((result) => {
            this.reply(id, { events: result.events, incomplete: result.incomplete });
          })
          .catch((err) => {
            this.fail(id, "relay-error", String(err));
          });
        return;

      case "outbox.getEvent":
        this.pool
          .query(this.relaysFor(msg.options), [{ ids: [msg.eventId] }], RELAY_TIMEOUT_MS)
          .then((result) => {
            this.reply(id, { result: result.events[0] || null });
          })
          .catch((err) => {
            this.fail(id, "relay-error", String(err));
          });
        return;

      case "outbox.subscribe":
        try {
          const close = this.pool.subscribe(this.relaysFor(msg.options), msg.filters, (result) => {
            this.post({ type: "nap.stream", id: id, event: "event", payload: result });
          });
          this.streams.set(id, close);
        } catch (err) {
          this.post({ type: "nap.stream", id: id, event: "closed", payload: String(err) });
        }
        return;

      case "outbox.close": {
        const closer = this.streams.get(id);
        if (closer) {
          closer();
          this.streams.delete(id);
        }
        return;
      }

      case "outbox.publish":
        /*
         * The only path that touches a key, and it does not touch it here: the
         * template goes to the NIP-07 extension, which prompts the user and
         * returns a signed event. A napplet cannot publish silently.
         */
        if (!Signer.available()) {
          this.reply(id, { ok: false, error: "no-signer" });
          return;
        }
        Signer.sign(msg.template)
          .then((signed) => {
            const relays = this.relaysFor(msg.options);
            const results = this.pool.publish(relays, signed);
            this.reply(id, { ok: true, event: signed, eventId: signed.id, relays: results });
          })
          .catch((err) => {
            this.reply(id, { ok: false, error: String(err?.message ? err.message : err) });
          });
        return;

      case "storage.getItem":
        try {
          this.reply(id, localStorage.getItem(this.storageKey(msg.key)));
        } catch (err) {
          this.fail(id, "storage-error", String(err));
        }
        return;

      case "storage.setItem":
        try {
          const value = String(msg.value == null ? "" : msg.value);
          if (value.length > STORAGE_QUOTA_BYTES) {
            this.fail(id, "quota-exceeded", "value exceeds the 512 KB napplet quota");
            return;
          }
          localStorage.setItem(this.storageKey(msg.key), value);
          this.reply(id, null);
        } catch (err) {
          this.fail(id, "quota-exceeded", String(err));
        }
        return;

      case "storage.removeItem":
        localStorage.removeItem(this.storageKey(msg.key));
        this.reply(id, null);
        return;

      case "storage.keys": {
        const prefix = this.storageKey("");
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const full = localStorage.key(i);
          if (full && full.indexOf(prefix) === 0) keys.push(full.slice(prefix.length));
        }
        this.reply(id, keys);
        return;
      }

      case "resource.bytes":
        this.fetchBytes(msg.url)
          .then((payload) => {
            this.reply(id, payload);
          })
          .catch((err) => {
            this.fail(id, err.code || "network-error", String(err.message || err));
          });
        return;

      case "link.open":
        /* Never navigate the Palace itself; a napplet link always leaves in a new tab. */
        try {
          const opened = window.open(msg.url, "_blank", "noopener,noreferrer");
          this.reply(id, { status: opened ? "opened" : "denied" });
        } catch (err) {
          this.reply(id, { status: "denied" });
        }
        return;

      case "theme.get":
        this.reply(id, this.theme || null);
        return;

      case "count.query":
        /* No NIP-45 relay support assumed: refuse honestly instead of guessing. */
        this.reply(id, { ok: false, error: "unsupported", reason: "no COUNT relay configured" });
        return;

      case "common.getProfile":
        this.profile(msg.target)
          .then((result) => {
            this.reply(id, result);
          })
          .catch((err) => {
            this.fail(id, "relay-error", String(err));
          });
        return;

      case "common.encodeNip19":
      case "common.decodeNip19":
      case "common.follows":
      case "common.react":
        this.reply(id, { ok: false, error: "unsupported" });
        return;

      default:
        this.fail(id, "unsupported", `unknown domain action: ${msg.type}`);
    }
  };

  /* Fetch external bytes under host policy. The napplet never sees a URL fetch. */
  Host.prototype.fetchBytes = (url) => {
    let parsed;
    try {
      parsed = new URL(url, location.href);
    } catch (err) {
      return Promise.reject(Object.assign(new Error("bad url"), { code: "unsupported-scheme" }));
    }
    if (parsed.protocol === "data:") {
      return fetch(url)
        .then((r) => r.blob())
        .then((blob) =>
          blob.arrayBuffer().then((buf) => ({ bytes: new Uint8Array(buf), mime: blob.type })),
        );
    }
    if (parsed.protocol !== "https:") {
      return Promise.reject(
        Object.assign(new Error("scheme not allowed"), {
          code: "unsupported-scheme",
        }),
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, RESOURCE_TIMEOUT_MS);
    return fetch(parsed.href, {
      credentials: "omit",
      redirect: "follow",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timer);
        if (!response.ok) {
          throw Object.assign(new Error(`status ${response.status}`), {
            code: response.status === 404 ? "not-found" : "network-error",
          });
        }
        return response.blob();
      })
      .then((blob) => {
        if (blob.size > RESOURCE_MAX_BYTES) {
          throw Object.assign(new Error("too large"), { code: "too-large" });
        }
        return blob.arrayBuffer().then((buf) => {
          /*
           * Sniff rather than trust the upstream Content-Type, and hand back a
           * narrow allowlist so a napplet cannot be fed active content.
           */
          const bytes = new Uint8Array(buf);
          return { bytes: bytes, mime: sniffImageMime(bytes) };
        });
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err && err.name === "AbortError") {
          throw Object.assign(new Error("timeout"), { code: "timeout" });
        }
        throw err;
      });
  };

  function sniffImageMime(bytes) {
    if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
    if (bytes.length > 6 && bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
    if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
    return "application/octet-stream";
  }

  Host.prototype.profile = function (target) {
    if (typeof target !== "string" || !/^[0-9a-f]{64}$/.test(target)) {
      return Promise.resolve({ ok: false, pubkey: String(target), error: "unsupported-target" });
    }
    return this.pool
      .query(this.relaysFor({}), [{ kinds: [0], authors: [target], limit: 1 }], RELAY_TIMEOUT_MS)
      .then((result) => {
        const entry = result.events[0];
        if (!entry) return { ok: false, pubkey: target, error: "not-found" };
        let parsed = {};
        try {
          parsed = JSON.parse(entry.event.content);
        } catch (err) {
          parsed = {};
        }
        return {
          ok: true,
          pubkey: target,
          profile: {
            name: parsed.name,
            displayName: parsed.display_name || parsed.displayName,
            about: parsed.about,
            picture: parsed.picture,
            nip05: parsed.nip05,
            lud16: parsed.lud16,
          },
          result: entry,
        };
      });
  };

  /* --------------------------------------------------------- Godot-facing API */

  const host = new Host();

  window.PalaceNapplet = {
    /* True when this page can host a napplet at all (web export, not headless). */
    supported: () => typeof window.WebSocket === "function" && typeof crypto.subtle === "object",
    signerAvailable: () => Signer.available(),
    mount: (entryJson, rectJson) => {
      const entry = JSON.parse(entryJson);
      const rect = JSON.parse(rectJson);
      host.mount(entry, rect);
      return true;
    },
    setRect: (rectJson) => {
      host.applyRect(JSON.parse(rectJson));
      return true;
    },
    setTheme: (themeJson) => {
      host.setTheme(JSON.parse(themeJson));
      return true;
    },
    unmount: () => {
      host.unmount();
      return true;
    },
    /* Godot polls this each frame while the panel is open — no callback plumbing. */
    status: () => JSON.stringify(host.status),
  };
})();
