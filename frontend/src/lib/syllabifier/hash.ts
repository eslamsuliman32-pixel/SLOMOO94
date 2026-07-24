// SHA-1 متزامن ونقي (بدون Web Crypto غير المتزامن) — لإنتاج hash.BarFingerprint

function rotl(n: number, s: number): number {
  return (n << s) | (n >>> (32 - s))
}

export function sha1(input: string): string {
  const utf8 = unescape(encodeURIComponent(input))
  const bytes: number[] = []
  for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i) & 0xff)

  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff)

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const w = new Array<number>(80).fill(0)
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[chunk + i * 4] << 24) | (bytes[chunk + i * 4 + 1] << 16) |
        (bytes[chunk + i * 4 + 2] << 8) | bytes[chunk + i * 4 + 3]
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)

    let [a, b, c, d, e] = [h0, h1, h2, h3, h4]
    for (let i = 0; i < 80; i++) {
      let f: number, k: number
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999 }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1 }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc }
      else { f = b ^ c ^ d; k = 0xca62c1d6 }
      const temp = (rotl(a, 5) + f + e + k + w[i]) | 0
      e = d; d = c; c = rotl(b, 30); b = a; a = temp
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0
  }

  return [h0, h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('')
}
