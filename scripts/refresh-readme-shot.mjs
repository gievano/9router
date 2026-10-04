// Capture the README dashboard screenshot from a running instance.
// Used by .github/workflows/refresh-readme-shot.yml.
import puppeteer from "puppeteer";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:20128";
const PASSWORD = process.env.SHOT_PASSWORD || "";
const OUT = process.env.SHOT_OUT || "images/9router.png";
const PATHNAME = process.env.SHOT_PATH || "/dashboard";

if (!PASSWORD) {
  console.error("SHOT_PASSWORD is required");
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 45000 });
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.type('input[type="password"]', PASSWORD, { delay: 20 });
  await page.keyboard.press("Enter");

  await page.waitForFunction(() => location.pathname.startsWith("/dashboard"), {
    timeout: 20000,
  });
  await new Promise((r) => setTimeout(r, 1200));

  // The first-login "star on GitHub" dialog is driven by browser storage, so it
  // never appears on a fresh runner profile; belt and braces anyway.
  await page.evaluate(() => {
    localStorage.setItem("9router:welcomeNeverShow", "true");
    sessionStorage.removeItem("9router:justLoggedIn");
  });
  await page.reload({ waitUntil: "networkidle2", timeout: 45000 });
  await page.waitForFunction(() => location.pathname.startsWith("/dashboard"), {
    timeout: 20000,
  });
  await new Promise((r) => setTimeout(r, 1200));

  if (PATHNAME !== "/dashboard") {
    await page.goto(`${BASE}${PATHNAME}`, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });
    await new Promise((r) => setTimeout(r, 1500));
  }

  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 2500));

  await page.screenshot({ path: OUT, type: "png" });
  console.log("saved", OUT, "url", page.url());
} finally {
  await browser.close();
}
