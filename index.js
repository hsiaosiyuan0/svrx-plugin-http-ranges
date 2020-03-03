/* eslint-disable no-console */
const path = require("path");
const fs = require("fs").promises;

const rRange = /(\d+)-(\d*)/g;

function parseRanges(r) {
  const rs = [];
  let matches;
  while ((matches = rRange.exec(r)) !== null) {
    const s1 = parseInt(matches[1], 10);
    const s2 = parseInt(matches[2], 10) || -1;
    if (s1 >= 0 && s2 >= -1 && (s2 === -1 || s2 >= s1)) rs.push([s1, s2]);
  }
  rRange.lastIndex = 0;
  return rs;
}

async function go(p) {
  return p
    .then(res => Promise.resolve([res, null]))
    .catch(err => Promise.resolve([null, err]));
}

async function onRoute(ctx, next) {
  const rawRanges = ctx.headers.range;
  if (!rawRanges) return next();

  const ranges = parseRanges(rawRanges);
  if (ranges.length === 0) {
    console.log("no range parsed: " + rawRanges);
    return next();
  }

  // just for demonstration only mp4 is acceptable
  const file = path.join(process.cwd(), ctx.path);
  const ext = path.extname(file);
  if (ext !== ".mp4") {
    console.log("deformed request file type: " + ext);
    return next();
  }

  const [fd, err] = await go(fs.open(file, "r"));
  if (err) {
    console.log("failed to open file: " + file);
    console.error(err);
    return next();
  }

  // just for demonstration only the first range is processed
  let [from, to] = ranges[0];
  const [fstat, err1] = await go(fs.stat(file));
  if (err1) {
    console.log("failed to stat file: " + file);
    console.error(err1);
    fd.close();
    return next();
  }

  to = to === -1 ? fstat.size - 1 : to;
  const len = to - from + 1;
  const buf = Buffer.alloc(to - from + 1);
  const [read, err2] = await go(fd.read(buf, 0, len, from));
  const { bytesRead } = read;
  if (err2 || bytesRead < len) {
    console.log("failed to read file: " + file);
    console.error(err2);
    fd.close();
    return next();
  }

  fd.close();

  ctx.response.status = 206;
  ctx.response.set("Content-Range", `bytes ${from}-${to}/${fstat.size}`);
  ctx.response.set("Content-Length", bytesRead);
  ctx.body = buf;

  console.log("succeed to process ranges: " + bytesRead);
  return null;
}

module.exports = {
  // Ref: https://docs.svrx.io/en/plugin/contribution.html#schema
  configSchema: {},

  hooks: {
    // Ref: https://docs.svrx.io/en/plugin/contribution.html#server
    async onCreate({ middleware }) {
      middleware.add("http-ranges", {
        priority: 100,
        onRoute
      });

      return () => {};
    }
  }
};
