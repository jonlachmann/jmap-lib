const BEGIN = "BEGIN:VCARD";
const END = "END:VCARD";

/**
 * Split a .vcf into its cards, each as its own octets, for ContactCard/parse, which reads one per blob. Only the framing is read:
 * a card starts on a line "BEGIN:VCARD" and ends on one "END:VCARD" (RFC 6350 6.1.1), which nothing else can look
 * like, since a folded line goes on with a space or tab and a value's line break is written "\n". A card held inside
 * another (vCard 2.1's AGENT) stays in it. The octets are cut, not decoded, so a card in another charset reaches the
 * server as it was.
 */
export function splitVCards(octets: Uint8Array): Uint8Array[] {
  const cards: Uint8Array[] = [];
  let depth = 0;
  let start = 0;
  let lineStart = 0;
  while (lineStart < octets.length) {
    const newline = octets.indexOf(0x0a, lineStart);
    const lineEnd = newline < 0 ? octets.length : newline + 1;
    if (startsLine(octets, lineStart, BEGIN)) {
      if (depth === 0) start = lineStart;
      depth++;
    } else if (depth > 0 && startsLine(octets, lineStart, END)) {
      depth--;
      if (depth === 0) cards.push(octets.subarray(start, lineEnd));
    }
    lineStart = lineEnd;
  }
  return cards;
}

/** Check whether the line at the offset is the marker, in any case, with nothing after it but a line end or spaces. */
function startsLine(octets: Uint8Array, offset: number, marker: string): boolean {
  for (let i = 0; i < marker.length; i++) {
    const octet = octets[offset + i];
    if (octet === undefined || (octet | 0x20) !== (marker.charCodeAt(i) | 0x20)) return false;
  }
  for (let i = offset + marker.length; i < octets.length && octets[i] !== 0x0a; i++) {
    if (octets[i] !== 0x0d && octets[i] !== 0x20 && octets[i] !== 0x09) return false;
  }
  return true;
}
