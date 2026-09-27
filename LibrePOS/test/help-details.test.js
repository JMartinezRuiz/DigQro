import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { helpDetailSearchText, renderHelpDetails } from "../src/help-details.js";
const { articles } = JSON.parse(readFileSync(new URL("../src/help-content.json", import.meta.url)));

test("all operational guides provide a worked example, diagnostics and final verification", () => {
  for (const article of articles) {
    assert.ok(article.example.title && article.example.detail.length > 60, article.id);
    assert.ok(article.troubleshooting.length >= 2, article.id);
    assert.ok(article.troubleshooting.every(i => i.symptom && i.resolution.length > 50), article.id);
    assert.ok(article.verification.length >= 3, article.id);
    const search = helpDetailSearchText(article);
    for (const issue of article.troubleshooting) assert.ok(search.includes(issue.symptom), article.id);
    assert.ok(search.includes(article.example.detail), article.id);
  }
});
test("editorial rendering escapes untrusted strings and supports guides without extensions", () => {
  const html = renderHelpDetails({ example: {title:'<script>',detail:'A & B'}, troubleshooting:[{symptom:'<img src=x onerror=alert(1)>',resolution:'"quoted"'}], verification:['<iframe>'] });
  assert.doesNotMatch(html, /<script>|<img|<iframe>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /<summary>&lt;img/);
  assert.equal(renderHelpDetails({}).trim(), "");
});
test("new guides and news links resolve to real tutorials", () => {
  const ids = new Set(articles.map(a => a.id));
  for (const id of ["correct-payment", "payment-terminals", "lan-access"]) assert.ok(ids.has(id));
  const news = readFileSync(new URL("../src/whats-new.js", import.meta.url), "utf8");
  for (const [, id] of news.matchAll(/guide: "([^"]+)"/g)) assert.ok(ids.has(id), id);
});
