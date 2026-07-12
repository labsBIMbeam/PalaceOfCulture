// Local-only defaults keep the documented two-process dev flow usable while production remains
// deny-by-default. Explicit environment values always win.
process.env.NODE_ENV ||= "development";
process.env.MULTIPLAYER_ORIGINS ||= "http://localhost:5173,http://127.0.0.1:5173";

await import("./index.js");
