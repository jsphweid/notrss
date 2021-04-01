import { Browser, Page } from "puppeteer-core";

import { PNG } from "../services/png";

const scrollPageToBottom = async (
  page: Page,
  scrollStep = 400,
  scrollDelay = 400
): Promise<void> =>
  // derived from https://github.com/mbalabash/puppeteer-autoscroll-down/blob/master/index.js
  // NOTE: there seems to be a limit to the height of a PNG
  page.evaluate(
    async (step, delay) => {
      const getScrollHeight = (element: any) => {
        if (!element) return 0;

        const { scrollHeight, offsetHeight, clientHeight } = element;
        return Math.max(scrollHeight, offsetHeight, clientHeight);
      };

      const timeout = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      await new Promise((resolve) => {
        const gotoBottom = async (start: number = 0): Promise<void> => {
          let count = start;
          let intervalId = setInterval(async () => {
            const { body } = document;
            let availableScrollHeight = getScrollHeight(body);

            window.scrollBy(0, step);
            count += step;

            // go a little bit over
            if (count >= availableScrollHeight + step) {
              clearInterval(intervalId);
              await timeout(2000);
              const possibleNewScrollHeight = getScrollHeight(body);
              if (possibleNewScrollHeight > availableScrollHeight) {
                await gotoBottom(count - step); // reset a bit
              } else {
                resolve(null);
              }
            }
          }, delay);
        };
        gotoBottom();
      });
    },
    scrollStep,
    scrollDelay
  );

const waitTillHTMLRendered = async (page: Page, timeout = 10000) => {
  // stolen from here: https://stackoverflow.com/a/61304202/4918389
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while (checkCounts++ <= maxChecks) {
    let html = await page.content();
    let currentHTMLSize = html.length;

    let bodyHTMLSize = await page.evaluate(
      () => document.body.innerHTML.length
    );

    if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
      countStableSizeIterations++;
    else countStableSizeIterations = 0; //reset the counter

    if (countStableSizeIterations >= minStableSizeIterations) {
      console.log("Page rendered fully..");
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
  }
};

const scrollPageToTop = (page: Page): Promise<void> =>
  page.evaluate((_) =>
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  );

const waitForNetworkIdle = (
  page: Page,
  timeout: number,
  maxInflightRequests = 0
): Promise<any> => {
  // stolen from https://stackoverflow.com/a/56011152/4918389

  const onRequestStarted = () => {
    ++inflight;
    if (inflight > maxInflightRequests) clearTimeout(timeoutId);
  };

  const onRequestFinished = () => {
    if (inflight === 0) return;
    --inflight;
    if (inflight === maxInflightRequests)
      timeoutId = setTimeout(onTimeoutDone, timeout);
  };

  page.on("request", onRequestStarted);
  page.on("requestfinished", onRequestFinished);
  page.on("requestfailed", onRequestFinished);

  let inflight = 0;
  let fulfill: Function | undefined;

  const onTimeoutDone = () => {
    page.off("request", onRequestStarted);
    page.off("requestfinished", onRequestFinished);
    page.off("requestfailed", onRequestFinished);
    if (fulfill) {
      fulfill();
    }
  };

  let promise = new Promise((x) => {
    fulfill = x;
  });
  let timeoutId = setTimeout(onTimeoutDone, timeout);
  return promise;
};

export const pageContainsYoutube = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    for (const iframe of document.getElementsByTagName("iframe")) {
      if (iframe.src.includes("youtube.com/embed")) {
        return true;
      }
    }
    return false;
  });

const noAnimations = `
*,
*::after,
*::before {
    transition-delay: 0s !important;
    transition-duration: 0s !important;
    animation-delay: -0.0001s !important;
    animation-duration: 0s !important;
    animation-play-state: paused !important;
    caret-color: transparent !important;
}
`;

export const capturePng = async (
  browser: Browser,
  site: string
): Promise<PNG.PNG> => {
  const page = await browser.newPage();
  await page.goto(site, { waitUntil: "networkidle0" });
  await scrollPageToBottom(page);
  await waitForNetworkIdle(page, 1000);
  await scrollPageToTop(page);
  await page.waitForTimeout((await pageContainsYoutube(page)) ? 15000 : 1000);
  await page.addStyleTag({ content: noAnimations });
  const screenshot = await page.screenshot({ fullPage: true });
  const current = await PNG.fromBuffer(screenshot as Buffer);
  await waitTillHTMLRendered(page);
  await page.close();
  return current;
};
