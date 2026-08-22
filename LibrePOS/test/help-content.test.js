import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";

const helpContent = JSON.parse(readFileSync(new URL("../src/help-content.json", import.meta.url), "utf8"));
const packageData = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const mediaManifest = JSON.parse(readFileSync(new URL("../assets/help/source/manifest.json", import.meta.url), "utf8"));
const articleIds = new Set(helpContent.articles.map((article) => article.id));
const categoryIds = new Set(helpContent.categories.map((category) => category.id));

function pngDimensions(path) {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function gifDimensions(path) {
  const bytes = readFileSync(path);
  return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
}

function jpegDimensions(path) {
  const bytes = readFileSync(path);
  assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8], `${path}: cabecera JPEG invalida`);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  throw new Error(`${path}: no se encontraron dimensiones JPEG`);
}

test("la ayuda tiene identificadores unicos y categorias validas", () => {
  assert.equal(articleIds.size, helpContent.articles.length);
  assert.equal(categoryIds.size, helpContent.categories.length);
  assert.ok(categoryIds.has("all"));
  helpContent.articles.forEach((article) => assert.ok(categoryIds.has(article.category), `${article.id}: categoria desconocida`));
});

test("cada guia incluye contenido operativo completo", () => {
  helpContent.articles.forEach((article) => {
    assert.ok(article.title && article.summary, `${article.id}: falta titulo o resumen`);
    assert.ok(article.audience?.length, `${article.id}: falta audiencia`);
    assert.ok(article.prerequisites?.length, `${article.id}: faltan requisitos`);
    assert.ok(article.steps?.length >= 4, `${article.id}: faltan pasos`);
    assert.ok(article.steps.every((step) => step.title && step.detail && step.impact), `${article.id}: paso incompleto`);
    assert.ok(article.impacts?.length >= 3, `${article.id}: faltan impactos`);
    assert.ok(article.caution && article.expected, `${article.id}: falta advertencia o resultado`);
    assert.ok(article.tags?.length >= 4, `${article.id}: faltan etiquetas de busqueda`);
    assert.ok(article.visualSteps?.length >= 4, `${article.id}: falta guion visual`);
    assert.ok(article.visualSteps.every((step) => step.label && step.focus && step.action), `${article.id}: guion visual incompleto`);
  });
});

test("todas las guias relacionadas existen", () => {
  helpContent.articles.forEach((article) => {
    (article.related || []).forEach((relatedId) => assert.ok(articleIds.has(relatedId), `${article.id}: relacionada inexistente ${relatedId}`));
  });
});

test("las capturas corresponden a la version actual y cubren todas las guias", () => {
  assert.equal(helpContent.interfaceVersion, packageData.version);
  assert.equal(mediaManifest.captureVersion, packageData.version);
  assert.deepEqual(new Set(Object.keys(mediaManifest.articles)), articleIds);

  const usedImages = new Set();
  helpContent.articles.forEach((article) => {
    const frames = mediaManifest.articles[article.id];
    assert.ok(frames.length >= 3, `${article.id}: faltan capturas reales`);
    frames.forEach((frame) => {
      assert.ok(frame.image && frame.caption, `${article.id}: captura sin imagen o texto`);
      assert.equal(frame.image, frame.image.split("/").at(-1), `${article.id}: ruta de captura invalida`);
      const screenshot = new URL(`../assets/help/source/${frame.image}`, import.meta.url);
      assert.ok(existsSync(screenshot), `${article.id}: falta captura ${frame.image}`);
      assert.ok(statSync(screenshot).size > 10_000, `${article.id}: captura vacia ${frame.image}`);
      assert.deepEqual(jpegDimensions(screenshot), mediaManifest.viewport, `${article.id}: viewport incorrecto ${frame.image}`);
      usedImages.add(frame.image);
    });
  });

  const sourceImages = readdirSync(new URL("../assets/help/source/", import.meta.url)).filter((name) => name.endsWith(".jpg"));
  assert.deepEqual([...usedImages].sort(), sourceImages.sort(), "hay capturas reales sin usar o sin documentar");
});

test("cada guia tiene GIF y poster offline validos", () => {
  helpContent.articles.forEach((article) => {
    const gif = new URL(`../assets/help/${article.id}.gif`, import.meta.url);
    const poster = new URL(`../assets/help/${article.id}-poster.png`, import.meta.url);
    assert.ok(existsSync(gif), `${article.id}: falta GIF`);
    assert.ok(existsSync(poster), `${article.id}: falta poster`);
    assert.ok(statSync(gif).size > 10_000, `${article.id}: GIF vacio o invalido`);
    assert.ok(statSync(poster).size > 5_000, `${article.id}: poster vacio o invalido`);
    assert.equal(readFileSync(gif, { length: 6 }).subarray(0, 3).toString("ascii"), "GIF", `${article.id}: cabecera GIF invalida`);
    assert.deepEqual([...readFileSync(poster, { length: 8 }).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${article.id}: cabecera PNG invalida`);
    assert.deepEqual(gifDimensions(gif), { width: 960, height: 540 }, `${article.id}: tamano GIF incorrecto`);
    assert.deepEqual(pngDimensions(poster), { width: 960, height: 540 }, `${article.id}: tamano poster incorrecto`);
  });
});
