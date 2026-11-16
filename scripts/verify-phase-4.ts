import prisma from "../lib/prisma";
import {
  addMonthsSafely,
  calculateRemainingDays,
  calculateRemainingMileage,
  calculateProgressPercentage,
  calculateMaintenanceStatus,
  enhanceMaintenanceSchedule,
  advanceRecurrenceCycle,
} from "../lib/services/maintenanceEngine";
import {
  getMaintenanceSchedules,
  getMaintenanceScheduleById,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  logServiceCompleted,
  getMaintenanceLogs,
  getMaintenanceSummaryMetrics,
} from "../lib/actions/maintenance";
import { getDashboardData } from "../lib/actions/dashboard";
import { GET as getApiSchedules, POST as postApiSchedule } from "../app/api/maintenance/route";
import {
  GET as getApiScheduleById,
  PATCH as patchApiSchedule,
  DELETE as deleteApiSchedule,
} from "../app/api/maintenance/[id]/route";
import { NextRequest } from "next/server";

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

async function runPhase4Verification() {
  console.log("==========================================================");
  console.log("🔍 SynCognia Phase 4 End-to-End Verification Test Suite");
  console.log("==========================================================");

  let testAssetId: string | null = null;
  let testScheduleId: string | null = null;

  try {
    // ----------------------------------------------------
    // Section 1: Date & Interval Math
    // ----------------------------------------------------
    console.log("\n[1] Testing Date Math & Interval Engine:");

    // addMonthsSafely: standard addition
    const jan15 = new Date(2026, 0, 15);
    const apr15 = addMonthsSafely(jan15, 3);
    check(
      "addMonthsSafely adds standard 3 months accurately",
      apr15.getFullYear() === 2026 && apr15.getMonth() === 3 && apr15.getDate() === 15,
      `Expected 2026-04-15, got ${apr15.toISOString()}`
    );

    // addMonthsSafely: month-end clamping (Jan 31 + 1 month -> Feb 28 in non-leap 2026)
    const jan31 = new Date(2026, 0, 31);
    const feb28 = addMonthsSafely(jan31, 1);
    check(
      "addMonthsSafely clamps Jan 31 + 1 month to Feb 28 in non-leap year",
      feb28.getFullYear() === 2026 && feb28.getMonth() === 1 && feb28.getDate() === 28,
      `Expected 2026-02-28, got ${feb28.toISOString()}`
    );

    // addMonthsSafely: month-end clamping in leap year (Jan 31 2024 + 1 month -> Feb 29 2024)
    const jan31Leap = new Date(2024, 0, 31);
    const feb29 = addMonthsSafely(jan31Leap, 1);
    check(
      "addMonthsSafely clamps Jan 31 + 1 month to Feb 29 in leap year",
      feb29.getFullYear() === 2024 && feb29.getMonth() === 1 && feb29.getDate() === 29,
      `Expected 2024-02-29, got ${feb29.toISOString()}`
    );

    // addMonthsSafely: year rollover (Nov 15 + 3 months -> Feb 15 next year)
    const nov15 = new Date(2026, 10, 15);
    const feb15Next = addMonthsSafely(nov15, 3);
    check(
      "addMonthsSafely handles year rollover (Nov 15 + 3mo -> Feb 15)",
      feb15Next.getFullYear() === 2027 && feb15Next.getMonth() === 1 && feb15Next.getDate() === 15,
      `Expected 2027-02-15, got ${feb15Next.toISOString()}`
    );

    // calculateRemainingDays
    const refNow = new Date();
    const future14 = new Date(refNow.getTime() + 14 * 86400000);
    const daysFuture = calculateRemainingDays(future14, refNow);
    check(
      "calculateRemainingDays returns positive ceiling for future date",
      daysFuture === 14 || daysFuture === 15,
      `Expected ~14 days, got ${daysFuture}`
    );

    const past4 = new Date(refNow.getTime() - 4 * 86400000);
    const daysPast = calculateRemainingDays(past4, refNow);
    check(
      "calculateRemainingDays returns negative number for past date",
      daysPast !== null && daysPast < 0,
      `Expected negative days, got ${daysPast}`
    );

    check(
      "calculateRemainingDays returns null for null/undefined date",
      calculateRemainingDays(null) === null && calculateRemainingDays(undefined) === null,
      "Expected null for missing dates"
    );

    // ----------------------------------------------------
    // Section 2: Mileage Tracking & Distance Remaining
    // ----------------------------------------------------
    console.log("\n[2] Testing Mileage Tracking & Distance Remaining Engine:");

    // 20,000 + 5,000 vs 24,000 -> 1,000 mi remaining
    const remMiles1 = calculateRemainingMileage(20000, 5000, 24000);
    check(
      "calculateRemainingMileage calculates 1,000 miles remaining for 24,000 mi vs 25,000 target",
      remMiles1 === 1000,
      `Expected 1000, got ${remMiles1}`
    );

    // Exceeded mileage: 20,000 + 5,000 vs 25,600 -> -600 mi (overdue)
    const remMilesExceeded = calculateRemainingMileage(20000, 5000, 25600);
    check(
      "calculateRemainingMileage returns negative remaining miles when exceeded (-600)",
      remMilesExceeded === -600,
      `Expected -600, got ${remMilesExceeded}`
    );

    // Baseline fallback when lastServiceMileage is null (uses currentMileage as baseline)
    const remMilesNoBaseline = calculateRemainingMileage(null, 3000, 15000);
    check(
      "calculateRemainingMileage uses currentMileage as baseline when lastServiceMileage is null",
      remMilesNoBaseline === 3000,
      `Expected 3000, got ${remMilesNoBaseline}`
    );

    check(
      "calculateRemainingMileage returns null if interval or current mileage is missing",
      calculateRemainingMileage(20000, null, 24000) === null &&
        calculateRemainingMileage(20000, 5000, null) === null,
      "Expected null for missing inputs"
    );

    // calculateProgressPercentage
    const progress50 = calculateProgressPercentage({
      lastServiceMileage: 20000,
      intervalMileage: 5000,
      currentMileage: 22500,
    });
    check(
      "calculateProgressPercentage returns 50% for midway mileage progress",
      progress50 === 50,
      `Expected 50%, got ${progress50}%`
    );

    // ----------------------------------------------------
    // Section 3: Status Classification Rules & Priority Precedence
    // ----------------------------------------------------
    console.log("\n[3] Testing Status Classification Rules & Priority Precedence:");

    // Calendar statuses
    const statusCalendarUpcoming = calculateMaintenanceStatus({ remainingDays: 30 });
    check(
      "calculateMaintenanceStatus: > 14 days remaining -> UPCOMING",
      statusCalendarUpcoming === "UPCOMING",
      `Expected UPCOMING, got ${statusCalendarUpcoming}`
    );

    const statusCalendarDue = calculateMaintenanceStatus({ remainingDays: 10 });
    check(
      "calculateMaintenanceStatus: <= 14 days remaining -> DUE",
      statusCalendarDue === "DUE",
      `Expected DUE, got ${statusCalendarDue}`
    );

    const statusCalendarOverdue = calculateMaintenanceStatus({ remainingDays: -2 });
    check(
      "calculateMaintenanceStatus: < 0 days remaining -> OVERDUE",
      statusCalendarOverdue === "OVERDUE",
      `Expected OVERDUE, got ${statusCalendarOverdue}`
    );

    // Mileage statuses
    const statusMileageUpcoming = calculateMaintenanceStatus({ remainingMileage: 1200 });
    check(
      "calculateMaintenanceStatus: > 500 miles remaining -> UPCOMING",
      statusMileageUpcoming === "UPCOMING",
      `Expected UPCOMING, got ${statusMileageUpcoming}`
    );

    const statusMileageDue = calculateMaintenanceStatus({ remainingMileage: 350 });
    check(
      "calculateMaintenanceStatus: <= 500 miles remaining -> DUE",
      statusMileageDue === "DUE",
      `Expected DUE, got ${statusMileageDue}`
    );

    const statusMileageOverdue = calculateMaintenanceStatus({ remainingMileage: -50 });
    check(
      "calculateMaintenanceStatus: < 0 miles remaining -> OVERDUE",
      statusMileageOverdue === "OVERDUE",
      `Expected OVERDUE, got ${statusMileageOverdue}`
    );

    // Priority Precedence Matrix
    // Overdue mileage + upcoming date -> OVERDUE
    const statusOverdueMilesUpcomingDate = calculateMaintenanceStatus({
      remainingDays: 45,
      remainingMileage: -100,
    });
    check(
      "Priority precedence: Overdue mileage + upcoming date -> OVERDUE",
      statusOverdueMilesUpcomingDate === "OVERDUE",
      `Expected OVERDUE, got ${statusOverdueMilesUpcomingDate}`
    );

    // Overdue date + upcoming mileage -> OVERDUE
    const statusOverdueDateUpcomingMiles = calculateMaintenanceStatus({
      remainingDays: -5,
      remainingMileage: 3000,
    });
    check(
      "Priority precedence: Overdue date + upcoming mileage -> OVERDUE",
      statusOverdueDateUpcomingMiles === "OVERDUE",
      `Expected OVERDUE, got ${statusOverdueDateUpcomingMiles}`
    );

    // Due date + upcoming mileage -> DUE
    const statusDueDateUpcomingMiles = calculateMaintenanceStatus({
      remainingDays: 8,
      remainingMileage: 4000,
    });
    check(
      "Priority precedence: Due date + upcoming mileage -> DUE",
      statusDueDateUpcomingMiles === "DUE",
      `Expected DUE, got ${statusDueDateUpcomingMiles}`
    );

    // Due mileage + upcoming date -> DUE
    const statusDueMilesUpcomingDate = calculateMaintenanceStatus({
      remainingDays: 60,
      remainingMileage: 250,
    });
    check(
      "Priority precedence: Due mileage + upcoming date -> DUE",
      statusDueMilesUpcomingDate === "DUE",
      `Expected DUE, got ${statusDueMilesUpcomingDate}`
    );

    // Explicitly completed -> COMPLETED
    const statusCompleted = calculateMaintenanceStatus({
      remainingDays: -10,
      isExplicitlyCompleted: true,
    });
    check(
      "Priority precedence: isExplicitlyCompleted takes precedence -> COMPLETED",
      statusCompleted === "COMPLETED",
      `Expected COMPLETED, got ${statusCompleted}`
    );

    // ----------------------------------------------------
    // Section 4: Recurrence Advancement Cycle
    // ----------------------------------------------------
    console.log("\n[4] Testing Recurrence Cycle Advancement Math:");

    const sampleSchedule = {
      intervalMonths: 6,
      intervalMileage: 5000,
      lastServiceDate: new Date("2026-01-01"),
      nextServiceDate: new Date("2026-07-01"),
      lastServiceMileage: 20000,
      currentMileage: 25200,
      lastServiceCost: 65,
    };

    const completionServiceDate = new Date("2026-07-02");
    const advancementResult = advanceRecurrenceCycle(sampleSchedule, {
      serviceDate: completionServiceDate,
      mileage: 25250,
      cost: 95.50,
    });

    check(
      "advanceRecurrenceCycle updates lastServiceDate to completion date",
      advancementResult.lastServiceDate.getTime() === completionServiceDate.getTime(),
      `Expected ${completionServiceDate.toISOString()}, got ${advancementResult.lastServiceDate.toISOString()}`
    );

    const expectedNextServiceDate = addMonthsSafely(completionServiceDate, 6);
    check(
      "advanceRecurrenceCycle projects nextServiceDate = completionDate + 6 months",
      advancementResult.nextServiceDate?.toISOString() === expectedNextServiceDate.toISOString(),
      `Expected ${expectedNextServiceDate.toISOString()}, got ${advancementResult.nextServiceDate?.toISOString()}`
    );

    check(
      "advanceRecurrenceCycle updates lastServiceMileage and currentMileage to new mileage (25,250)",
      advancementResult.lastServiceMileage === 25250 && advancementResult.currentMileage === 25250,
      `Mileage: ${advancementResult.lastServiceMileage}`
    );

    check(
      "advanceRecurrenceCycle updates lastServiceCost to new cost ($95.50)",
      advancementResult.lastServiceCost === 95.50,
      `Cost: ${advancementResult.lastServiceCost}`
    );

    check(
      "advanceRecurrenceCycle resets status to UPCOMING for fresh cycle",
      advancementResult.status === "UPCOMING",
      `Expected UPCOMING, got ${advancementResult.status}`
    );

    // Non-recurring schedule advances to COMPLETED
    const oneOffSchedule = {
      intervalMonths: null,
      intervalMileage: null,
      lastServiceDate: null,
      nextServiceDate: new Date("2026-06-01"),
    };
    const oneOffResult = advanceRecurrenceCycle(oneOffSchedule, {
      serviceDate: new Date("2026-06-01"),
      cost: 50,
    });
    check(
      "advanceRecurrenceCycle marks non-recurring schedule as COMPLETED",
      oneOffResult.status === "COMPLETED",
      `Expected COMPLETED, got ${oneOffResult.status}`
    );

    // ----------------------------------------------------
    // Section 5: End-to-End Database Operations & Server Actions
    // ----------------------------------------------------
    console.log("\n[5] Testing End-to-End Database Operations & Server Actions:");

    // Find default user
    const testUser = await prisma.user.findFirst();
    if (!testUser) throw new Error("No user found in database");

    // 1. Create a temporary asset
    const testAsset = await prisma.asset.create({
      data: {
        userId: testUser.id,
        name: "Phase 4 Verification Test Vehicle",
        category: "Vehicles",
        brand: "Toyota",
        modelNumber: "RAV4 Hybrid",
        serialNumber: "JTMBP3FV9ND000000",
        purchaseDate: new Date("2024-05-10"),
        purchasePrice: 34500,
        currency: "USD",
        location: "Garage",
        status: "ACTIVE",
        notes: "Automated test asset for Phase 4 verification",
      },
    });
    testAssetId = testAsset.id;
    console.log(`  Created temporary test asset: ${testAsset.name} (${testAsset.id})`);

    // 2. Create Maintenance Schedule via Server Action
    const createRes = await createMaintenanceSchedule({
      assetId: testAsset.id,
      title: "Synthetic Oil Change & Multi-Point Inspection",
      intervalMonths: 6,
      intervalMileage: 5000,
      lastServiceMileage: 10000,
      currentMileage: 14850, // 150 miles left -> should classify as DUE
      notes: "Verify 0W-16 engine oil and filter",
    });

    check(
      "createMaintenanceSchedule successfully creates record and returns enhanced schedule",
      createRes.success && Boolean(createRes.data?.id),
      `Create result: ${JSON.stringify(createRes)}`
    );

    if (createRes.data) {
      testScheduleId = createRes.data.id;
      check(
        "createMaintenanceSchedule calculates status as DUE (remainingMileage = 150 <= 500)",
        createRes.data.calculatedStatus === "DUE" && createRes.data.remainingMileage === 150,
        `Expected DUE with 150 mi left, got ${createRes.data.calculatedStatus} with ${createRes.data.remainingMileage} mi left`
      );
    }

    // 3. Query schedules via getMaintenanceSchedules
    if (testScheduleId) {
      const getSchedulesRes = await getMaintenanceSchedules({ assetId: testAsset.id });
      check(
        "getMaintenanceSchedules retrieves schedule by assetId with enhanced fields",
        getSchedulesRes.success &&
          Array.isArray(getSchedulesRes.data) &&
          getSchedulesRes.data.length === 1 &&
          getSchedulesRes.data[0].id === testScheduleId &&
          typeof getSchedulesRes.data[0].progressPercentage === "number",
        `Query schedules: ${JSON.stringify(getSchedulesRes)}`
      );

      // 4. Query schedule by ID
      const getByIdRes = await getMaintenanceScheduleById(testScheduleId);
      check(
        "getMaintenanceScheduleById retrieves individual schedule with asset relationship",
        getByIdRes.success &&
          getByIdRes.data?.id === testScheduleId &&
          getByIdRes.data?.asset?.name === "Phase 4 Verification Test Vehicle",
        `Query by ID: ${JSON.stringify(getByIdRes)}`
      );

      // 5. Update schedule
      const updateRes = await updateMaintenanceSchedule(testScheduleId, {
        notes: "Updated service instructions for certified tech",
        currentMileage: 14900,
      });
      check(
        "updateMaintenanceSchedule updates notes and recalculates remaining mileage (100mi left)",
        updateRes.success &&
          updateRes.data?.notes === "Updated service instructions for certified tech" &&
          updateRes.data?.remainingMileage === 100,
        `Update result: ${JSON.stringify(updateRes)}`
      );

      // 6. Log service completed (recurrence advancement)
      const logServiceRes = await logServiceCompleted({
        scheduleId: testScheduleId,
        serviceDate: new Date().toISOString(),
        mileage: 15000,
        cost: 84.75,
        serviceProvider: "Toyota Express Care",
        notes: "Completed synthetic 0W-16 change, tire rotation, inspection passed",
      });

      check(
        "logServiceCompleted creates service log and advances schedule to next cycle",
        logServiceRes.success && Boolean(logServiceRes.data?.schedule) && Boolean(logServiceRes.data?.log),
        `Log service result: ${JSON.stringify(logServiceRes)}`
      );

      if (logServiceRes.data?.schedule && logServiceRes.data?.log) {
        const advancedSchedule = logServiceRes.data.schedule;
        const serviceLog = logServiceRes.data.log;

        check(
          "Service log records exact cost ($84.75) and service provider",
          serviceLog.cost === 84.75 && serviceLog.serviceProvider === "Toyota Express Care",
          `Logged data: ${JSON.stringify(serviceLog)}`
        );

        check(
          "Schedule advanced: lastServiceMileage = 15,000, status reset to UPCOMING",
          advancedSchedule.lastServiceMileage === 15000 && advancedSchedule.calculatedStatus === "UPCOMING",
          `Advanced schedule status: ${advancedSchedule.calculatedStatus}, mileage: ${advancedSchedule.lastServiceMileage}`
        );

        check(
          "Schedule nextServiceDate advanced ~6 months into the future",
          advancedSchedule.remainingDays !== null && advancedSchedule.remainingDays >= 170,
          `Remaining days: ${advancedSchedule.remainingDays}`
        );
      }

      // 7. Retrieve logs via getMaintenanceLogs
      const logsRes = await getMaintenanceLogs({ scheduleId: testScheduleId });
      check(
        "getMaintenanceLogs retrieves chronological service history records",
        logsRes.success && Array.isArray(logsRes.data) && logsRes.data.length === 1 && logsRes.data[0].cost === 84.75,
        `Retrieved logs: ${JSON.stringify(logsRes)}`
      );
    }

    // 8. Maintenance summary metrics rollup
    const metricsRes = await getMaintenanceSummaryMetrics();
    check(
      "getMaintenanceSummaryMetrics computes totalSchedules, dueSoon, overdue, and totalExpenditure",
      metricsRes.success &&
        typeof metricsRes.data?.totalSchedules === "number" &&
        metricsRes.data.totalSchedules >= 1 &&
        typeof metricsRes.data?.totalExpenditure === "number" &&
        metricsRes.data.totalExpenditure >= 84.75,
      `Maintenance metrics: ${JSON.stringify(metricsRes)}`
    );

    // ----------------------------------------------------
    // Section 6: REST API Handlers
    // ----------------------------------------------------
    console.log("\n[6] Testing REST API Handlers & Routing:");

    check(
      "app/api/maintenance/route exports GET and POST handlers",
      typeof getApiSchedules === "function" && typeof postApiSchedule === "function",
      "API handlers missing"
    );

    check(
      "app/api/maintenance/[id]/route exports GET, PATCH, and DELETE handlers",
      typeof getApiScheduleById === "function" &&
        typeof patchApiSchedule === "function" &&
        typeof deleteApiSchedule === "function",
      "API [id] handlers missing"
    );

    // Test GET /api/maintenance with simulated NextRequest
    const simReq = new NextRequest("http://localhost:3000/api/maintenance");
    const apiGetRes = await getApiSchedules(simReq);
    const apiJson = await apiGetRes.json();
    check(
      "GET /api/maintenance returns 200 OK with schedules collection",
      apiGetRes.status === 200 && Array.isArray(apiJson.schedules) && apiJson.schedules.length >= 1,
      `API response status: ${apiGetRes.status}`
    );

    // ----------------------------------------------------
    // Section 7: Live Root Dashboard Integration
    // ----------------------------------------------------
    console.log("\n[7] Testing Live Dashboard Maintenance Integration:");

    const dashboardRes = await getDashboardData();
    check(
      "getDashboardData() includes pendingMaintenanceCount and totalMaintenanceSpent in metrics",
      dashboardRes.success &&
        typeof dashboardRes.data?.metrics.pendingMaintenanceCount === "number" &&
        typeof dashboardRes.data?.metrics.totalMaintenanceSpent === "number" &&
        dashboardRes.data.metrics.totalMaintenanceSpent >= 84.75,
      `Dashboard metrics: ${JSON.stringify(dashboardRes.data?.metrics)}`
    );

    if (dashboardRes.data) {
      const upcoming = dashboardRes.data.upcomingDeadlines;
      check(
        "Dashboard upcoming deadlines collection is an array sorted ascending by daysLeft",
        Array.isArray(upcoming) &&
          (upcoming.length <= 1 || upcoming[0].daysLeft <= upcoming[upcoming.length - 1].daysLeft),
        `Upcoming count: ${upcoming.length}`
      );
    }
  } finally {
    // ----------------------------------------------------
    // Cleanup
    // ----------------------------------------------------
    console.log("\n[8] Cleaning Up Verification Test Data:");
    if (testAssetId) {
      // Prisma cascade will delete test schedules and logs automatically
      await prisma.asset.delete({ where: { id: testAssetId } }).catch(() => {});
      console.log(`  🧹 Cleaned up test asset ID: ${testAssetId}`);
    }
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log("\n==========================================================");
  console.log("📊 Phase 4 Verification Summary");
  console.log("==========================================================");

  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;

  console.log(`Total Checks: ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);

  if (failed > 0) {
    console.error("\n❌ Phase 4 Verification Failed! Please review failures above.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PHASE 4 VERIFICATION CHECKS PASSED EMPIRICALLY!");
    process.exit(0);
  }
}

runPhase4Verification().catch((err) => {
  console.error("Fatal verification test error:", err);
  process.exit(1);
});
