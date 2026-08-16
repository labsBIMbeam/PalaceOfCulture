// The napplet-side runtime injected into the sandboxed iframe — the web twin of the PRELUDE in
// godot/web/napplet-host.js (same `nap.*` wire contract: request/response by "n<seq>" id,
// `nap.stream` events, `nap.push` channels, `nap.ready`/`nap.error` boot signals), extended
// with the web-only `zap` domain. Keep the two in lockstep when the protocol grows; napplets
// guard every domain with presence checks, so a domain existing on only one host degrades
// gracefully on the other.

export const WEB_NAPPLET_PRELUDE = `(function () {
  var pending = new Map();
  var subs = new Map();
  var seq = 0;
  var nextId = function () { seq += 1; return 'n' + seq; };
  var send = function (type, payload) {
    var id = nextId();
    var message = Object.assign({ type: type, id: id }, payload || {});
    return new Promise(function (resolve, reject) {
      pending.set(id, { resolve: resolve, reject: reject });
      window.parent.postMessage(message, '*');
    });
  };
  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || typeof msg !== 'object' || typeof msg.id !== 'string') return;
    if (msg.type === 'nap.stream') {
      var handlers = subs.get(msg.id);
      if (handlers && handlers[msg.event]) handlers[msg.event](msg.payload);
      return;
    }
    var slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    if (msg.error) {
      var err = new Error(msg.message || msg.error);
      err.code = msg.error;
      slot.reject(err);
      return;
    }
    slot.resolve(msg.result);
  });
  var stream = function (type, payload) {
    var id = nextId();
    var handlers = {};
    subs.set(id, handlers);
    window.parent.postMessage(Object.assign({ type: type, id: id }, payload || {}), '*');
    return {
      on: function (name, cb) { handlers[name] = cb; },
      close: function () {
        subs.delete(id);
        window.parent.postMessage({ type: 'outbox.close', id: id }, '*');
      }
    };
  };
  var listeners = { theme: [], identity: [] };
  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || msg.type !== 'nap.push') return;
    (listeners[msg.channel] || []).forEach(function (cb) { cb(msg.payload); });
  });
  var subscribeTo = function (channel, cb) {
    listeners[channel].push(cb);
    return { close: function () {
      listeners[channel] = listeners[channel].filter(function (f) { return f !== cb; });
    } };
  };
  window.napplet = {
    identity: {
      getPublicKey: function () { return send('identity.getPublicKey'); },
      onChanged: function (cb) { return subscribeTo('identity', cb); },
      getProfile: function () { return send('identity.getProfile'); },
      getRelays: function () { return send('identity.getRelays'); }
    },
    link: { open: function (url, o) { return send('link.open', { url: url, options: o || {} }); } },
    theme: {
      get: function () { return send('theme.get'); },
      onChanged: function (cb) { return subscribeTo('theme', cb); }
    },
    zap: {
      probe: function () { return send('zap.probe'); },
      send: function (options) { return send('zap.send', { options: options || {} }); }
    }
  };
  window.parent.postMessage({ type: 'nap.ready', id: 'boot' }, '*');
  window.addEventListener('error', function (e) {
    window.parent.postMessage({
      type: 'nap.error', id: 'boot',
      message: String((e.error && e.error.message) || e.message)
    }, '*');
  });
})();`;

/** Inject the prelude as the FIRST script so `window.napplet` exists before app code runs. */
export function injectPrelude(artifactHtml: string, prelude: string = WEB_NAPPLET_PRELUDE): string {
  const script = `<script>${prelude}</script>`;
  const headMatch = artifactHtml.match(/<head[^>]*>/i);
  if (headMatch?.index !== undefined) {
    const cut = headMatch.index + headMatch[0].length;
    return artifactHtml.slice(0, cut) + script + artifactHtml.slice(cut);
  }
  return script + artifactHtml;
}
