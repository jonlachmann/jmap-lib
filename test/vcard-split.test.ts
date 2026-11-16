import test from "node:test";
import assert from "node:assert/strict";

import { splitVCards } from "jmap-lib";

const text = (octets: Uint8Array) => new TextDecoder().decode(octets);

test("splitVCards cuts a .vcf into its cards, whatever the line ends and case", () => {
  const file = new TextEncoder().encode(
    "BEGIN:VCARD\r\nFN:Anna\r\nEND:VCARD\r\nbegin:vcard\nFN:Ben\nNOTE:a line that\n mentions BEGIN:VCARD\nend:vcard\n",
  );

  const cards = splitVCards(file).map(text);

  assert.deepEqual(cards, [
    "BEGIN:VCARD\r\nFN:Anna\r\nEND:VCARD\r\n",
    "begin:vcard\nFN:Ben\nNOTE:a line that\n mentions BEGIN:VCARD\nend:vcard\n",
  ]);
});

test("splitVCards keeps a card held inside another, and the octets as they were", () => {
  const latin1 = Uint8Array.from([...new TextEncoder().encode("BEGIN:VCARD\nFN:Bj"), 0xf6, ...new TextEncoder().encode("rn\n")]);
  const nested = new TextEncoder().encode("AGENT:\nBEGIN:VCARD\nFN:Assistant\nEND:VCARD\nEND:VCARD\nBEGIN:VCARD\nFN:Cleo\nEND:VCARD");
  const file = new Uint8Array([...latin1, ...nested]);

  const cards = splitVCards(file);

  assert.equal(cards.length, 2);
  assert.equal(cards[0][17], 0xf6);
  assert.ok(text(cards[0]).includes("FN:Assistant"));
  assert.equal(text(cards[1]), "BEGIN:VCARD\nFN:Cleo\nEND:VCARD");
});

test("splitVCards finds nothing in a file without cards", () => {
  assert.deepEqual(splitVCards(new TextEncoder().encode("not a vCard\n")), []);
});
