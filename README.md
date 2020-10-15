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

The script's output:

```
going to http://localhost:30000
{
  html: '<html><head></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">Hello, world!\n' +
    '</pre></body></html>'
}

--------------------------------------------------

going to http://fulfill-gzip
  > Accept-Encoding value is: undefined
  > All headers: {"Upgrade-Insecure-Requests":"1","User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/86.0.4240.0 Safari/537.36","Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"}
{
  html: '<html><head></head><body>\u001f�\b\be\u001c�_\u0003X~=@l9q5�H����Q(�/�IQ�\u0002\u0018�U{\u000e</body></html>'
}
```

## What does it mean?

It means that with `fulfillRequest` you can only return uncompressed data, which hurt some of our internal (and hopefully open source in the future) testing and performance measurement cases: transfer size is printed wrong when we replace resources — the resources we replace can't be compressed.
