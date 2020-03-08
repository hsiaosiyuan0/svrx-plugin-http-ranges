/* eslint-disable no-console */
import { toAscii } from "../util.js";

// size 8
function box(buf, onlyBase) {
  this.size = buf.readUInt32();
  if (this.size < 1) {
    throw new Error("Unsupported box size: " + this.size);
  }

  this.boxtype = toAscii(buf.readUInt32());
  if (onlyBase) return;

  console.log(this);

  const fulfiller = BoxFulfillers[this.boxtype];
  if (fulfiller) {
    fulfiller.call(this, buf);
  } else {
    // debugger;
    throw new Error("Unsupported boxtype: " + this.boxtype);
  }
}

export const Box = box;

// size 12
function fullbox(buf, verChk) {
  // Box properties...
  const i = buf.readUInt32();
  this.version = i >> 24;
  this.flags = i & 0xffffff;

  verChk = verChk || (v => v !== 1);
  if (verChk && !verChk(this.version)) {
    throw new Error("64bit is temporarily not supported");
  }
}

function ftyp(buf) {
  // Box properties...
  this.major_brand = toAscii(buf.readUInt32());
  this.minor_version = buf.readInt32();
  this.compatible_brands = [];
  let i = this.size - 16;
  while (i && buf.remains(4)) {
    this.compatible_brands.push(toAscii(buf.readUInt32()));
    i -= 4;
  }
  this.fulfilled = i === 0;
}

function free(buf) {
  // Box properties...
  this.data = [];
  let i = this.size - 8;
  while (i && buf.remains()) {
    this.data.push(buf.readUInt8());
    i--;
  }
  this.fulfilled = i === 0;
}

function childrenBoxes(buf, aboveSize = 8) {
  console.group(
    `childrenBoxes of: ${this.boxtype} size: ${this.size} bufHead: ${buf.head}`
  );
  let i = this.size - aboveSize;
  const boxes = [];
  while (i && buf.remains()) {
    const box = new Box(buf);
    boxes.push(box);
    i -= box.size;
  }
  this.children = boxes;
  this.fulfilled = i === 0;
  console.groupEnd();
}

function moov(buf) {
  // Box properties...
  childrenBoxes.call(this, buf);
}

function data(buf, { propName = "data", aboveSize = 8 } = {}) {
  const data = [];
  let i = this.size - aboveSize;
  while (i && buf.remains()) {
    data.push(buf.readUInt8());
    i--;
  }
  this[propName] = data;
  this.fulfilled = i === 0;
}

function mdat(buf) {
  // Box properties...
  data.call(this, buf);
}

function mvhd(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.creation_time = buf.readUInt32();
  this.modification_time = buf.readUInt32();
  this.timescale = buf.readUInt32();
  this.duration = buf.readUInt32();

  this.rate = buf.readInt32();
  this.volume = buf.readInt16();
  this.reserved = buf.readUInt16();
  this.reserved1 = [buf.readUInt32(), buf.readUInt32()];
  this.matrix = [];
  for (let i = 0; i < 9; i++) {
    this.matrix.push(buf.readInt32());
  }
  this.pre_defined = [];
  for (let i = 0; i < 6; i++) {
    this.pre_defined.push(buf.readUInt32());
  }
  this.next_track_ID = buf.readUInt32();
}

function trak(buf) {
  childrenBoxes.call(this, buf);
}

function langToAscii(lang) {
  return [
    (lang >> 10) + 0x60,
    ((lang & 0x3ff) >> 5) + 0x60,
    (lang & 0x1f) + 0x60
  ]
    .map(c => String.fromCharCode(c))
    .join("");
}

function tkhd(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.creation_time = buf.readUInt32();
  this.modification_time = buf.readUInt32();
  this.track_ID = buf.readUInt32();
  this.reserved = buf.readUInt32();
  this.duration = buf.readUInt32();

  this.reserved1 = [buf.readUInt32(), buf.readUInt32()];
  this.layer = buf.readInt16();
  this.alternate_group = buf.readInt16();
  this.volume = buf.readInt16();
  this.reserved2 = buf.readUInt16();

  this.matrix = [];
  for (let i = 0; i < 9; i++) {
    this.matrix.push(buf.readInt32());
  }

  this.width = buf.readUInt32();
  this.height = buf.readUInt32();
}

function mdia(buf) {
  childrenBoxes.call(this, buf);
}

function mdhd(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.creation_time = buf.readUInt32();
  this.modification_time = buf.readUInt32();
  this.timescale = buf.readUInt32();
  this.duration = buf.readUInt32();

  const i = buf.readUInt16();
  this.pad = 0;
  this.language = langToAscii(0x7fff & i);
  this.pre_defined = buf.readUInt16();
}

