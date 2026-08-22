import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compareAppVersions } from "../sync-store.js";

test("detecta una version remota posterior", () => {
  assert.equal(compareAppVersions("0.4.47", "0.5.0"), -1);
  assert.equal(compareAppVersions("v0.5.0", "0.5.0"), 0);
});

test("no propone bajar una instalacion mas reciente", () => {
  assert.equal(compareAppVersions("0.5.1", "0.5.0"), 1);
  assert.equal(compareAppVersions("0.6", "0.5.9"), 1);
});

test("ordena versiones preliminares antes de la version final", () => {
  assert.equal(compareAppVersions("0.5.0-beta.2", "0.5.0"), -1);
  assert.equal(compareAppVersions("0.5.0", "0.5.0-beta.2"), 1);
});

test("el reparador de Windows evita la API limitada y conserva los datos", async () => {
  const script = await readFile(new URL("../scripts/repair-update.ps1", import.meta.url), "utf8");

  assert.doesNotMatch(script, /api\.github\.com/);
  assert.match(script, /raw\.githubusercontent\.com/);
  assert.match(script, /zip\/refs\/tags/);
  assert.match(script, /Write-VersionMarker/);
  assert.doesNotMatch(script, /Remove-Item[^\n]+\.librepos/i);
});
