export function toAscii(i) {
  return [i >> 24, (i & 0xff0000) >> 16, (i & 0xff00) >> 8, i & 0xff]
    .map(c => String.fromCharCode(c))
    .join("");
}

export const BoxPropertiesFulfillers = {
  ftyp(buf) {
    // Box properties...
    this.major_brand = toAscii(buf.readInt32());
    this.minor_version = buf.readInt32();
    this.compatible_brands = [];
    let i = this.size - 16;
    while (i && buf.length) {
      this.compatible_brands.push(toAscii(buf.readInt32()));
      i -= 4;
    }
    return i === 0;
  },
  free(buf) {
    // Box properties...
    this.data = [];
    let i = this.size - 8;
    while (i && buf.length) {
      this.data.push(buf.readUInt8());
      i--;
    }
    return i === 0;
  },
  mdat(buf) {
    // Box properties...
    this.data = [];
    let i = this.size - 8;
    while (i && buf.length) {
      this.data.push(buf.readUInt8());
      i--;
    }
    return i === 0;
  }
};

export class Box {
  constructor() {
    this.size = 0;
    this.boxtype = 0;
  }

  fulfill(buf, onlyBase = false) {
    this.size = buf.readInt32();
    console.log(buf);
    if (this.size === 1 || this.size === 0) {
      throw new Error("Unsupported box size: " + this.size);
    }
    this.boxtype = toAscii(buf.readInt32());
    if (onlyBase) return true;

    const fulfiller = BoxPropertiesFulfillers[this.boxtype];
    if (fulfiller) return fulfiller.call(this, buf);
    return false;
  }
}

export class FullBox extends Box {
  constructor() {
    super();
    this.version = 0;
    this.flags = 0;
  }

  fulfill(buf) {
    super.fulfill(buf);
    const i = buf.readUInt32();
    this.version = i >> 24;
    this.flags = i & 0xffffff;
  }
}
