import { Fetcher } from "./mse/fetcher.js";

const mime = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';
const url = "http://localhost:8000/videos/1.mp4";

function isSupported() {
  if (!window.MediaSource) return false;
  return MediaSource.isTypeSupported && MediaSource.isTypeSupported(mime);
}

const vElem = (() => {
  let v = null;

  return () => {
    if (v) return v;
    v = document.querySelector("video");
    return v;
  };
})();

function handleSourceOpen(e) {
  URL.revokeObjectURL(vElem().src);
  const ms = e.target;
  const sb = ms.addSourceBuffer(mime);
  new Fetcher({ ms, sb, url }).load();
}

function attachMediaSource() {
  const ms = new MediaSource();
  ms.addEventListener("sourceopen", handleSourceOpen);
  vElem().src = URL.createObjectURL(ms);
}

function bootstrap() {
  if (!isSupported()) throw new Error("Unable to apply MSE&MP4 on video");

  attachMediaSource();
}

document.addEventListener("DOMContentLoaded", bootstrap);
