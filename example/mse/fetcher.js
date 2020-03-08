import { ReadWriteBuffer } from "./buffer.js";
import * as Decoder from "./box/decode.js";
import { go } from "./util.js";

const rRange = /(\d+)-(\d+)\/(\d+)/;

async function fetchRange({ from, to, url }) {
  const [resp, err] = await go(
    fetch(url, {
      headers: {
        Range: `bytes=${from}-${to}`
      }
    })
  );
  if (err) return [undefined, err];
  const [, begin, end, total] = resp.headers.get("Content-Range").match(rRange);
  const bytes = await resp.arrayBuffer();
  return [
    {
      begin: parseInt(begin, 10),
      end: parseInt(end, 10),
      total: parseInt(total, 10),
      bytes: new Uint8Array(bytes)
    },
    undefined
  ];
}

export class Fetcher {
  constructor({ ms, sb, url }) {
    this.ms = ms;
    this.sb = sb;
    this.url = url;
    this.buf = new ReadWriteBuffer();

    this.sb.addEventListener("updateend", () => {
      if (!this.sb.updating && ms.readyState === "open") ms.endOfStream();
    });

    this.size = 0;
    this.topBoxesSizeInfo = {};
  }

  async _indicateMoovMdat() {
    const times = 10;
    const buf = new ReadWriteBuffer();

    let from = 0;
    let to = 8;
    let i = times;

    let moov;
    let mdat;
    while (i) {
      const [{ begin, end, total, bytes }, err] = await fetchRange({
        from,
        to,
        url: this.url
      });
      if (err) return [undefined, err];

      buf.append(bytes);
      const box = new Decoder.Box(buf, true);

      this.size = total;
      const sizeInfo = { from: begin, to: begin + box.size, size: box.size };
      if (box.boxtype === "moov") {
        moov = sizeInfo;
      } else if (box.boxtype === "mdat") {
        mdat = sizeInfo;
      }

      this.topBoxesSizeInfo[box.boxtype] = sizeInfo;

      if (moov && mdat) return [{ moov, mdat }, undefined];

      if (total === end + 1) {
        return [undefined, new Error("No Moov info in file")];
      }

      buf.clear();
      from += box.size;
      to = from + 8;
      i--;
    }
    return [undefined, new Error(`No Moov info in file after ${times} times`)];
  }

  async _processMoov() {
    // load and parse moov box according the box head info
    // gains by `_indicateMoovMdat`
    const { from, to } = this.topBoxesSizeInfo.moov;
    const buf = new ReadWriteBuffer();
    const [{ bytes }, err] = await fetchRange({
      from,
      to,
      url: this.url
    });
    if (err) return [undefined, err];

    buf.append(bytes);

    return new Decoder.Box(buf);
  }

  _fetch(from, to) {
    fetch(this.url, {
      headers: {
        Range: `bytes=${from}-${to}`
      }
    })
      .then(resp => {
        // console.log(resp);
        resp.arrayBuffer();
      })
      .then(ab => {
        this.buf.append(new Uint8Array(ab));
        const box = new Decoder.Box();
        box.fulfill(this.buf);
        // console.log(box);
      });
  }

  async load() {
    // this._fetch(0, 900);
    await this._indicateMoovMdat();
    const moov = await this._processMoov();
    Decoder.samples(moov, 1);
    // console.log(this.topBoxesSizeInfo);
  }
}
