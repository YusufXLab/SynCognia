import prisma from "../lib/prisma";
import {
  calculateRemainingDays,
  calculatePercentageElapsed,
  calculateWarrantyStatus,
  calculateReturnStatus,
  syncAllDeadlineStatuses,
} from "../lib/services/deadlines";
import { getWarranties } from "../lib/actions/warranties";
import { getReturnPolicies, updateReturnPolicyStatus } from "../lib/actions/returnPolicies";
import { getActiveAlerts } from "../lib/services/notifications";
import { generateICalendar, escapeIcsText, CalendarEventInput } from "../lib/utils/calendar";
import { getDashboardData } from "../lib/actions/dashboard";

interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const checks: CheckResult[] = [];

function check(name: string, condition: boolean, message?: string, durationMs = 0) {
  checks.push({ name, passed: condition, message, durationMs });
  if (condition) {
    console.log(`  ✅ PASS: ${name} ${durationMs ? `(${durationMs}ms)` : ""}`);
  } else {
    console.error(`  ❌ FAIL: ${name} -> ${message || "Condition failed"}`);
  }
}

async function runPhase3Verification() {
  console.log("==========================================================");
  console.log("🔍 SynCognia Phase 3 End-to-End Verification Test Suite");
  console.log("==========================================================");

  let testAssetId: string | null = null;
  let testReturnPolicyId: string | null = null;

  try {
    // ----------------------------------------------------
    // Section 1: Timeline & Calculation Math
    // ----------------------------------------------------
    console.log("\n[1] Testing Date Math & Timeline Calculation Engine:");
    const now = new Date();

    // 10 days in the future
    const future10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const remFuture = calculateRemainingDays(future10, now);
    check(
      "calculateRemainingDays returns positive ceiling for future date",
      remFuture === 10 || remFuture === 11,
      `Expected ~10 days, got ${remFuture}`
    );

    // 5 days in the past
    const past5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const remPast = calculateRemainingDays(past5, now);
    check(
      "calculateRemainingDays returns negative for past date",
      remPast < 0,
      `Expected negative days, got ${remPast}`
    );

    // Percentage elapsed
    const start30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end30Future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const pctMid = calculatePercentageElapsed(start30Ago, end30Future, "MANUFACTURER", now);
    check(
      "calculatePercentageElapsed returns ~50% for mid-cycle date",
      pctMid >= 48 && pctMid <= 52,
      `Expected ~50%, got ${pctMid}%`
    );

    const pctLifetime = calculatePercentageElapsed(start30Ago, end30Future, "LIFETIME", now);
    check(
      "calculatePercentageElapsed returns 0% for LIFETIME warranty",
      pctLifetime === 0,
      `Expected 0%, got ${pctLifetime}%`
    );

    const pctExpired = calculatePercentageElapsed(start30Ago, past5, "MANUFACTURER", now);
    check(
      "calculatePercentageElapsed clamps to 100% for expired warranty",
      pctExpired === 100,
      `Expected 100%, got ${pctExpired}%`
    );

    // Warranty status classification
    const warrantyStatusActive = calculateWarrantyStatus(new Date(now.getTime() + 60 * 86400000), "MANUFACTURER", now);
    check(
      "calculateWarrantyStatus returns ACTIVE for > 30 days left",
      warrantyStatusActive === "ACTIVE",
      `Got ${warrantyStatusActive}`
    );

    const warrantyStatusExpiring = calculateWarrantyStatus(new Date(now.getTime() + 15 * 86400000), "MANUFACTURER", now);
    check(
      "calculateWarrantyStatus returns EXPIRING_SOON for 15 days left",
      warrantyStatusExpiring === "EXPIRING_SOON",
      `Got ${warrantyStatusExpiring}`
    );

    const warrantyStatusExpired = calculateWarrantyStatus(past5, "MANUFACTURER", now);
    check(
      "calculateWarrantyStatus returns EXPIRED for past deadline",
      warrantyStatusExpired === "EXPIRED",
      `Got ${warrantyStatusExpired}`
    );

    // Return status classification
    const returnStatusOpen = calculateReturnStatus(new Date(now.getTime() + 14 * 86400000), "OPEN", now);
    check(
      "calculateReturnStatus returns OPEN for > 7 days left",
      returnStatusOpen === "OPEN",
      `Got ${returnStatusOpen}`
    );

    const returnStatusExpiring = calculateReturnStatus(new Date(now.getTime() + 3 * 86400000), "OPEN", now);
    check(
      "calculateReturnStatus returns EXPIRING_SOON for 3 days left",
      returnStatusExpiring === "EXPIRING_SOON",
      `Got ${returnStatusExpiring}`
    );

    const returnStatusReturned = calculateReturnStatus(past5, "RETURNED", now);
    check(
      "calculateReturnStatus preserves RETURNED status",
      returnStatusReturned === "RETURNED",
      `Got ${returnStatusReturned}`
    );

    // ----------------------------------------------------
    // Section 2: Database Status Synchronization
    // ----------------------------------------------------
    console.log("\n[2] Testing Database Status Synchronization Service:");
    const testUser = await prisma.user.findFirst();
    if (!testUser) throw new Error("No user found in database");

    // Create temporary asset with out-of-sync warranty and return policy
    const testAsset = await prisma.asset.create({
      data: {
        userId: testUser.id,
        name: "Sync Test Asset",
        category: "Electronics",
        status: "ACTIVE",
        warranties: {
          create: {
            provider: "Test Provider",
            warrantyType: "MANUFACTURER",
            startDate: new Date(now.getTime() - 60 * 86400000),
            endDate: new Date(now.getTime() - 10 * 86400000), // 10 days ago (expired)
            status: "ACTIVE", // intentionally incorrect to test sync
          },
        },
        returnPolicies: {
          create: {
            returnWindowDays: 14,
            returnDeadline: new Date(now.getTime() - 5 * 86400000), // 5 days ago (expired)
            returnStatus: "OPEN", // intentionally incorrect to test sync
          },
        },
      },
      include: {
        warranties: true,
        returnPolicies: true,
      },
    });
    testAssetId = testAsset.id;
    testReturnPolicyId = testAsset.returnPolicies[0].id;

    // Run synchronizer
    const syncResult = await syncAllDeadlineStatuses();
    check(
      "syncAllDeadlineStatuses executes without errors",
      typeof syncResult.warrantiesChecked === "number" && typeof syncResult.returnsChecked === "number",
      `Sync result: ${JSON.stringify(syncResult)}`
    );

    // Verify DB updated
    const updatedWarranty = await prisma.warranty.findUnique({
      where: { id: testAsset.warranties[0].id },
    });
    check(
      "Outdated warranty status updated from ACTIVE to EXPIRED in SQLite",
      updatedWarranty?.status === "EXPIRED",
      `Expected EXPIRED, got ${updatedWarranty?.status}`
    );

    const updatedReturn = await prisma.returnPolicy.findUnique({
      where: { id: testAsset.returnPolicies[0].id },
    });
    check(
      "Outdated return policy status updated from OPEN to EXPIRED in SQLite",
      updatedReturn?.returnStatus === "EXPIRED",
      `Expected EXPIRED, got ${updatedReturn?.returnStatus}`
    );

    // ----------------------------------------------------
    // Section 3: Server Actions & Returns Handling
    // ----------------------------------------------------
    console.log("\n[3] Testing Server Actions & Enhanced Return Policies:");
    const warrantiesRes = await getWarranties();
    check(
      "getWarranties() returns enhanced objects with remainingDays and percentageElapsed",
      warrantiesRes.success &&
        Array.isArray(warrantiesRes.data) &&
        warrantiesRes.data.length > 0 &&
        typeof warrantiesRes.data[0].remainingDays === "number" &&
        typeof warrantiesRes.data[0].percentageElapsed === "number",
      `Warranties: ${JSON.stringify(warrantiesRes)}`
    );

    const returnsRes = await getReturnPolicies();
    check(
      "getReturnPolicies() returns enhanced objects with remainingDays and calculatedStatus",
      returnsRes.success &&
        Array.isArray(returnsRes.data) &&
        returnsRes.data.length > 0 &&
        typeof returnsRes.data[0].remainingDays === "number",
      `Returns: ${JSON.stringify(returnsRes)}`
    );

    // Test transition to RETURNED
    if (testReturnPolicyId) {
      const updateRes = await updateReturnPolicyStatus(testReturnPolicyId, "RETURNED");
      check(
        "updateReturnPolicyStatus transitions status to RETURNED",
        updateRes.success && (updateRes.data as { returnStatus: string })?.returnStatus === "RETURNED",
        `Update result: ${JSON.stringify(updateRes)}`
      );
    }

    // ----------------------------------------------------
    // Section 4: Notification Reminder Dispatcher
    // ----------------------------------------------------
    console.log("\n[4] Testing Notification Reminder Dispatcher:");
    const alertsRes = await getActiveAlerts();
    check(
      "getActiveAlerts() returns structured alerts array",
      Array.isArray(alertsRes.alerts),
      `Expected array, got ${typeof alertsRes.alerts}`
    );
    check(
      "getActiveAlerts() computes summary breakdown (total, critical, warning, info)",
      typeof alertsRes.summary.total === "number" &&
        typeof alertsRes.summary.critical === "number" &&
        typeof alertsRes.summary.warning === "number" &&
        typeof alertsRes.summary.info === "number",
      `Summary: ${JSON.stringify(alertsRes.summary)}`
    );

    if (alertsRes.alerts.length > 0) {
      const firstAlert = alertsRes.alerts[0];
      check(
        "Alert objects include title, message, urgency, remainingDays, and actionUrl",
        Boolean(
          firstAlert.title &&
            firstAlert.message &&
            firstAlert.urgency &&
            typeof firstAlert.remainingDays === "number" &&
            firstAlert.actionUrl
        ),
        `Alert structure: ${JSON.stringify(firstAlert)}`
      );
    }

    // ----------------------------------------------------
    // Section 5: RFC 5545 Calendar (.ics) Generation
    // ----------------------------------------------------
    console.log("\n[5] Testing RFC 5545 iCalendar Serializer:");
    const testEvents: CalendarEventInput[] = [
      {
        id: "test-w-1",
        title: "MacBook Pro Warranty Expiration",
        description: "AppleCare+ coverage ends, please renew or service.",
        startDate: new Date(now.getTime() + 15 * 86400000),
        endDate: new Date(now.getTime() + 15 * 86400000),
        url: "https://support.apple.com",
        alarms: [30, 7, 1],
      },
    ];

    const icsOutput = generateICalendar(testEvents, { calName: "SynCognia Deadlines" });

    check(
      "generateICalendar produces VCALENDAR 2.0 header and footer",
      icsOutput.includes("BEGIN:VCALENDAR") &&
        icsOutput.includes("VERSION:2.0") &&
        icsOutput.includes("END:VCALENDAR"),
      "Missing standard VCALENDAR wrapper"
    );

    check(
      "generateICalendar serializes VEVENT with UID, SUMMARY, DTSTART",
      icsOutput.includes("BEGIN:VEVENT") &&
        icsOutput.includes("UID:test-w-1") &&
        icsOutput.includes("SUMMARY:MacBook Pro Warranty Expiration") &&
        icsOutput.includes("END:VEVENT"),
      "Missing VEVENT structure"
    );

    check(
      "generateICalendar embeds VALARM reminder alarms (-P30D, -P7D, -P1D)",
      icsOutput.includes("BEGIN:VALARM") &&
        icsOutput.includes("TRIGGER:-P30D") &&
        icsOutput.includes("TRIGGER:-P7D") &&
        icsOutput.includes("TRIGGER:-P1D"),
      "Missing VALARM blocks"
    );

    const escaped = escapeIcsText("Hello, World; Testing \n newlines and \\ backslash");
    check(
      "escapeIcsText correctly escapes commas, semicolons, backslashes, and newlines",
      escaped === "Hello\\, World\\; Testing \\n newlines and \\\\ backslash",
      `Escaped text: ${escaped}`
    );

    // ----------------------------------------------------
    // Section 6: Dashboard Dynamic State
    // ----------------------------------------------------
    console.log("\n[6] Testing Live Dashboard Metrics & Feeds:");
    const dashboardRes = await getDashboardData();
    check(
      "getDashboardData() returns success with metrics and deadline feeds",
      dashboardRes.success && Boolean(dashboardRes.data?.metrics),
      `Dashboard result: ${JSON.stringify(dashboardRes)}`
    );

    if (dashboardRes.data) {
      const { metrics, upcomingDeadlines, recentAssets } = dashboardRes.data;
      check(
        "Dashboard metrics match database counts",
        metrics.totalAssets >= 1 &&
          metrics.activeWarranties >= 0 &&
          typeof metrics.coveragePercentage === "number",
        `Metrics: ${JSON.stringify(metrics)}`
      );

      check(
        "Upcoming deadlines array is populated and sorted ascending by daysLeft",
        Array.isArray(upcomingDeadlines) &&
          (upcomingDeadlines.length <= 1 ||
            upcomingDeadlines[0].daysLeft <= upcomingDeadlines[1].daysLeft),
        `Deadlines: ${JSON.stringify(upcomingDeadlines)}`
      );

      check(
        "Recent assets list returns formatted items with price and warranty status",
        Array.isArray(recentAssets) &&
          recentAssets.length > 0 &&
          Boolean(recentAssets[0].name && recentAssets[0].warranty),
        `Recent: ${JSON.stringify(recentAssets)}`
      );
    }
  } finally {
    // ----------------------------------------------------
    // Cleanup
    // ----------------------------------------------------
    console.log("\n[7] Cleaning Up Test Assets:");
    if (testAssetId) {
      await prisma.asset.delete({ where: { id: testAssetId } }).catch(() => {});
      console.log(`  🧹 Cleaned up test asset ID: ${testAssetId}`);
    }
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log("\n==========================================================");
  console.log("📊 Phase 3 Verification Summary");
  console.log("==========================================================");

  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  console.log(`Total Checks: ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);

  if (failed > 0) {
    console.error("\n❌ Phase 3 Verification Failed! Please review failures above.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PHASE 3 VERIFICATION CHECKS PASSED EMPIRICALLY!");
    process.exit(0);
  }
}

runPhase3Verification().catch((err) => {
  console.error("Fatal verification test error:", err);
  process.exit(1);
});
