import { expect, test, type Page } from "@playwright/test";

const host = "127.0.0.1";
const userWebUrl = `http://${host}:${process.env.USER_WEB_PORT ?? 5187}`;
const therapistWebUrl = `http://${host}:${process.env.THERAPIST_WEB_PORT ?? 5186}`;
const adminWebUrl = `http://${host}:${process.env.ADMIN_WEB_PORT ?? 5188}`;

interface VisualCase {
  name: string;
  url: string;
  selectors: string[];
}

const desktopCases: VisualCase[] = [
  {
    name: "unified-auth-portal",
    url: `${userWebUrl}/`,
    selectors: [".ncr-auth-background", ".ncr-role-entrance-card", ".ncr-login-glass-panel"]
  },
  {
    name: "trainee-cognitive-cockpit",
    url: `${userWebUrl}/trainee/dashboard?ncrDemo=1&ncrDemoRole=trainee`,
    selectors: [
      ".ncr-training-mission-card",
      ".ncr-eeg-wave-canvas",
      ".ncr-cognitive-status-ring",
      ".ncr-demo-mode-badge"
    ]
  },
  {
    name: "parent-training-brief",
    url: `${userWebUrl}/parent/dashboard?ncrDemo=1&ncrDemoRole=parent`,
    selectors: [
      ".parent-brief-header.ncr-glass-card",
      ".ncr-medical-metric-card",
      ".parent-brief-card.ncr-glass-card",
      ".ncr-demo-mode-badge"
    ]
  },
  {
    name: "therapist-command-center",
    url: `${therapistWebUrl}/therapist/dashboard?ncrDemo=1&ncrDemoRole=therapist`,
    selectors: [
      ".ncr-therapist-command-panel",
      ".ncr-medical-chart-container",
      ".ncr-patient-risk-badge"
    ]
  },
  {
    name: "admin-medical-workspace",
    url: `${adminWebUrl}/admin/dashboard?ncrDemo=1&ncrDemoRole=org_admin`,
    selectors: [
      ".admin-hero.ncr-glass-card",
      ".ncr-medical-metric-card",
      ".ncr-medical-chart-container",
      ".ncr-system-health-indicator"
    ]
  },
  {
    name: "training-safety-shell",
    url: `${userWebUrl}/trainee/reaction?ncrDemo=1&ncrDemoRole=trainee`,
    selectors: [
      ".ncr-training-session",
      ".ncr-training-topbar",
      ".ncr-training-focus-stage",
      ".ncr-training-side-monitor"
    ]
  }
];

const mobileCases: VisualCase[] = [
  {
    name: "unified-auth-portal",
    url: `${userWebUrl}/`,
    selectors: [".ncr-auth-background", ".ncr-role-entrance-card", ".ncr-login-glass-panel"]
  },
  {
    name: "trainee-cognitive-cockpit",
    url: `${userWebUrl}/trainee/dashboard?ncrDemo=1&ncrDemoRole=trainee`,
    selectors: [".ncr-training-mission-card", ".ncr-eeg-wave-canvas", ".ncr-demo-mode-badge"]
  },
  {
    name: "admin-medical-workspace",
    url: `${adminWebUrl}/admin/dashboard?ncrDemo=1&ncrDemoRole=org_admin`,
    selectors: [".admin-hero.ncr-glass-card", ".ncr-system-health-indicator"]
  }
];

const restrictedClinicalTerms = ["确诊", "治愈", "疗效保证", "治疗承诺"];

test.describe("medical platform visual consistency", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  for (const visualCase of desktopCases) {
    test(`desktop visual shell: ${visualCase.name}`, async ({ page }, testInfo) => {
      await openAndCheckVisualCase(page, visualCase);

      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`${visualCase.name}-desktop.png`)
      });
    });
  }

  test("mobile shells keep core medical platform structure usable", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const visualCase of mobileCases) {
      await openAndCheckVisualCase(page, visualCase);

      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`${visualCase.name}-mobile.png`)
      });
    }
  });
});

async function openAndCheckVisualCase(page: Page, visualCase: VisualCase): Promise<void> {
  await page.goto(visualCase.url);
  await page.waitForLoadState("domcontentloaded");

  for (const selector of visualCase.selectors) {
    await expect(
      page.locator(selector).first(),
      `${visualCase.name} should render ${selector}`
    ).toBeVisible();
  }

  const bodyText = await page.locator("body").innerText();
  for (const term of restrictedClinicalTerms) {
    expect(bodyText, `${visualCase.name} should not contain ${term}`).not.toContain(term);
  }

  const unsafeAnimationStyles = await page.evaluate(() => {
    const styleText = Array.from(document.querySelectorAll("style"))
      .map((style) => style.textContent ?? "")
      .join("\n")
      .toLowerCase();

    return /#ff0000|strobe|animation:\s*blink|animation-name:\s*blink/.test(styleText);
  });

  expect(unsafeAnimationStyles, `${visualCase.name} should avoid unsafe flash styles`).toBe(false);
}
