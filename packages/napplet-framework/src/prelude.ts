/**
 * The prelude installed into every napplet iframe.
 *
 * This runs *inside* the sandbox, ahead of the napplet's own scripts, and is the
 * only thing that can reach the shell. It is a self-contained source string
 * because the iframe has an opaque origin: nothing can be imported into it, and
 * the parent cannot reach in to patch it afterwards.
 *
 * It installs `window.palace`. It deliberately does not install `window.nostr`,
 * `fetch`, or any storage shim — a napplet that wants bytes or a signature asks
 * the shell, and the shell decides.
 */

/** Source of the in-iframe `window.palace` bridge. */
export const PRELUDE_SOURCE = String.raw`
(function () {
  "use strict";
  var pending = new Map();
  var subscribers = new Map();
  var seq = 0;
  var nextId = function () { seq += 1; return "p" + seq; };

  var request = function (message) {
    var id = nextId();
    return new Promise(function (resolve, reject) {
      pending.set(id, { resolve: resolve, reject: reject });
      var payload = Object.assign({ id: id }, message);
      window.parent.postMessage(payload, "*");
    });
  };

  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;

    if (msg.type === "palace.snapshot") {
      var handlers = subscribers.get(msg.domain) || [];
      for (var i = 0; i < handlers.length; i += 1) handlers[i](msg.snapshot);
      return;
    }
    if (msg.type === "palace.theme") {
      applyTheme(msg.theme);
      var themed = subscribers.get("theme") || [];
      for (var t = 0; t < themed.length; t += 1) themed[t](msg.theme);
      return;
    }
    if (typeof msg.id !== "string") return;
    var slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    if (msg.type === "palace.error") {
      var err = new Error(msg.reason || msg.error);
      err.code = msg.error;
      slot.reject(err);
      return;
    }
    slot.resolve(msg.result);
  });

  /*
   * Theme is applied to the whole surface, not just controls: a napplet that
   * paints only its widgets leaves a foreign-coloured canvas inside the Palace.
   */
  function applyTheme(theme) {
    if (!theme || !theme.colors) return;
    var c = theme.colors;
    var root = document.documentElement;
    root.style.setProperty("--palace-bg", c.background);
    root.style.setProperty("--palace-fg", c.text);
    root.style.setProperty("--palace-primary", c.primary);
    root.style.backgroundColor = c.background;
    root.style.color = c.text;
    if (document.body) {
      document.body.style.backgroundColor = c.background;
      document.body.style.color = c.text;
    }
  }

  var subscribe = function (domain, handler) {
    var list = subscribers.get(domain) || [];
    list.push(handler);
    subscribers.set(domain, list);
    if (domain !== "theme") {
      window.parent.postMessage(
        { type: "palace.subscribe", id: nextId(), domain: domain },
        "*"
      );
    }
    return {
      close: function () {
        var current = subscribers.get(domain) || [];
        subscribers.set(domain, current.filter(function (h) { return h !== handler; }));
      }
    };
  };

  window.palace = {
    /** Current snapshot of a domain. */
    get: function (domain) {
      return request({ type: "palace.get", domain: domain });
    },
    /** Snapshot now and on every change. */
    on: function (domain, handler) {
      window.palace.get(domain).then(handler).catch(function () { /* not granted */ });
      return subscribe(domain, handler);
    },
    /** Ask the shell to do something. Refusal resolves with ok:false. */
    intent: function (intent) {
      return request({ type: "palace.intent", intent: intent });
    },
    /** Follow the Palace palette. */
    onTheme: function (handler) {
      return subscribe("theme", handler);
    },
    /** Tell the shell how tall this napplet wants to be. */
    resize: function (height) {
      window.parent.postMessage(
        { type: "palace.resize", id: nextId(), height: Math.ceil(height) },
        "*"
      );
    }
  };

  window.addEventListener("error", function (event) {
    window.parent.postMessage(
      { type: "palace.crash", id: "boot", message: String(event.message) },
      "*"
    );
  });

  window.parent.postMessage({ type: "palace.ready", id: "boot" }, "*");
})();
`;
