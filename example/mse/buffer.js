export class ReadWriteBuffer {
  constructor() {
    this.cap = 512;
    this.raw = new Uint8Array(this.cap);
    this.head = 0; // for reading from head
    this.tail = 0; // for appending after tail
    this.shrinkThreshold = this.cap / 3;
  }

  grow(to) {
    this.cap = to;
    this.shrinkThreshold = this.cap / 3;
    const buf = new Uint8Array(this.cap);
    buf.set(this.raw, this.head);
    this.raw = buf;
  }

  shrink() {
    if (this.head >> 1 < this.shrinkThreshold) return;
    const buf = new Uint8Array(this.cap);
    buf.set(this.raw.slice(this.head));
    this.raw = buf;
    this.tail -= this.head;
  }

  guard(lenToWrite) {
    if (this.tail + lenToWrite >= this.cap - 1) {
      let to = this.tail + lenToWrite;
      to = Math.ceil(to / this.cap) * this.cap;
      this.grow(to);
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

  clear() {
    this.head = 0;
    this.tail = 0;
  }

  readUInt8() {
    const i = this.dv.getUint8();
    this.head += 1;
    this.shrink();
    return i;
  }

  readInt32() {
    const i = this.dv.getInt32();
    this.head += 4;
    this.shrink();
    return i;
  }

  readUInt32() {
    const i = this.dv.getUint32();
    this.head += 4;
    this.shrink();
    return i;
  }
}
