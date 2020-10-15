# Chrome DevTools Protocol Bug: Ignoring Content-Encoding for Fulfilled Requests

## Short description

Seems that when intercepting requests using `Fetch.requestPaused` and then returning a compressed data in `Fetch.fulfillRequest` is being ignored, and the data isn't being uncompressed.

## See it in action

```
yarn
node index.js
```

The test case in [`index.js`](./index.js) does the following:

* Starts a simple HTTP server that responds to every request with [file.txt.gz](./file.txt.gz), and a `Content-Encoding: gzip` header.
* Starts a browser (using Puppeteer)
* `Fetch.enable` for every URL in the _request_ phase
  * If a request comes with a URL of `http://fulfill-gzip/`, it will respond with `Fetch.fulfillRequest` with the contents of `file.txt.gz` and a `Content-Encoding: gzip` header
  * Otherwise, it will `Fetch.continueRequest` for the provided requestId.
* We go to `http://localhost:30000` (our web server) and print the HTML we render from it
* We go to `http://fulfill-gzip` (our interception target) and print the HTML we render from it.
* Our expectation is that the two HTMLs will be equal, or at least, `fulfill-gzip` will return human readable text. This is not the case.

## What does it mean?

It means that with `fulfillRequest` you can only return uncompressed data, which hurt some of our internal (and hopefully open source in the future) testing and performance measurement cases: transfer size is printed wrong when we replace resources — the resources we replace can't be compressed.
