/**
 * Inlines the single-file build into one HTML document for publishing.
 * Run after: npx vite build --config vite.config.artifact.js
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const dir = "dist-artifact/assets";
const files = readdirSync(dir);
const js = readFileSync(`${dir}/${files.find((f) => f.endsWith(".js"))}`, "utf8");
const css = readFileSync(`${dir}/${files.find((f) => f.endsWith(".css"))}`, "utf8");

// A closing script tag inside bundled string data would end the block early.
const safeJs = js.replace(/<\/script/gi, "<\\/script");

const html = `<title>Is my product tariffed?</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

writeFileSync("dist-artifact/tariff-checker.html", html);
console.log("wrote dist-artifact/tariff-checker.html");
console.log("size:", (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), "MB");
