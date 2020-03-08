export class ReadWriteBuffer {
  constructor() {
    this.cap = 512;
    this.raw = new Uint8Array(this.cap);
    this.head = 0; // for reading from head
    this.tail = 0; // for appending after tail
  }

  grow(to) {
    this.cap = to;

    const buf = new Uint8Array(this.cap);
    buf.set(this.raw, this.head);
    this.raw = buf;
  }

  shrink() {
    const buf = new Uint8Array(this.cap);
    buf.set(this.raw.slice(this.head));
    this.raw = buf;
    this.tail -= this.head;
  }

  guard(lenToWrite) {
    const isDry = () => this.tail + lenToWrite >= this.cap - 1;

    if (isDry()) {
      this.shrink();

      if (isDry()) {
        let to = this.tail + lenToWrite;
        to = Math.ceil(to / this.cap) * this.cap;
        this.grow(to);
      }
    }
  }

  append(buf) {
    const len = buf.length;
    this.guard(len);
    this.raw.set(buf, this.tail);
    this.tail += len;
  }

  get dv() {
    return new DataView(this.raw.buffer, this.head);
  }

  get length() {
    return this.tail - this.head;
  }

  remains(cnt = 1) {
    return this.length >= cnt;
  }

  clear() {
    this.head = 0;
    this.tail = 0;
  }

  readUInt8() {
    const i = this.dv.getUint8();
    this.head += 1;
    return i;
  }

  readInt8() {
    const i = this.dv.getInt8();
    this.head += 1;
    return i;
  }

  readInt32() {
    const i = this.dv.getInt32();
    this.head += 4;
    return i;
  }

  readUInt32() {
    const i = this.dv.getUint32();
    this.head += 4;
    return i;
  }

  readInt16() {
    const i = this.dv.getInt16();
    this.head += 2;
    return i;
  }

  readUInt16() {
    const i = this.dv.getUint16();
    this.head += 2;
    return i;
  }

  // read a UTF8 character as its unicode form from current position
  // also advance the internal pos field
  advanceAsUTF8() {
    const ul = this.length;
    const byte = this.readUInt8();
    if (byte <= 127) {
      return byte;
    }
    if (byte >> 5 === 0x6 && ul >= 2) {
      return ((byte & 0x1f) << 6) | (this.readUInt8() & 0x3f);
    }
    if (byte >> 4 === 0xe && ul >= 3) {
      return (
        ((byte & 0xf) << 12) |
        ((this.readUInt8() & 0x3f) << 6) |
        (this.readUInt8() & 0x3f)
      );
    }
    if (byte >> 3 === 0x1e && ul >= 4) {
      return (
        ((byte & 0x7) << 18) |
        ((this.readUInt8() & 0x3f) << 12) |
        ((this.readUInt8() & 0x3f) << 6) |
        (this.readUInt8() & 0x3f)
      );
    }
    throw new Error("deformed utf8: " + byte);
  }

  advanceAsUTF8Until(end) {
    // code points
    const chars = [];
    let cp;
    while (this.length && cp !== end) {
      cp = this.advanceAsUTF8();
      chars.push(String.fromCodePoint(cp));
    }
    return chars.join("");
  }

  readBytes(cnt) {
    let i = cnt;
    const bytes = [];
    while (i && this.length) {
      bytes.push(this.readUInt8());
      i--;
    }
    return bytes;
  }
}