function hdlr(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.pre_defined = buf.readUInt32();
  this.handler_type = toAscii(buf.readUInt32());

  this.reserved = [];
  for (let i = 0; i < 3; i++) {
    this.reserved.push(buf.readInt32());
  }

  this.name = buf.advanceAsUTF8Until(0);
}

function minf(buf) {
  childrenBoxes.call(this, buf);
}

function vmhd(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.graphicsmode = buf.readUInt16();
  this.opcolor = [buf.readUInt16(), buf.readUInt16(), buf.readUInt16()];
}

function smhd(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.balance = buf.readUInt16();
  this.reserved = buf.readUInt16();
}

function hmhd(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.maxPDUsize = buf.readUInt16();
  this.avgPDUsize = buf.readUInt16();
  this.maxbitrate = buf.readUInt32();
  this.avgbitrate = buf.readUInt32();
  this.reserved = buf.readUInt32();
}

function nmhd(buf) {
  // Box properties...
  fullbox.call(this, buf);
}

function dinf(buf) {
  childrenBoxes.call(this, buf);
}

function dref(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.entry_count = buf.readUInt32();
  childrenBoxes.call(this, buf, 12 + 4);
}

function url(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.location = "";
  if (this.size - 12 > 0) {
    this.location = buf.advanceAsUTF8Until(0);
  }
}

function urn(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.name = "";
  this.location = "";
  if (this.size - 12 > 0) {
    this.name = buf.advanceAsUTF8Until(0);
    this.location = buf.advanceAsUTF8Until(0);
  }
}

function stbl(buf) {
  //   debugger;
  childrenBoxes.call(this, buf);
}

function stsd(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.entry_count = buf.readUInt32();

  childrenBoxes.call(this, buf, 12 + 4);
}

// size: 8 + 6 + 2 = 16
function SampleEntry(buf) {
  // Box properties...

  this.reserved = [];
  for (let i = 0; i < 6; i++) {
    this.reserved.push(buf.readUInt8());
  }
  this.data_reference_index = buf.readUInt16();
}

function HintSampleEntry(buf) {
  SampleEntry.call(this, buf);
  data.call(this, buf, { aboveSize: 16 });

  this.handler_type = "hint";
}

function btrt(buf) {
  this.bufferSizeDB = buf.readUInt32();
  this.maxBitrate = buf.readUInt32();
  this.avgBitrate = buf.readUInt32();
}

// size: 16
function MetaDataSampleEntry(buf) {
  SampleEntry.call(this, buf);

  this.handler_type = "meta";
}

function metx(buf) {
  MetaDataSampleEntry.call(this, buf);

  const s = buf.head;
  this.content_encoding = buf.advanceAsUTF8Until(0);
  this.namespace = buf.advanceAsUTF8Until(0);
  this.schema_location = buf.advanceAsUTF8Until(0);
  const e = buf.head;

  // count is 0 or 1
  childrenBoxes.call(this, buf, 16 + e - s);
}

function mett(buf) {
  MetaDataSampleEntry.call(this, buf);

  const s = buf.head;
  this.content_encoding = buf.advanceAsUTF8Until(0);
  this.mime_format = buf.advanceAsUTF8Until(0);
  const e = buf.head;

  // count is 0 or 1
  childrenBoxes.call(this, buf, 16 + e - s);
}

function uri(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.theURI = buf.advanceAsUTF8Until(0);
}

function uriI(buf) {
  // Box properties...
  fullbox.call(this, buf);

  data.call(this, buf, { data: "uri_initialization_data", aboveSize: 12 });
}

function urim(buf) {
  MetaDataSampleEntry.call(this, buf);

  // count is 1 ~ 3
  childrenBoxes.call(this, buf, 16);
}

function pasp(buf) {
  this.hSpacing = buf.readUInt32();
  this.vSpacing = buf.readUInt32();
}

function clap(buf) {
  this.cleanApertureWidthN = buf.readUInt32();
  this.cleanApertureWidthD = buf.readUInt32();

  this.cleanApertureHeightN = buf.readUInt32();
  this.cleanApertureHeightD = buf.readUInt32();

  this.horizOffN = buf.readUInt32();
  this.horizOffD = buf.readUInt32();

  this.vertOffN = buf.readUInt32();
  this.vertOffD = buf.readUInt32();
}

