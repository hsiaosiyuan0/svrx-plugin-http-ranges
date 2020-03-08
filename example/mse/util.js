export async function go(p) {
  return p
    .then(res => Promise.resolve([res, undefined]))
    .catch(err => Promise.resolve([undefined, err]));
}

export function toAscii(i) {
  return [i >> 24, (i & 0xff0000) >> 16, (i & 0xff00) >> 8, i & 0xff]
    .map(c => String.fromCharCode(c))
    .join("");
}

export function noop() {}
