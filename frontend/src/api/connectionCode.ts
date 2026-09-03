/**
 * Mirrors backend/app/connection_code.py exactly. A connection code is just
 * an IPv4 address + port compressed into Crockford Base32 — decoding it is
 * pure local math, no request to the server needed, which matters because
 * at this point in the flow we don't know how to reach the server yet.
 */
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function decodeConnectionCode(code: string): string {
  // Tolerate someone pasting the full combined code (network.share) here too —
  // just use the part before the dot rather than erroring on it.
  const networkPart = code.includes(".") ? code.slice(0, code.indexOf(".")) : code;

  let clean = networkPart.replace(/[-\s]/g, "").toUpperCase();
  clean = clean.replace(/O/g, "0").replace(/[IL]/g, "1");

  if (clean.length < 10) {
    throw new Error("That code looks too short — double check and try again.");
  }

  let bits = "";
  for (const ch of clean) {
    const idx = CROCKFORD_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`'${ch}' isn't a valid character in a connection code.`);
    }
    bits += idx.toString(2).padStart(5, "0");
  }
  bits = bits.slice(0, 48);

  const bytes: number[] = [];
  for (let i = 0; i < 48; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  const ip = bytes.slice(0, 4).join(".");
  const port = (bytes[4] << 8) | bytes[5];
  return `http://${ip}:${port}`;
}