function colr(buf) {
  this.colour_type = toAscii(buf.readUInt32());

  if (this.colour_type === "nclx") {
    this.colour_primaries = buf.readUInt16();
    this.transfer_characteristics = buf.readUInt32();
    this.matrix_coefficients = buf.readUInt32();
    const i = buf.readUInt8();
    this.full_range_flag = i >> 7;
    this.reserved = 0;
  } else {
    throw new Error("Unsupported color type");
  }
}

// size: 16 + 4 + 12 + 4 + 12 + 2 + 32 + 4
function VisualSampleEntry(buf) {
  SampleEntry.call(this, buf);

  this.pre_defined = buf.readUInt16();
  this.reserved = buf.readUInt16();

  this.pre_defined1 = [];
  for (let i = 0; i < 3; i++) {
    this.pre_defined1.push(buf.readUInt32());
  }

  this.width = buf.readUInt16();
  this.height = buf.readUInt16();
  this.horizresolution = buf.readUInt32();
  this.vertresolution = buf.readUInt32();
  this.reserved = buf.readUInt32();
  this.frame_count = buf.readUInt16();
  this.compressorname = buf.readBytes(32);
  this.depth = buf.readUInt16();
  this.pre_defined2 = buf.readInt16();

  childrenBoxes.call(this, buf, 86);

  this.handler_type = "vide";
}

// size: 16 + 8 + 8 + 4
function AudioSampleEntry(buf) {
  SampleEntry.call(this, buf);

  this.reserved = [buf.readUInt32(), buf.readUInt32()];
  this.channelcount = buf.readUInt16();
  this.samplesize = buf.readUInt16();
  this.pre_defined = buf.readUInt16();
  this.reserved = buf.readUInt16();
  this.samplerate = buf.readUInt32();

  this.handler_type = "soun";
}

function stts(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.entry_count = buf.readUInt32();
  this.sample_count = [];
  this.sample_delta = [];
  for (let i = 0, len = this.entry_count; i < len; i++) {
    this.sample_count.push(buf.readUInt32());
    this.sample_delta.push(buf.readUInt32());
  }
}

function ctts(buf) {
  // Box properties...
  fullbox.call(this, buf, () => true);

  this.entry_count = buf.readUInt32();
  this.sample_count = [];
  this.sample_delta = [];

  for (let i = 0, len = this.entry_count; i < len; i++) {
    if (this.version === 0) {
      this.sample_count.push(buf.readUInt32());
      this.sample_delta.push(buf.readUInt32());
    } else if (this.version === 1) {
      this.sample_count.push(buf.readUInt32());
      this.sample_delta.push(buf.readInt32());
    } else {
      throw new Error("Unsupported version: " + this.version);
    }
  }
}

function stss(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.entry_count = buf.readUInt32();
  this.sample_number = [];
  for (let i = 0, len = this.entry_count; i < len; i++) {
    this.sample_number.push(buf.readUInt32());
  }
}

function sdtp(buf) {
  // Box properties...
  fullbox.call(this, buf);

  data.call(this, buf, { aboveSize: 12 });
}

function stsc(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.entry_count = buf.readUInt32();
  this.first_chunk = [];
  this.samples_per_chunk = [];
  this.sample_description_index = [];
  for (let i = 0, len = this.entry_count; i < len; i++) {
    this.first_chunk.push(buf.readUInt32());
    this.samples_per_chunk.push(buf.readUInt32());
    this.sample_description_index.push(buf.readUInt32());
  }
}

function stco(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.entry_count = buf.readUInt32();
  this.chunk_offset = [];
  for (let i = 0, len = this.entry_count; i < len; i++) {
    this.chunk_offset.push(buf.readUInt32());
  }
}

function stsz(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.sample_size = buf.readUInt32();
  this.sample_count = buf.readUInt32();

  this.entry_size = [];
  if (this.sample_size === 0) {
    for (let i = 0, len = this.sample_count; i < len; i++) {
      this.entry_size.push(buf.readUInt32());
    }
  }
}

function edts(buf) {
  childrenBoxes.call(this, buf);
}

function elst(buf) {
  // Box properties...
  fullbox.call(this, buf);

  this.entry_count = buf.readUInt32();
  this.segment_duration = [];
  this.media_time = [];
  this.media_rate_integer = [];
  this.media_rate_fraction = [];
  for (let i = 0, len = this.entry_count; i < len; i++) {
    this.segment_duration.push(buf.readUInt32());
    this.media_time.push(buf.readInt32());
    this.media_rate_integer.push(buf.readInt16());
    this.media_rate_fraction.push(buf.readInt16());
  }
}

