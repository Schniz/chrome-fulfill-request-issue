const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

function readGzippedFile() {
  const buffer = fs.readFileSync(path.join(__dirname, "./file.txt.gz"));
  return buffer;
}

function createSimpleCompressingServer() {
  const gzippedFile = readGzippedFile();
  const server = require("http").createServer((_req, res) => {
    res.writeHead(200, {
      "Content-Encoding": "gzip",
    });
    res.write(gzippedFile);
    res.end();
  });
  return server.listen(30000);
}

async function main() {
  const server = createSimpleCompressingServer();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const cdpSession = await page.target().createCDPSession();

  await cdpSession.send("Fetch.enable", {
    patterns: [
      {
        urlPattern: "*",
        requestStage: "Request",
      },
    ],
  });

  await cdpSession.on(
    "Fetch.requestPaused",
    /**
     * @param {import('devtools-protocol').Protocol.Fetch.RequestPausedEvent} event
     */
    async function intercept(event) {
      if (event.request.url === "http://fulfill-gzip/") {
        console.log(
          `  > Accept-Encoding value is:`,
          event.request.headers["accept-encoding"] ||
            event.request.headers["Accept-Encoding"]
        ); // => undefined, for some reason.
        console.log(`  > All headers:`, JSON.stringify(event.request.headers));

        const gzippedFile = readGzippedFile();

        await cdpSession.send("Fetch.fulfillRequest", {
          requestId: event.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "connection", value: "close" },
            { name: "content-type", value: "text/html; charset=utf-8" },
            { name: "date", value: "Thu, 15 Oct 2020 09:16:23 GMT" },
            { name: "content-encoding", value: "gzip" },
          ],
          body: gzippedFile.toString("base64"),
        });
        return;
      }

      await cdpSession.send("Fetch.continueRequest", {
        requestId: event.requestId,
      });
    }
  );

  console.log('browser version: ', await browser.version());

  console.log("going to http://localhost:30000");
  await page.goto("http://localhost:30000");
  console.log({
    html: await page.evaluate(
      () => window.document.querySelector("html").outerHTML
    ),
  });

  console.log();
  console.log('--------------------------------------------------')
  console.log();

  console.log("going to http://fulfill-gzip");
  await page.goto("http://fulfill-gzip");
  console.log({
    html: await page.evaluate(
      () => window.document.querySelector("html").outerHTML
    ),
  });

  await page.close();
  await browser.close();
  server.close();
}

main();

