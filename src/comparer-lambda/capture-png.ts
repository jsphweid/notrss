import { Browser, Page } from "puppeteer-core";
const scrollPageToBottom = require("puppeteer-autoscroll-down");

import { PNG } from "../services/png";

// Simply waiting for the network traffic to stop isn't always enough for sites
// to be fully rendered. Adding additional time for JS and animations to come to a
// stop will generate less fake diffs...
// const ADDITIONAL_SLEEP_SECONDS = 5;

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
  await page.waitForTimeout(1000);
  await page.addStyleTag({ content: noAnimations });
  const screenshot = await page.screenshot({ fullPage: true });
  const current = await PNG.fromBuffer(screenshot as Buffer);
  await waitTillHTMLRendered(page);
  await page.close();
  return current;
};