// reference to:
// https://www.itscj.ipsj.or.jp/sc29/open/29view/29n14632t.doc
function AVCDecoderConfigurationRecord(buf) {
  this.configurationVersion = buf.readUInt8();
  // what does those profile_idc mean can reference to:
  // https://blog.pearce.org.nz/2013/11/what-does-h264avc1-codecs-parameters.html
  this.AVCProfileIndication = buf.readUInt8();
  this.profile_compatibility = buf.readUInt8();
  this.AVCLevelIndication = buf.readUInt8();

  this.lengthSizeMinusOne = 0b11 & buf.readUInt8();

  this.numOfSequenceParameterSets = 0b11111 & buf.readUInt8();
  this.sequenceParameterSetLength = [];
  this.sequenceParameterSetNALUnit = [];
  for (let i = 0, len = this.numOfSequenceParameterSets; i < len; i++) {
    const sl = buf.readUInt16();
    this.sequenceParameterSetLength.push(sl);
    this.sequenceParameterSetNALUnit.push(buf.readBytes(sl));
  }

  this.numOfPictureParameterSets = buf.readUInt8();
  this.pictureParameterSetLength = [];
  this.pictureParameterSetNALUnit = [];
  for (let i = 0, len = this.numOfPictureParameterSets; i < len; i++) {
    const sl = buf.readUInt16();
    this.pictureParameterSetLength.push(sl);
    this.pictureParameterSetNALUnit.push(buf.readBytes(sl));
  }
}

function avcC(buf) {
  AVCDecoderConfigurationRecord.call(this, buf);
}

function m4ds(buf) {
  data.call(this, buf);
}

function avc1(buf) {
  VisualSampleEntry.call(this, buf);
}

// reference to:
// http://www.telemidia.puc-rio.br/~rafaeldiniz/public_files/normas/ISO-14496/ISO_IEC_14496-14_2003_PDF_version_(en).pdf
function mp4a(buf) {
  AudioSampleEntry.call(this, buf);
  childrenBoxes.call(this, buf, 36);
}

function esds(buf) {
  // Box properties...
  fullbox.call(this, buf);

  data.call(this, buf, { aboveSize: 12 });
}

function sgpd(buf) {
  // Box properties...
  fullbox.call(this, buf, () => true);

  data.call(this, buf, { aboveSize: 12 });
}

function sbgp(buf) {
  // Box properties...
  fullbox.call(this, buf, () => true);

  this.grouping_type = buf.readUInt32();
  if (this.version === 1) {
    this.grouping_type_parameter = buf.readUInt32();
  }

  this.entry_count = buf.readUInt32();
  this.sample_count = [];
  this.group_description_index = [];
  for (let i = 0, len = this.entry_count; i < len; i++) {
    this.sample_count.push(buf.readUInt32());
    this.group_description_index.push(buf.readUInt32());
  }
}

function udta(buf) {
  data.call(this, buf);
}

export const BoxFulfillers = {
  ftyp,
  free,
  moov,
  mdat,
  mvhd,
  trak,
  tkhd,
  mdia,
  mdhd,
  hdlr,
  minf,
  vmhd,
  smhd,
  hmhd,
  nmhd,
  dinf,
  dref,
  "url ": url,
  "urn ": urn,
  stbl,
  stsd,
  soun: AudioSampleEntry,
  vide: VisualSampleEntry,
  hint: HintSampleEntry,
  meta: MetaDataSampleEntry,
  btrt,
  metx,
  mett,
  "uri ": uri,
  uriI,
  urim,
  pasp,
  clap,
  colr,
  stts,
  sdtp,
  stsc,
  stco,
  stsz,
  edts,
  elst,
  ctts,
  stss,
  avcC,
  avc1,
  m4ds,
  mp4a,
  esds,
  sgpd,
  sbgp,
  udta
};

// function sub(box, type) {
//   if (!Array.isArray(box.children)) return null;
//   return box.children.find(box => box.boxtype === type);
// }

// function subs(box, type) {
//   if (!Array.isArray(box.children)) return [];
//   return box.children.filter(box => box.boxtype === type);
// }

// function traksOf(moov) {
//   if (moov._traks) return moov._traks;

//   const traks = subs(moov, "trak");
//   moov._traks = traks.reduce((p, c) => {
//     const thd = sub(c, "tkhd");
//     p[thd.track_ID] = c;
//     return p;
//   }, {});
//   return moov._traks;
// }

// export function samples(moov, trakId) {
//   if (moov._samples) return moov._samples;

//   const traks = traksOf(moov);
//   const trak = traks[trakId];

//   const stbl = sub(sub(sub(trak, "mdia"), "minf"), "stbl");
//   const stts = sub(stbl, "stts");
//   console.log(stts);
// }
