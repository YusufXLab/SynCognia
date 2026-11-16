import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SynCognia database seed...");

  // Clean existing records
  await prisma.document.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.returnPolicy.deleteMany();
  await prisma.warranty.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Default Demo User
  const user = await prisma.user.create({
    data: {
      email: "demo@syncognia.local",
      name: "Demo User",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  console.log(`👤 Created user: ${user.name} (${user.email})`);

  const now = new Date();

  // Helper date adders
  const daysFromNow = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };
  const monthsAgo = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - months);
    return d;
  };
  const monthsFromNow = (months: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  // Asset 1: MacBook Pro 16" M3 Max
  const macbook = await prisma.asset.create({
    data: {
      userId: user.id,
      name: 'MacBook Pro 16" M3 Max',
      category: "Electronics",
      brand: "Apple",
      modelNumber: "A2991",
      serialNumber: "C02G9012MD6R",
      purchaseDate: monthsAgo(14),
      purchasePrice: 3499.0,
      currency: "USD",
      location: "Home Office",
      status: "ACTIVE",
      notes: "Space Black, 64GB RAM, 2TB SSD. Work and engineering primary machine.",
      receipts: {
        create: {
          merchant: "Apple Store Fifth Avenue",
          purchaseDate: monthsAgo(14),
          totalAmount: 3499.0,
          currency: "USD",
          rawOcrText: "APPLE STORE #R102\n16-INCH MACBOOK PRO SPACE BLACK\nTOTAL: $3,499.00\nCARD: ****1234",
          fileUrl: "/mock-docs/apple-receipt.pdf",
          mimeType: "application/pdf",
        },
      },
      warranties: {
        create: {
          provider: "AppleCare+",
          warrantyType: "EXTENDED",
          durationMonths: 36,
          startDate: monthsAgo(14),
          endDate: monthsFromNow(22),
          policyNumber: "AC-MBP-9923841",
          supportContact: "1-800-APL-CARE",
          claimUrl: "https://support.apple.com/repair",
          status: "ACTIVE",
        },
      },
      returnPolicies: {
        create: {
          returnWindowDays: 14,
          returnDeadline: monthsAgo(13.5),
          policyDetails: "Standard 14-day Apple hardware return window.",
          returnStatus: "EXPIRED",
        },
      },
      documents: {
        create: [
          {
            title: "MacBook Pro 16-inch User Guide",
            documentType: "MANUAL",
            fileUrl: "/mock-docs/macbook-manual.pdf",
            fileSize: 4200000,
            mimeType: "application/pdf",
          },
          {
            title: "AppleCare+ Proof of Coverage",
            documentType: "WARRANTY_CARD",
            fileUrl: "/mock-docs/applecare-certificate.pdf",
            fileSize: 520000,
            mimeType: "application/pdf",
          },
        ],
      },
    },
  });

  // Asset 2: Sony WH-1000XM5 Noise Canceling Headphones
  const headphones = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Sony WH-1000XM5 Noise Canceling Headphones",
      category: "Electronics",
      brand: "Sony",
      modelNumber: "WH1000XM5/B",
      serialNumber: "SN-98234190-H",
      purchaseDate: daysFromNow(-25),
      purchasePrice: 398.0,
      currency: "USD",
      location: "Travel Bag",
      status: "ACTIVE",
      notes: "Midnight Blue edition. Includes carrying case and auxiliary cable.",
      receipts: {
        create: {
          merchant: "Best Buy #421",
          purchaseDate: daysFromNow(-25),
          totalAmount: 398.0,
          currency: "USD",
          rawOcrText: "BEST BUY STORE #0421\nSONY WH1000XM5 BLK\nSUBTOTAL: $398.00\nTAX: $32.84\nTOTAL: $430.84",
          fileUrl: "/mock-docs/bestbuy-sony.pdf",
          mimeType: "application/pdf",
        },
      },
      warranties: {
        create: {
          provider: "Sony Electronics Inc.",
          warrantyType: "MANUFACTURER",
          durationMonths: 12,
          startDate: daysFromNow(-25),
          endDate: daysFromNow(340),
          policyNumber: "SNY-WAR-849120",
          supportContact: "https://us.esupport.sony.com",
          claimUrl: "https://us.esupport.sony.com/warranty",
          status: "ACTIVE",
        },
      },
      returnPolicies: {
        create: {
          returnWindowDays: 30,
          returnDeadline: daysFromNow(5), // 5 days left -> EXPIRING SOON!
          policyDetails: "Best Buy 30-day holiday/standard return window.",
          returnStatus: "EXPIRING_SOON",
        },
      },
    },
  });

  // Asset 3: Dyson V15 Detect Cordless Vacuum
  const dyson = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Dyson V15 Detect Cordless Vacuum",
      category: "Appliances",
      brand: "Dyson",
      modelNumber: "V15-368340-01",
      serialNumber: "DY-V15-992384A",
      purchaseDate: monthsAgo(23.3),
      purchasePrice: 749.99,
      currency: "USD",
      location: "Hallway Closet",
      status: "ACTIVE",
      notes: "Includes laser fluffy cleaner head and torque drive motorhead.",
      receipts: {
        create: {
          merchant: "Dyson Direct Online",
          purchaseDate: monthsAgo(23.3),
          totalAmount: 749.99,
          currency: "USD",
          rawOcrText: "DYSON DIRECT ORDER #DYS-82910\nDYSON V15 DETECT TOTAL: $749.99",
          fileUrl: "/mock-docs/dyson-receipt.pdf",
          mimeType: "application/pdf",
        },
      },
      warranties: {
        create: {
          provider: "Dyson 2-Year Limited",
          warrantyType: "MANUFACTURER",
          durationMonths: 24,
          startDate: monthsAgo(23.3),
          endDate: daysFromNow(21), // Expiring in 21 days!
          policyNumber: "DYS-W-00912",
          supportContact: "help@dyson.com",
          claimUrl: "https://www.dyson.com/support",
          status: "EXPIRING_SOON",
        },
      },
      maintenanceSchedules: {
        create: {
          title: "Wash HEPA Filter & Clear Bin",
          intervalMonths: 3,
          lastServiceDate: monthsAgo(2.5),
          nextServiceDate: daysFromNow(15),
          notes: "Rinse filter with cold water only. Allow 24 hours to air dry completely.",
          status: "UPCOMING",
        },
      },
      documents: {
        create: {
          title: "Dyson V15 Detect User Operating Manual",
          documentType: "MANUAL",
          fileUrl: "/mock-docs/dyson-manual.pdf",
          fileSize: 3100000,
          mimeType: "application/pdf",
        },
      },
    },
  });

  // Asset 4: 2022 Honda Civic EX
  const car = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "2022 Honda Civic EX",
      category: "Vehicles",
      brand: "Honda",
      modelNumber: "Civic Sedan EX 1.5L Turbo",
      serialNumber: "1HGCV1F34NA092819", // VIN
      purchaseDate: monthsAgo(28),
      purchasePrice: 26850.0,
      currency: "USD",
      location: "Garage",
      status: "ACTIVE",
      notes: "Platinum White Pearl. Commuter vehicle.",
      receipts: {
        create: {
          merchant: "Metro Honda Dealership",
          purchaseDate: monthsAgo(28),
          totalAmount: 26850.0,
          currency: "USD",
          rawOcrText: "METRO HONDA BILL OF SALE\n2022 HONDA CIVIC EX VIN: 1HGCV1F34NA092819\nTOTAL: $26,850.00",
          fileUrl: "/mock-docs/car-bill-of-sale.pdf",
          mimeType: "application/pdf",
        },
      },
      warranties: {
        create: {
          provider: "Honda Powertrain Warranty",
          warrantyType: "MANUFACTURER",
          durationMonths: 60,
          startDate: monthsAgo(28),
          endDate: monthsFromNow(32),
          policyNumber: "HND-PWR-092819",
          supportContact: "1-800-999-1009",
          claimUrl: "https://owners.honda.com",
          status: "ACTIVE",
        },
      },
      maintenanceSchedules: {
        create: [
          {
            title: "Synthetic Oil Change & Filter Replacement",
            intervalMonths: 6,
            intervalMileage: 5000,
            lastServiceDate: monthsAgo(5),
            nextServiceDate: daysFromNow(25),
            currentMileage: 28450,
            lastServiceCost: 89.95,
            notes: "0W-20 Full Synthetic Oil. Last done at Valvoline Express.",
            status: "UPCOMING",
          },
          {
            title: "Tire Rotation & Brake Inspection",
            intervalMonths: 6,
            intervalMileage: 7500,
            lastServiceDate: monthsAgo(5),
            nextServiceDate: daysFromNow(25),
            currentMileage: 28450,
            lastServiceCost: 45.0,
            notes: "Rotate front to rear. Check brake pad wear depth.",
            status: "UPCOMING",
          },
        ],
      },
      documents: {
        create: [
          {
            title: "Vehicle Registration & Title Certificate",
            documentType: "TITLE_DEED",
            fileUrl: "/mock-docs/honda-title.pdf",
            fileSize: 1200000,
            mimeType: "application/pdf",
            isEncrypted: true,
          },
        ],
      },
    },
  });

  // Asset 5: Breville Barista Touch Espresso Machine
  const espresso = await prisma.asset.create({
    data: {
      userId: user.id,
      name: "Breville Barista Touch Espresso Machine",
      category: "Kitchen",
      brand: "Breville",
      modelNumber: "BES880BSS",
      serialNumber: "BRV-2104-BES880",
      purchaseDate: monthsAgo(16),
      purchasePrice: 999.95,
      currency: "USD",
      location: "Kitchen Counter",
      status: "ACTIVE",
      notes: "Brushed stainless steel. Touchscreen auto milk steaming.",
      receipts: {
        create: {
          merchant: "Williams Sonoma",
          purchaseDate: monthsAgo(16),
          totalAmount: 999.95,
          currency: "USD",
          rawOcrText: "WILLIAMS SONOMA #118\nBREVILLE BARISTA TOUCH TOTAL: $999.95",
          fileUrl: "/mock-docs/breville-receipt.pdf",
          mimeType: "application/pdf",
        },
      },
      warranties: {
        create: {
          provider: "Breville 1-Year Limited Warranty",
          warrantyType: "MANUFACTURER",
          durationMonths: 12,
          startDate: monthsAgo(16),
          endDate: monthsAgo(4), // Expired 4 months ago!
          policyNumber: "BRV-W-88019",
          supportContact: "support.breville.com",
          claimUrl: "https://www.breville.com/us/en/support",
          status: "EXPIRED",
        },
      },
      maintenanceSchedules: {
        create: {
          title: "Claris Water Filter Replacement & Descale Cycle",
          intervalMonths: 2,
          lastServiceDate: monthsAgo(1.5),
          nextServiceDate: daysFromNow(12),
          notes: "Use official Breville descaling powder and genuine filter.",
          status: "UPCOMING",
        },
      },
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`📦 Seeded 5 assets:`);
  console.log(`   1. ${macbook.name} (Active AppleCare+)`);
  console.log(`   2. ${headphones.name} (Active, Return Expiring Soon)`);
  console.log(`   3. ${dyson.name} (Warranty Expiring in 21d)`);
  console.log(`   4. ${car.name} (Active Powertrain + 2 Maintenance Schedules)`);
  console.log(`   5. ${espresso.name} (Expired Warranty + Descale Schedule)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
