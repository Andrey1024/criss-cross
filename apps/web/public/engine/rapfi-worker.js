// Runs the Rapfi engine (GPL-3.0, https://github.com/dhbloo/rapfi) for the computer's Expert
// level. A plain classic worker, because the Emscripten build is loaded with importScripts.
// Messages in: { type: 'init', dir, script } then { type: 'command', data }.
// Messages out: status (download progress), ready, stdout, stderr, error.
let engine = null;

self.onmessage = (e) => {
  const { type, data, dir, script } = e.data;
  if (type === 'command') {
    engine?.sendCommand(data);
    return;
  }
  if (type !== 'init') return;
  try {
    self.importScripts(dir + script);
    self
      .Rapfi({
        // The data file (config and network) is served as rapfi.data.
        locateFile: (url) => dir + (/^rapfi.*\.data$/.test(url) ? 'rapfi.data' : url),
        onReceiveStdout: (line) => self.postMessage({ type: 'stdout', data: line }),
        onReceiveStderr: (line) => self.postMessage({ type: 'stderr', data: line }),
        onExit: () => {},
        setStatus: (status) => self.postMessage({ type: 'status', data: status }),
      })
      .then(
        (instance) => {
          engine = instance;
          self.postMessage({ type: 'ready' });
        },
        (err) => self.postMessage({ type: 'error', data: String(err) }),
      );
  } catch (err) {
    self.postMessage({ type: 'error', data: String(err) });
  }
};
