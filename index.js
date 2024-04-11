/**
 * Imports required
 */
const express = require("express");
const puppeteer = require("puppeteer-core");

/**
 * Creates html element tag with string
 * @param {string} tag
 * @param {object} attrs
 * @param {string} child
 */
const h = (tag, attrs = {}, child = "") => {
  return `<${tag} ${Object.keys(attrs)
    .map((key) => `${key}="${attrs[key]}"`)
    .join(" ")}>${child}</${tag}>`;
};

/**
 * Base HTML Template
 */
const BASE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
      {{styles}}
    </style>
</head>
<body>
    {{children}}
</body>
</html>
`.trim();

/**
 * New express server
 */
const app = express();

/**
 * GET /
 */
app.get("/", async (req, res) => {
  /**
   * Initializing pptr with browserless
   */
  const browser = await puppeteer.connect({
    browserWSEndpoint:
      "wss://orange-space-halibut-p994qj4j9g4hrvv4-3000.app.github.dev/?token=6R0W53R135510",
  });
  const page = await browser.newPage();
  const SITE = `https://${req.query.domain ?? "example.com"}`;

  /**
   * Demo website to further processing
   */
  await page.goto(SITE);

  /**
   * Processing Logic script goes here
   */
  const DATA = await page.evaluate((_) => {
    const bannedEls = ["STYLE", "SCRIPT"];
    const clonedElements = [];
    for (const el of document.querySelector(_).children) {
      if (!bannedEls.includes(el.tagName)) {
        let elData = {
          tagName: el.tagName.toLowerCase(),
          id: el.id ?? undefined,
          classList: [],
          hasChildNodes: el.hasChildNodes(),
          attributes: [],
          children: [],
          innerText: el.innerText,
          styles: [],
        };
        if (elData.tagName == "link") {
          const attrs = Array.from(el.attributes);
          attrs.forEach((a) => {
            elData.attributes.push({
              name: a.name,
              value: a.value,
            });
          });
          clonedElements.push(elData);
        } else if (!elData.hasChildNodes) {
          const elDocumentedStyles = window.getComputedStyle(el);
          for (let i = 0; i < elDocumentedStyles.length; i++) {
            let property = elDocumentedStyles[i];
            let value = elDocumentedStyles.getPropertyValue(property);
            elData.styles.push({
              name: property,
              value: value,
            });
          }
          elData.classList = Array.from(el.classList).map((cl) => cl) ?? [];
          elData.attributes = Array.from(el.attributes).map((atr) => {
            return {
              name: atr.name,
              value: atr.value,
            };
          });
          clonedElements.push(elData);
        } else {
          const furtherChilds = (A) => {
            let data = {
              tagName: A.tagName.toLowerCase(),
              id: A.id ?? undefined,
              classList: Array.from(A.classList).map((cl) => cl) ?? [],
              hasChildNodes: A.hasChildNodes(),
              attributes: Array.from(A.attributes).map((atr) => {
                return {
                  name: atr.name,
                  value: atr.value,
                };
              }),
              children: [],
              styles: [],
              innerText: A.innerText,
            };
            const elDocumentedStyles = window.getComputedStyle(A);
            for (let i = 0; i < elDocumentedStyles.length; i++) {
              let property = elDocumentedStyles[i];
              let value = elDocumentedStyles.getPropertyValue(property);
              elData.styles.push({
                name: property,
                value: value,
              });
            }
            if (!A.hasChildNodes()) return data;

            for (childEl of A.children) {
              data.children.push(furtherChilds(childEl));
            }
            return data;
          };

          clonedElements.push(furtherChilds(el));
        }
      }
    }
    return clonedElements;
  }, "body");

  /**
   *  Data Elements
   */
  let CLONED_HTML = ``;
  let CLONED_STYLES = ``;
  const IGNORED_TAGS = ["style"];

  /**
   * Rendering Logic
   */
  DATA.forEach((htmlNode) => {
    const processElement = (element) => {
      if (IGNORED_TAGS.includes(element.tagName)) return;

      const elementChildren = [element.innerText];
      element.children.forEach((e) => elementChildren.push(processElement(e)));

      let stylesOfEl = "";
      let metaOfEl = {};
      const elementUniqueID = crypto.randomUUID().replaceAll("-", "_");
      element.attributes.forEach((attr) => {
        if (attr.name.startsWith("data-") || attr.name == "class") return;
        metaOfEl[attr.name] = attr.value;
      });
      element.styles.forEach(
        (style) =>
          (stylesOfEl += `            ${style.name}: ${style.value};\n`),
      );
      metaOfEl.class = `${elementUniqueID}`;
      if (element.id.length !== 0) metaOfEl.id = element.id;

      if (stylesOfEl.trim().length !== 0)
        CLONED_STYLES += `\n        .${elementUniqueID} {\n${stylesOfEl}        }`;

      const clonedElement = h(
        element.tagName,
        metaOfEl,
        elementChildren.join(" "),
      );

      return clonedElement;
    };

    CLONED_HTML += processElement(htmlNode);
  });

  /**
   * Adding data to html template
   */
  const FINAL_HTML = BASE_HTML.replace(
    "{{children}}",
    CLONED_HTML.trim(),
  ).replace("{{styles}}", CLONED_STYLES.trim());

  /**
   * Closing browser after completing logic
   */
  browser.close();

  /**
   * Sends response
   */
  return res.send(FINAL_HTML);
});

/**
 * Starts express server
 */
app.listen(8080);
console.log("✅ Server Ready!");
