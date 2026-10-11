import { expect, test, type Page } from "@playwright/test";

import { createMockTrainingUser, mvpE2eMock } from "./mocks/mvp-flow.mock.js";

const userWebUrl = `http://127.0.0.1:${process.env.USER_WEB_PORT ?? 5187}`;
const therapistWebUrl = `http://127.0.0.1:${process.env.THERAPIST_WEB_PORT ?? 5186}`;

test.describe("MVP training flow", () => {
  test("completes therapist prescription, user training, record saving, and therapist report review", async ({
    page
  }) => {
    await test.step("1. 治疗师登录", async () => {
      await page.goto(demoWorkspaceUrl(therapistWebUrl, "/therapist/dashboard", "therapist"));

      await expect(page.getByRole("heading", { name: /康复数据指挥中心/ })).toBeVisible();
      await expect(page.getByText(/陈老师/).first()).toBeVisible();
      await expect(page.getByText(/用户训练状态分布|下方用户列表/).first()).toBeVisible();
    });

    await test.step("2. 创建训练用户", async () => {
      const createdUser = createMockTrainingUser();
      expect(createdUser.guardianConsentAccepted).toBe(true);
      expect(createdUser.trainingGoal).toContain("注意稳定性");

      const traineeRow = getTraineeRow(page);
      await expect(traineeRow).toBeVisible();
      await expect(traineeRow).toContainText(createdUser.ageRange);
    });

    await test.step("3. 创建训练处方", async () => {
      await getTraineeRow(page).getByRole("button", { name: "处方" }).click();

      await expect(page.getByRole("heading", { name: /设置训练安排/ })).toBeVisible();
      await page
        .getByLabel("每周训练次数")
        .fill(String(mvpE2eMock.prescription.weeklySessionCount));
      await page
        .getByLabel("单次训练时长")
        .fill(String(mvpE2eMock.prescription.sessionDurationMinutes));
      await page
        .getByLabel("每日最大训练时长")
        .fill(String(mvpE2eMock.prescription.dailyMaxTrainingMinutes));
      await page.getByLabel("音乐类型").selectOption(mvpE2eMock.prescription.musicType);
      await page.getByLabel("初始难度").selectOption(mvpE2eMock.prescription.initialDifficulty);

      await page.getByLabel(/音乐放松/).check();
      await page.getByLabel(/注意力训练/).check();
      await page.getByLabel(/Go\/No-Go 点击练习/).check();
      await page.getByLabel(/节律导航/).check();
      await page.getByLabel("备注内容").fill(mvpE2eMock.prescription.therapistNote);
      await page.getByRole("button", { name: "保存训练处方" }).click();

      await expect(page.getByText(/已保存 .* 的辅助训练安排/)).toBeVisible();
      await expect(page.getByText(/处方变更记录/)).toBeVisible();
    });

    await test.step("4. 用户登录", async () => {
      await page.goto(demoWorkspaceUrl(userWebUrl, "/trainee/dashboard", "trainee"));

      await expect(page.getByRole("heading", { name: /认知训练舱/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /开始今日训练|开始训练/ })).toBeEnabled();
    });

    await test.step("5. 连接EEG模拟器", async () => {
      expect(mvpE2eMock.eegSimulator.connectionState).toBe("connected");
      expect(
        mvpE2eMock.eegSimulator.frames.every(
          (frame) => frame.signalQuality >= 80 && frame.artifactLevel < 20
        )
      ).toBe(true);

      await expect(page.getByText(/设备连接正常|信号稳定/).first()).toBeVisible();
      await expect(page.getByText(/信号质量|数据延迟/).first()).toBeVisible();
    });

    await test.step("6-10. 完成训练模块并保存训练记录", async () => {
      await page.getByRole("button", { name: /开始今日训练|开始训练/ }).click();
      await acceptConsentIfRequired(page);

      await expect(page.getByText("单次训练总流程")).toBeVisible();
      await completeCurrentStage(page, "登录与身份确认");
      await completeCurrentStage(page, "EEG设备检查");
      await completeCurrentStage(page, "静息基线采集");
      await completeCurrentStage(page, "音乐疗愈");
      await completeCurrentStage(page, "注意力训练");
      await completeCurrentStage(page, "Go/No-Go训练");
      await completeCurrentStage(page, "节律导航训练");
      await completeCurrentStage(page, "训练总结");
      await completeCurrentStage(page, "保存训练记录");

      await expect(page.getByRole("heading", { name: /本次训练完成了/ })).toBeVisible();
      await page.getByRole("button", { name: "保存为训练记录" }).click();
      await expect(page.getByText(/训练记录草稿已生成|训练记录已提交/)).toBeVisible();
      await expect(
        page.getByText(new RegExp(`共 ${mvpE2eMock.session.expectedSavedStageCount} 条阶段结果`))
      ).toBeVisible();
    });

    await test.step("11. 治疗师查看报告", async () => {
      await page.goto(demoWorkspaceUrl(therapistWebUrl, "/therapist/dashboard", "therapist"));
      await getTraineeRow(page).getByRole("button", { name: "详情" }).click();

      await expect(page.getByRole("heading", { name: /的训练记录/ })).toBeVisible();
      await expect(page.getByText(/注意力趋势|反应时趋势|EEG注意/).first()).toBeVisible();
      await page.getByRole("button", { name: "生成周报" }).click();
      await expect(page.getByText("周报草稿")).toBeVisible();
      await expect(page.getByText(/下周建议/)).toBeVisible();
    });
  });
});

function getTraineeRow(page: Page) {
  return page
    .locator("section[aria-labelledby='advanced-patient-table']")
    .getByRole("row")
    .filter({ hasText: mvpE2eMock.trainee.displayName })
    .first();
}

async function completeCurrentStage(page: Page, expectedStageTitle: string): Promise<void> {
  await expect(page.locator("#active-stage")).toContainText(expectedStageTitle);
  await page.locator(".flow-actions .primary-action").click();
}

async function acceptConsentIfRequired(page: Page): Promise<void> {
  const consentCheckbox = page.locator(".consent-checkbox input");
  const isConsentVisible = await consentCheckbox
    .waitFor({ state: "visible", timeout: 1500 })
    .then(() => true)
    .catch(() => false);

  if (!isConsentVisible) {
    return;
  }

  await consentCheckbox.check();
  await page.getByRole("button", { name: "同意并进入训练" }).click();
}

function demoWorkspaceUrl(baseUrl: string, path: string, role: "trainee" | "therapist"): string {
  const url = new URL(path, baseUrl);
  url.searchParams.set("ncrDemo", "1");
  url.searchParams.set("ncrDemoRole", role);
  return url.toString();
}
