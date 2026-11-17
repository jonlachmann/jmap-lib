import test from "node:test";
import assert from "node:assert/strict";

import { AccountId, JmapClient, JmapHttpError, JmapUploadTooLargeError, type JmapSession } from "jmap-lib";

type Request = { url: string; init: RequestInit };

const session = {
  apiUrl: "https://example.test/jmap",
  uploadUrl: "https://example.test/upload/{accountId}",
  downloadUrl: "https://example.test/download/{accountId}/{blobId}/{name}?type={type}",
  capabilities: { "urn:ietf:params:jmap:core": { maxSizeUpload: 10 } },
} as unknown as JmapSession;

// Records each request and answers it with the response given.
function transferClient(answer: () => Response) {
  const requests: Request[] = [];
  const client = new JmapClient({
    endpoint: session.apiUrl,
    authorization: "Bearer token",
    capabilities: ["urn:ietf:params:jmap:core"],
    session,
    fetch: async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });
      return answer();
    },
  });
  return { client, requests };
}

const acc = AccountId.of("a/1");

test("upload posts the data to the account's upload URL with its type (RFC 8620 6.1)", async () => {
  const { client, requests } = transferClient(() =>
    new Response(JSON.stringify({ accountId: "a/1", blobId: "B1", type: "text/plain", size: 5 }), { status: 201 }));
  const uploaded = await client.upload(acc, new TextEncoder().encode("hello"), "text/plain");

  assert.deepEqual(uploaded, { accountId: "a/1", blobId: "B1", type: "text/plain", size: 5 });
  assert.equal(requests[0].url, "https://example.test/upload/a%2F1");
  assert.equal(requests[0].init.method, "POST");
  const headers = requests[0].init.headers as Record<string, string>;
  assert.equal(headers["content-type"], "text/plain");
  assert.equal(headers.authorization, "Bearer token");
  assert.equal(await (requests[0].init.body as Blob).text(), "hello");
});

test("upload refuses data over maxSizeUpload without sending it", async () => {
  const { client, requests } = transferClient(() => new Response("{}"));
  await assert.rejects(() => client.upload(acc, new Blob(["more than ten octets"]), "text/plain"), JmapUploadTooLargeError);
  assert.equal(requests.length, 0);
});

test("a refused upload is a JmapHttpError with the problem details", async () => {
  const problem = { type: "urn:ietf:params:jmap:error:limit", limit: "maxSizeUpload", status: 400, detail: "Too large" };
  const { client } = transferClient(() => new Response(JSON.stringify(problem), { status: 400 }));
  await assert.rejects(() => client.upload(acc, new ArrayBuffer(3), "application/octet-stream"), (error: unknown) => {
    assert.ok(error instanceof JmapHttpError);
    assert.equal(error.status, 400);
    assert.equal(error.problem?.limit, "maxSizeUpload");
    assert.equal(error.url, "https://example.test/upload/a%2F1");
    return true;
  });
});

test("downloadUrl fills the session's template, each value encoded (RFC 8620 6.2)", () => {
  const { client } = transferClient(() => new Response(""));
  assert.equal(
    client.downloadUrl(acc, "B 1", "a report.pdf", "application/pdf"),
    "https://example.test/download/a%2F1/B%201/a%20report.pdf?type=application%2Fpdf",
  );
});

test("download fetches the blob with the authorization", async () => {
  const { client, requests } = transferClient(() => new Response("bytes"));
  const blob = await client.download(acc, "B1", "file.txt", "text/plain");

  assert.equal(await blob.text(), "bytes");
  assert.equal(requests[0].init.method, "GET");
  assert.equal((requests[0].init.headers as Record<string, string>).authorization, "Bearer token");
});

test("a refused download is a JmapHttpError", async () => {
  const { client } = transferClient(() => new Response("", { status: 404 }));
  await assert.rejects(() => client.download(acc, "B1", "file.txt", "text/plain"), (error: unknown) =>
    error instanceof JmapHttpError && error.status === 404);
});

test("upload and download need the session", async () => {
  const client = new JmapClient({ endpoint: "https://example.test/jmap", authorization: "Bearer token", capabilities: [] });
  await assert.rejects(() => client.upload(acc, new Blob(["x"]), "text/plain"), /no session/);
  assert.throws(() => client.downloadUrl(acc, "B1", "f", "text/plain"), /no session/);
});
