import { ReadWriteBuffer } from "./buffer.js";
import { Box } from "./box.js";
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
  }

  async _indicateMoov() {
    const times = 10;
    const buf = new ReadWriteBuffer();
    const box = new Box();

    let from = 0;
    let to = 8;
    let i = times;
    while (i) {
      const [{ begin, end, total, bytes }, err] = await fetchRange({
        from,
        to,
        url: this.url
      });
      if (err) return [undefined, err];

      buf.append(bytes);
      box.fulfill(buf, true);
      if (box.boxtype === "moov") {
        return [{ from: begin, to: begin + box.size, total }, undefined];
      }

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

  _fetch(from, to) {
    fetch(this.url, {
      headers: {
        Range: `bytes=${from}-${to}`
      }
    })
      .then(resp => {
        console.log(resp);
        resp.arrayBuffer();
      })
      .then(ab => {
        this.buf.append(new Uint8Array(ab));
        const box = new Box();
        box.fulfill(this.buf);
        console.log(box);
      });
  }

  async load() {
    // this._fetch(0, 900);
    const [{ from, to, total } = {}, err] = await this._indicateMoov();
    console.log(from, to, total, err);
  }
}
