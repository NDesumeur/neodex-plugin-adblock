// node tools/icon.js : dessine icon.png (bouclier pixel, 16x16 agrandi 8 fois) sans dépendance : PNG écrit à la main avec zlib
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ART = [  // . vide · o contour · m magenta · l clair · w blanc · d ombre
  '................',
  '..oooooooooooo..',
  '.ommmmmmmmmmlmo.',
  '.omdddmmmmmllmo.',
  '.omdwwmmmmwwlmo.',
  '.omddwwmmwwdlmo.',
  '.ommddwwwwddmmo.',
  '.ommmddwwddmmmo.',
  '.ommmmwwwwmmmmo.',
  '..ommwwddwwmmo..',
  '..omwwdmmdwwmo..',
  '...ommmmmmmmo...',
  '....ommmmmmo....',
  '.....ommmmo.....',
  '......oooo......',
  '................',
];
const C = { '.': [0, 0, 0, 0], o: [26, 8, 40, 255], m: [224, 30, 200, 255], l: [255, 127, 227, 255], w: [255, 255, 255, 255], d: [140, 16, 120, 255] };
const S = 8, W = 16 * S, raw = Buffer.alloc((W * 4 + 1) * W);
for (let y = 0; y < W; y++) { raw[y * (W * 4 + 1)] = 0; for (let x = 0; x < W; x++) C[ART[y / S | 0][x / S | 0]].forEach((v, i) => { raw[y * (W * 4 + 1) + 1 + x * 4 + i] = v; }); }
const crcT = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = ~0; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(path.join(__dirname, '..', 'icon.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('icon.png ' + W + 'x' + W);
