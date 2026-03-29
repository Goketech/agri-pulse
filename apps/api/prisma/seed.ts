import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

dotenv.config();

type Region = "NG" | "RW";

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const RESET_DEMO = hasFlag("--reset-demo");
const RESET_LISTINGS = hasFlag("--reset-listings");
const RESET_MODULES = hasFlag("--reset-modules");

const demoPassword = getArgValue("--demo-password") ?? process.env.DEMO_PASSWORD ?? "DemoPass123!";

async function ensureDemoUsers() {
  const users: Array<{
    email: string;
    name: string;
    region: Region;
    role: "agripreneur" | "admin";
    cropInterest?: string;
    skillLevel?: string;
  }> = [
    // Nigeria (NG)
    { email: "ada.cassava@agripulse.demo", name: "Ada Adebayo", region: "NG", role: "agripreneur", cropInterest: "cassava", skillLevel: "intermediate" },
    { email: "kelechi.maize@agripulse.demo", name: "Kelechi Okafor", region: "NG", role: "agripreneur", cropInterest: "maize", skillLevel: "beginner" },
    // Rwanda (RW)
    { email: "jeanette.coffee@agripulse.demo", name: "Jeanette Mukamana", region: "RW", role: "agripreneur", cropInterest: "coffee", skillLevel: "intermediate" },
    { email: "olivier.beans@agripulse.demo", name: "Olivier Nshimyimana", region: "RW", role: "agripreneur", cropInterest: "beans", skillLevel: "advanced" },
    // Admins (helps demo marketplace verification)
    { email: "admin@agripulse.demo", name: "AgriPulse Admin", region: "NG", role: "admin" },
  ];

  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const created = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        region: u.region,
        role: u.role,
        passwordHash,
      },
      create: {
        email: u.email,
        name: u.name,
        region: u.region,
        role: u.role,
        passwordHash,
        ...(u.role === "agripreneur" ? { agripreneur: { create: { cropInterest: u.cropInterest ?? null, skillLevel: u.skillLevel ?? null } } } : {}),
        ...(u.role === "admin" ? { administrator: { create: {} } } : {}),
      },
    });

    if (u.role === "agripreneur") {
      await prisma.agripreneur.upsert({
        where: { userId: user.id },
        update: {
          cropInterest: u.cropInterest ?? null,
          skillLevel: u.skillLevel ?? null,
        },
        create: {
          userId: user.id,
          cropInterest: u.cropInterest ?? null,
          skillLevel: u.skillLevel ?? null,
        },
      });
    }

    created.push({ ...u, userId: user.id });
  }

  return created;
}

async function resetDemoDataIfRequested() {
  if (!(RESET_DEMO || RESET_LISTINGS || RESET_MODULES)) return;

  // Avoid deleting users, only demo content.
  if (RESET_DEMO || RESET_LISTINGS) {
    await prisma.marketplaceListing.deleteMany({ where: { status: "active" } });
  }

  if (RESET_DEMO || RESET_MODULES) {
    // Deleting modules must happen after dependent tables.
    await prisma.quizAttempt.deleteMany({});
    await prisma.quizQuestion.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.learningEnrollment.deleteMany({});
    await prisma.badge.deleteMany({});
    await prisma.notification.deleteMany({ where: { type: { in: ["badge_earned", "module_enrolled"] } } });
    await prisma.learningModule.deleteMany({});
  }
}

async function seedMarketplaceOwners() {
  const ownersByEmail = new Map<string, { userId: string; agripreneurId: string; name: string; region: Region }>();

  const ownerEmails = [
    "ada.cassava@agripulse.demo",
    "kelechi.maize@agripulse.demo",
    "jeanette.coffee@agripulse.demo",
    "olivier.beans@agripulse.demo",
  ];

  const users = await prisma.user.findMany({
    where: { email: { in: ownerEmails } },
    select: { id: true, email: true, name: true, region: true, agripreneur: { select: { id: true } } },
  });

  for (const u of users) {
    const agripreneurId = u.agripreneur?.id;
    if (!agripreneurId) continue;
    ownersByEmail.set(u.email, { userId: u.id, agripreneurId, name: u.name, region: u.region as Region });
  }

  return ownersByEmail;
}

async function seedMarketplaceListings(ownersByEmail: Map<string, { agripreneurId: string; region: Region }>) {
  const listings: Array<{
    ownerEmail: string;
    equipmentName: string;
    description: string;
    condition: "new" | "good" | "fair" | "poor";
    price: number;
    transactionType: "rent" | "sale";
    region: Region;
    isVerified: boolean;
    latitude?: number;
    longitude?: number;
  }> = [
    // Lagos (NG) - coordinates near Lagos Island / Ikeja area (demo purposes)
    {
      ownerEmail: "ada.cassava@agripulse.demo",
      equipmentName: "4-wheel Tractor (Harrow + Plough set)",
      description: "Rent with basic attachments. Suitable for cassava ridging and land preparation. Pickup in Lagos mainland, daily or weekly rates.",
      condition: "good",
      price: 95000,
      transactionType: "rent",
      region: "NG",
      isVerified: true,
      latitude: 6.5244,
      longitude: 3.3792,
    },
    {
      ownerEmail: "ada.cassava@agripulse.demo",
      equipmentName: "Motobike Irrigation Sprayer (20L)",
      description: "For herbicide + pesticide application. Includes nozzle set and quick-start nozzle pump.",
      condition: "fair",
      price: 120000,
      transactionType: "sale",
      region: "NG",
      isVerified: false,
      latitude: 6.4654,
      longitude: 3.4064,
    },
    {
      ownerEmail: "kelechi.maize@agripulse.demo",
      equipmentName: "Maize Sheller (Motorized)",
      description: "Motorized maize sheller for rapid post-harvest processing. Clean output with adjustable speed.",
      condition: "good",
      price: 620000,
      transactionType: "sale",
      region: "NG",
      isVerified: true,
      latitude: 6.6028,
      longitude: 3.3348,
    },
    {
      ownerEmail: "kelechi.maize@agripulse.demo",
      equipmentName: "Hand Cassava Planter Rows (Ridge maker)",
      description: "For structured ridges and spacing. Great for smallholder cassava expansion; easy to transport and set up.",
      condition: "new",
      price: 85000,
      transactionType: "rent",
      region: "NG",
      isVerified: false,
      latitude: 6.6212,
      longitude: 3.349,
    },
    {
      ownerEmail: "kelechi.maize@agripulse.demo",
      equipmentName: "Power Tiller (Yard-to-Farm)",
      description: "Reliable power tiller for seedbed preparation. Includes extra blades; ideal for quick turnaround before planting.",
      condition: "good",
      price: 68000,
      transactionType: "rent",
      region: "NG",
      isVerified: true,
      latitude: 6.5222,
      longitude: 3.3777,
    },

    // Kigali (RW) - coordinates near Kigali city (demo purposes)
    {
      ownerEmail: "jeanette.coffee@agripulse.demo",
      equipmentName: "Coffee Shade Net Roll (50m)",
      description: "Shade net for nursery and young coffee plants. Easy to install; helps reduce stress and improve germination.",
      condition: "good",
      price: 45000,
      transactionType: "sale",
      region: "RW",
      isVerified: true,
      latitude: -1.9706,
      longitude: 30.1044,
    },
    {
      ownerEmail: "jeanette.coffee@agripulse.demo",
      equipmentName: "Drip Irrigation Starter Kit (1/2 acre)",
      description: "Starter drip irrigation kit with timers and emitters. Includes assembly checklist and water pressure tips.",
      condition: "fair",
      price: 90000,
      transactionType: "rent",
      region: "RW",
      isVerified: false,
      latitude: -1.985,
      longitude: 30.113,
    },
    {
      ownerEmail: "olivier.beans@agripulse.demo",
      equipmentName: "Bean Thresher (Small Motorized)",
      description: "Thresh and clean beans for storage. Reduced breakage with adjustable gap settings.",
      condition: "good",
      price: 175000,
      transactionType: "sale",
      region: "RW",
      isVerified: true,
      latitude: -1.95,
      longitude: 30.12,
    },
    {
      ownerEmail: "olivier.beans@agripulse.demo",
      equipmentName: "Rain Cover / Mulch Film (Bed Row)",
      description: "Mulch film for moisture retention and weed control. Useful for beans and vegetables during dry spells.",
      condition: "new",
      price: 25000,
      transactionType: "sale",
      region: "RW",
      isVerified: false,
      latitude: -1.962,
      longitude: 30.083,
    },
  ];

  // If listings exist already, we still try to add missing ones (idempotent-ish).
  for (const l of listings) {
    const owner = ownersByEmail.get(l.ownerEmail);
    if (!owner) continue;

    const existing = await prisma.marketplaceListing.findFirst({
      where: {
        ownerId: owner.agripreneurId,
        equipmentName: l.equipmentName,
      },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.marketplaceListing.create({
      data: {
        ownerId: owner.agripreneurId,
        equipmentName: l.equipmentName,
        description: l.description,
        condition: l.condition,
        price: l.price,
        transactionType: l.transactionType,
        region: l.region,
        isVerified: l.isVerified,
        latitude: l.latitude,
        longitude: l.longitude,
      },
    });
  }
}

async function seedCropAnalyticsData(ownersByEmail: Map<string, { agripreneurId: string; region: Region }>) {
  const seededAt = new Date();
  const entriesByOwner: Array<{
    ownerEmail: string;
    entries: Array<{
      cropType: string;
      soilHealthIndex: number;
      historicalYield: number;
      currentMarketPrice: number;
      alertThreshold: number;
      daysAgo: number;
    }>;
  }> = [
    {
      ownerEmail: "ada.cassava@agripulse.demo",
      entries: [
        { cropType: "cassava", soilHealthIndex: 63, historicalYield: 13.1, currentMarketPrice: 82000, alertThreshold: 5, daysAgo: 18 },
        { cropType: "cassava", soilHealthIndex: 66, historicalYield: 13.8, currentMarketPrice: 90500, alertThreshold: 5, daysAgo: 10 },
        { cropType: "maize", soilHealthIndex: 58, historicalYield: 3.4, currentMarketPrice: 61000, alertThreshold: 5, daysAgo: 6 },
      ],
    },
    {
      ownerEmail: "kelechi.maize@agripulse.demo",
      entries: [
        { cropType: "maize", soilHealthIndex: 61, historicalYield: 4.1, currentMarketPrice: 64000, alertThreshold: 5, daysAgo: 20 },
        { cropType: "maize", soilHealthIndex: 64, historicalYield: 4.4, currentMarketPrice: 71500, alertThreshold: 5, daysAgo: 11 },
        { cropType: "rice", soilHealthIndex: 57, historicalYield: 3.0, currentMarketPrice: 98000, alertThreshold: 6, daysAgo: 5 },
      ],
    },
    {
      ownerEmail: "jeanette.coffee@agripulse.demo",
      entries: [
        { cropType: "coffee", soilHealthIndex: 69, historicalYield: 2.3, currentMarketPrice: 132000, alertThreshold: 5, daysAgo: 16 },
        { cropType: "coffee", soilHealthIndex: 71, historicalYield: 2.5, currentMarketPrice: 141500, alertThreshold: 5, daysAgo: 8 },
        { cropType: "beans", soilHealthIndex: 62, historicalYield: 1.8, currentMarketPrice: 54000, alertThreshold: 5, daysAgo: 4 },
      ],
    },
    {
      ownerEmail: "olivier.beans@agripulse.demo",
      entries: [
        { cropType: "beans", soilHealthIndex: 65, historicalYield: 2.0, currentMarketPrice: 52000, alertThreshold: 5, daysAgo: 15 },
        { cropType: "beans", soilHealthIndex: 67, historicalYield: 2.2, currentMarketPrice: 57500, alertThreshold: 5, daysAgo: 7 },
        { cropType: "sorghum", soilHealthIndex: 59, historicalYield: 2.7, currentMarketPrice: 49000, alertThreshold: 5, daysAgo: 3 },
      ],
    },
  ];

  for (const ownerBlock of entriesByOwner) {
    const owner = ownersByEmail.get(ownerBlock.ownerEmail);
    if (!owner) continue;

    const existing = await prisma.cropAnalytics.count({
      where: { agripreneurId: owner.agripreneurId },
    });

    // Keep seed idempotent: only create analytics for users with no analytics yet.
    if (existing > 0) continue;

    for (const entry of ownerBlock.entries) {
      const createdAt = new Date(seededAt.getTime() - entry.daysAgo * 24 * 60 * 60 * 1000);
      await prisma.cropAnalytics.create({
        data: {
          agripreneurId: owner.agripreneurId,
          cropType: entry.cropType,
          soilHealthIndex: entry.soilHealthIndex,
          historicalYield: entry.historicalYield,
          currentMarketPrice: entry.currentMarketPrice,
          alertThreshold: entry.alertThreshold,
          region: owner.region,
          createdAt,
        },
      });
    }
  }
}

async function seedLearningModules() {
  const modules: Array<{
    title: string;
    content: string;
    cropValueChain: string;
    durationMinutes: number;
    difficultyLevel: "beginner" | "intermediate" | "advanced";
    badgeName?: string;
    lessons: Array<{ order: number; title: string; body: string; estimatedMinutes: number }>;
    quiz: {
      title: string;
      description: string;
      passingScore: number;
      questions: Array<{ order: number; prompt: string; options: string[]; correctIndex: number; explanation: string }>;
    };
  }> = [
    {
      title: "Cassava Fundamentals: Planting, Spacing, and Ridging",
      content:
        "A practical beginner course that teaches how to start, manage, and harvest cassava reliably in Nigeria and Rwanda. You will learn field preparation, spacing, weed control, and decision points that improve yield.",
      cropValueChain: "cassava",
      durationMinutes: 45,
      difficultyLevel: "beginner",
      badgeName: "Cassava Basics Graduate",
      lessons: [
        {
          order: 1,
          title: "Choosing Site and Planting Material",
          estimatedMinutes: 12,
          body:
            "Start with a well-drained field and avoid waterlogged areas. Select healthy stem cuttings from disease-free parent plants. Cuttings should be mature, not very young, and typically 20-30cm long with multiple nodes. Before planting, inspect for rot, pest damage, or mold. In low-input settings, prioritize quality cuttings over larger land size; good planting material has the highest impact on final yield.",
        },
        {
          order: 2,
          title: "Land Preparation, Spacing, and Ridging",
          estimatedMinutes: 14,
          body:
            "Clear the field and create ridges where possible to improve root expansion and drainage. A common spacing target is 1m x 1m for balanced plant population and management access. Plant cuttings at an angle or upright depending on local practice, but keep node contact with moist soil. Mark rows clearly so weeding and fertilizer application can be done on time.",
        },
        {
          order: 3,
          title: "Early Field Management and Weed Control",
          estimatedMinutes: 12,
          body:
            "The first 8-10 weeks are critical. Keep weeds under control early, because cassava establishes slowly and can lose vigor under competition. If fertilizer is used, apply according to extension guidance and avoid over-application. Track observations weekly: stand count, weed pressure, and visible disease symptoms. Taking notes helps identify what improved or reduced performance.",
        },
        {
          order: 4,
          title: "Harvest Planning and Post-Harvest Handling",
          estimatedMinutes: 10,
          body:
            "Cassava maturity depends on variety and use case. Plan harvest with market timing and processing capacity in mind, since roots deteriorate quickly after harvest. Organize labor and transport before harvest day. Sort roots by quality, and process or sell quickly to reduce losses and improve margins.",
        },
      ],
      quiz: {
        title: "Cassava Fundamentals Check",
        description: "Validate understanding of cassava establishment and field management.",
        passingScore: 70,
        questions: [
          {
            order: 1,
            prompt: "Which planting material is best for cassava establishment?",
            options: ["Mature disease-free stem cuttings", "Fresh green leaves", "Dry cassava peels"],
            correctIndex: 0,
            explanation: "Healthy mature stem cuttings give stronger early growth and lower disease risk.",
          },
          {
            order: 2,
            prompt: "Why is early weed control important in cassava?",
            options: ["Cassava establishes slowly and can lose vigor", "It increases stem rot intentionally", "It removes all soil moisture"],
            correctIndex: 0,
            explanation: "Weed competition in early growth stages significantly reduces yield potential.",
          },
          {
            order: 3,
            prompt: "A practical spacing commonly used in cassava production is:",
            options: ["1m x 1m", "10cm x 10cm", "3m x 3m only"],
            correctIndex: 0,
            explanation: "1m x 1m supports manageable density and field operations for many systems.",
          },
        ],
      },
    },
    {
      title: "Maize Production: Nutrient Timing and Pest Scouting",
      content:
        "This course guides new learners through maize production from planting to harvest, with emphasis on nutrient timing, scouting for pests, and making good decisions quickly in the field.",
      cropValueChain: "maize",
      durationMinutes: 60,
      difficultyLevel: "beginner",
      badgeName: "Maize Field Starter Graduate",
      lessons: [
        {
          order: 1,
          title: "Planting Window and Variety Choice",
          estimatedMinutes: 12,
          body:
            "Match planting date with rainfall onset in your region. Choose improved varieties suitable for local conditions, including drought tolerance where rainfall is uncertain. Use clean seed and uniform depth to improve stand establishment. Replant gaps early to keep plant population close to target.",
        },
        {
          order: 2,
          title: "Nutrient Timing and Field Nutrition Plan",
          estimatedMinutes: 16,
          body:
            "Nutrient timing matters as much as nutrient quantity. Apply basal nutrients at or near planting to support root and early shoot development. Top-dress nitrogen when plants are actively growing to avoid losses and maximize uptake. Avoid applying fertilizer right before heavy rain where runoff is likely.",
        },
        {
          order: 3,
          title: "Pest and Disease Scouting Routine",
          estimatedMinutes: 14,
          body:
            "Create a weekly scouting routine. Check leaf damage patterns, stem integrity, and signs of fall armyworm or fungal disease. Record affected plot sections and severity. Early detection enables targeted action, reducing cost and crop damage.",
        },
        {
          order: 4,
          title: "Harvest and Storage Basics",
          estimatedMinutes: 10,
          body:
            "Harvest at physiological maturity and dry grain to safe moisture before storage. Use clean sacks and dry storage surfaces to reduce mold and aflatoxin risk. Keep records of harvested quantity and reject rates to improve season planning.",
        },
      ],
      quiz: {
        title: "Maize Agronomy Check",
        description: "Assess understanding of maize nutrient management and pest scouting.",
        passingScore: 70,
        questions: [
          {
            order: 1,
            prompt: "Why is top-dressing timing critical in maize?",
            options: ["To match periods of high nutrient demand", "To avoid plant growth", "To increase weed growth"],
            correctIndex: 0,
            explanation: "Nutrients should be available when maize growth demand is highest.",
          },
          {
            order: 2,
            prompt: "How often should basic maize scouting happen during growth?",
            options: ["At least weekly", "Only during harvest", "Never unless plants fall"],
            correctIndex: 0,
            explanation: "Regular scouting helps detect issues early before major damage occurs.",
          },
          {
            order: 3,
            prompt: "A good post-harvest maize practice is to:",
            options: ["Dry grain to safe moisture before storage", "Store wet grain immediately", "Ignore mold checks"],
            correctIndex: 0,
            explanation: "Proper drying reduces spoilage and health risks in storage.",
          },
        ],
      },
    },
    {
      title: "Coffee Yield Boost: Shade Management and Processing Quality",
      content:
        "A practical guide for coffee learners covering plant health, shade decisions, and quality-focused harvesting and processing methods that improve consistency and value.",
      cropValueChain: "coffee",
      durationMinutes: 70,
      difficultyLevel: "intermediate",
      badgeName: "Coffee Steward Graduate",
      lessons: [
        {
          order: 1,
          title: "Coffee Plant Health and Shade Principles",
          estimatedMinutes: 16,
          body:
            "Healthy coffee starts with balanced shade and airflow. Excessive shade increases disease risk, while too little shade stresses plants in hot periods. Observe leaf color, new growth, and flowering consistency. Adjust shade trees gradually instead of making abrupt canopy changes.",
        },
        {
          order: 2,
          title: "Flowering, Cherry Development, and Nutrition",
          estimatedMinutes: 16,
          body:
            "Understand seasonal stages from flowering to cherry filling. Coordinate field nutrition and moisture management around these stages. Keep field records on bloom periods and cherry load to support better pruning and feeding decisions next season.",
        },
        {
          order: 3,
          title: "Selective Harvesting and Defect Reduction",
          estimatedMinutes: 14,
          body:
            "Selective picking improves cup quality. Train harvest teams to separate ripe, underripe, and damaged cherries. Avoid rough handling that bruises cherries before processing. Sorting at collection points reduces defects and improves processing efficiency.",
        },
        {
          order: 4,
          title: "Pulping, Fermentation, and Drying Control",
          estimatedMinutes: 14,
          body:
            "Control each stage after harvest: pulping timing, fermentation duration, washing, and drying. Over-fermentation or uneven drying causes quality loss. Use simple moisture checks and lot separation to maintain consistency and traceability.",
        },
      ],
      quiz: {
        title: "Coffee Quality and Management Quiz",
        description: "Test mastery of shade management and quality processing practices.",
        passingScore: 70,
        questions: [
          {
            order: 1,
            prompt: "Why is balanced shade important in coffee?",
            options: ["It supports plant health while reducing stress", "It replaces fertilizer completely", "It removes need for scouting"],
            correctIndex: 0,
            explanation: "Balanced shade helps regulate stress and disease pressure while maintaining productivity.",
          },
          {
            order: 2,
            prompt: "Which harvest approach best supports quality?",
            options: ["Selective picking of ripe cherries", "Mixing all cherry stages", "Harvesting only after heavy rain"],
            correctIndex: 0,
            explanation: "Selective picking improves consistency and reduces defects in processing.",
          },
          {
            order: 3,
            prompt: "A major post-harvest quality risk is:",
            options: ["Uncontrolled fermentation and drying", "Taking field notes", "Sorting cherries"],
            correctIndex: 0,
            explanation: "Poor fermentation and drying control directly reduce cup quality.",
          },
        ],
      },
    },
    {
      title: "Beans (Common Beans) Soil Health & Disease Prevention",
      content:
        "A beginner-to-practical course focused on beans production through strong soil health, crop rotation, disease prevention, and low-cost field monitoring routines.",
      cropValueChain: "beans",
      durationMinutes: 55,
      difficultyLevel: "intermediate",
      badgeName: "Beans Resilience Graduate",
      lessons: [
        {
          order: 1,
          title: "Building Soil Health for Beans",
          estimatedMinutes: 13,
          body:
            "Beans perform best when soil structure and fertility are stable. Use compost and organic matter to improve soil life and moisture retention. Avoid repeated deep tillage that leaves soil exposed. Track soil indicators such as drainage behavior and root vigor each season.",
        },
        {
          order: 2,
          title: "Rotation and Field Hygiene Systems",
          estimatedMinutes: 13,
          body:
            "Crop rotation reduces disease carryover and supports nutrient balance. Avoid planting beans repeatedly on the same plot without a break crop. Remove heavily infected residues and sanitize tools where disease pressure is high. Good field hygiene can reduce losses before chemical interventions are needed.",
        },
        {
          order: 3,
          title: "Early Disease Detection and Response",
          estimatedMinutes: 13,
          body:
            "Set a weekly inspection route and look for early symptoms on leaves, stems, and pods. Record where symptoms start and whether spread is localized or field-wide. Begin with integrated responses: spacing improvements, canopy airflow, sanitation, and targeted treatments according to extension guidance.",
        },
        {
          order: 4,
          title: "Yield Protection and Harvest Quality",
          estimatedMinutes: 10,
          body:
            "Protect yield by preventing late-season stress and handling beans carefully at harvest. Dry properly to safe moisture and store in clean, pest-safe conditions. Keep batch records to identify what field practices produced better outcomes.",
        },
      ],
      quiz: {
        title: "Beans Soil and Disease Management Quiz",
        description: "Confirm understanding of soil health and disease prevention for beans.",
        passingScore: 70,
        questions: [
          {
            order: 1,
            prompt: "What is one major benefit of crop rotation in beans?",
            options: ["It helps reduce disease carryover", "It guarantees no pests ever", "It removes need for field checks"],
            correctIndex: 0,
            explanation: "Rotation interrupts disease cycles and improves field resilience.",
          },
          {
            order: 2,
            prompt: "Which action supports field hygiene?",
            options: ["Removing infected residues", "Mixing infected plants into compost without treatment", "Skipping tool cleaning"],
            correctIndex: 0,
            explanation: "Sanitation reduces spread and reinfection risk.",
          },
          {
            order: 3,
            prompt: "The best disease response strategy starts with:",
            options: ["Early detection and integrated action", "Waiting until total crop failure", "Random pesticide use"],
            correctIndex: 0,
            explanation: "Early and integrated responses are more effective and safer.",
          },
        ],
      },
    },
    {
      title: "Rice Value Chain Ops: Water Management and Harvest Timing",
      content:
        "This course helps learners understand rice field operations, especially water management, timing decisions, and practical quality steps from field to market.",
      cropValueChain: "rice",
      durationMinutes: 75,
      difficultyLevel: "intermediate",
      badgeName: "Rice Systems Graduate",
      lessons: [
        {
          order: 1,
          title: "Field Preparation and Leveling Basics",
          estimatedMinutes: 15,
          body:
            "Uniform field leveling improves water control and reduces uneven crop growth. Plan bunds, channels, and access points before transplanting or direct seeding. Leveling also helps reduce nutrient loss and makes irrigation more efficient.",
        },
        {
          order: 2,
          title: "Water Management by Growth Stage",
          estimatedMinutes: 18,
          body:
            "Rice water needs vary by stage. Keep stable moisture during establishment and tillering, then manage water depth carefully around flowering and grain filling. Avoid long stress periods and sudden drainage changes unless agronomically required.",
        },
        {
          order: 3,
          title: "Nutrient and Weed Control Coordination",
          estimatedMinutes: 14,
          body:
            "Coordinate nutrient application with water schedule to improve uptake. Weeds in early stages can reduce yield quickly if not controlled. Combine cultural methods and targeted interventions for consistent field performance.",
        },
        {
          order: 4,
          title: "Harvest Timing and Post-Harvest Quality",
          estimatedMinutes: 14,
          body:
            "Harvest timing affects grain quality and milling recovery. Harvest too early and grains are immature; too late increases losses and shattering. Dry grain to safe moisture and protect quality during transport and storage.",
        },
      ],
      quiz: {
        title: "Rice Operations Quiz",
        description: "Evaluate understanding of water and harvest management in rice systems.",
        passingScore: 70,
        questions: [
          {
            order: 1,
            prompt: "Why is field leveling important for rice?",
            options: ["It improves water distribution and uniform growth", "It eliminates all labor needs", "It replaces fertility management"],
            correctIndex: 0,
            explanation: "Leveling supports efficient and consistent water control.",
          },
          {
            order: 2,
            prompt: "Rice water strategy should be:",
            options: ["Adjusted by growth stage", "Kept random all season", "Avoided during tillering"],
            correctIndex: 0,
            explanation: "Different growth stages have different sensitivity and water needs.",
          },
          {
            order: 3,
            prompt: "Harvest timing in rice impacts:",
            options: ["Grain quality and yield losses", "Only planting density", "Irrigation hardware only"],
            correctIndex: 0,
            explanation: "Correct harvest timing improves quality and reduces field loss.",
          },
        ],
      },
    },
    {
      title: "Advanced Crop Business: Pricing, Records, and Market Fit",
      content:
        "A practical agribusiness course that teaches learners to convert farming activity into profitable decisions using records, pricing models, and buyer alignment strategies.",
      cropValueChain: "agribusiness",
      durationMinutes: 90,
      difficultyLevel: "advanced",
      badgeName: "Agri Business Pro Graduate",
      lessons: [
        {
          order: 1,
          title: "Cost Structure and Unit Economics",
          estimatedMinutes: 18,
          body:
            "Separate fixed and variable costs and calculate cost per unit output. Include labor, transport, losses, packaging, and credit costs. This gives a realistic baseline for price setting and helps avoid underpricing.",
        },
        {
          order: 2,
          title: "Pricing Strategy and Margin Protection",
          estimatedMinutes: 16,
          body:
            "Set floor prices based on unit cost and target margin. Compare wholesale vs retail channels and account for payment delays. Review pricing monthly using market data and seasonal patterns.",
        },
        {
          order: 3,
          title: "Market Fit and Buyer Segmentation",
          estimatedMinutes: 14,
          body:
            "Different buyers prioritize different things: price, quality consistency, volume, and delivery reliability. Map buyer segments and adapt your offering accordingly. Build simple buyer profiles and track conversion rates.",
        },
        {
          order: 4,
          title: "Records, Reporting, and Growth Planning",
          estimatedMinutes: 16,
          body:
            "Maintain structured records of production, sales, and profitability. Use monthly reports to identify trends and plan growth investments. A basic dashboard can improve decision quality and mentor discussions.",
        },
      ],
      quiz: {
        title: "Agribusiness Fundamentals Quiz",
        description: "Check understanding of cost, pricing, and market-fit decisions.",
        passingScore: 75,
        questions: [
          {
            order: 1,
            prompt: "A core pricing baseline should come from:",
            options: ["Cost per unit and margin target", "Competitor rumor only", "Random discounting"],
            correctIndex: 0,
            explanation: "Sustainable pricing depends on understanding your own cost base.",
          },
          {
            order: 2,
            prompt: "Buyer segmentation helps you:",
            options: ["Match products to buyer needs", "Ignore delivery quality", "Avoid record keeping"],
            correctIndex: 0,
            explanation: "Different buyer groups have different priorities and requirements.",
          },
          {
            order: 3,
            prompt: "Good records are valuable because they:",
            options: ["Improve planning and decision quality", "Replace all field work", "Remove marketing needs"],
            correctIndex: 0,
            explanation: "Reliable records support better operational and financial decisions.",
          },
        ],
      },
    },
    {
      title: "Sorghum Starter: Drought Strategy and Field Selection",
      content:
        "An entry-level sorghum course focused on drought resilience, practical field selection, and timing decisions for stable production under variable weather.",
      cropValueChain: "sorghum",
      durationMinutes: 50,
      difficultyLevel: "beginner",
      lessons: [
        {
          order: 1,
          title: "Field Selection and Seasonal Planning",
          estimatedMinutes: 12,
          body:
            "Choose fields with good drainage and manageable weed pressure. Align planting with expected rainfall patterns and local forecast information. Sorghum performs best when establishment is synchronized with moisture availability.",
        },
        {
          order: 2,
          title: "Drought-Resilient Establishment Practices",
          estimatedMinutes: 12,
          body:
            "Use suitable varieties and spacing for your climate and soil. Conserve moisture through residue management and reduced unnecessary soil disturbance. Early stand uniformity helps sorghum tolerate stress later in the season.",
        },
        {
          order: 3,
          title: "Stress Monitoring and Corrective Actions",
          estimatedMinutes: 12,
          body:
            "Monitor crop color, leaf rolling, and growth rate to identify stress signals early. Manage weed pressure promptly so limited moisture is used by crop plants. Prioritize low-cost interventions first and keep records to learn from each season.",
        },
        {
          order: 4,
          title: "Harvest Timing and Grain Handling",
          estimatedMinutes: 10,
          body:
            "Harvest at proper maturity and dry grain to safe storage moisture. Reduce losses during threshing and handling by using clean surfaces and proper sacks. Track quality outcomes to improve market confidence.",
        },
      ],
      quiz: {
        title: "Sorghum Basics Quiz",
        description: "Validate understanding of drought strategy and field operations.",
        passingScore: 70,
        questions: [
          {
            order: 1,
            prompt: "A key sorghum resilience practice is to:",
            options: ["Align planting with moisture availability", "Plant without seasonal planning", "Ignore stand establishment"],
            correctIndex: 0,
            explanation: "Timing establishment with rainfall improves early growth and resilience.",
          },
          {
            order: 2,
            prompt: "Why should weed pressure be controlled early?",
            options: ["To reduce competition for limited moisture", "To increase random stress", "To reduce crop population"],
            correctIndex: 0,
            explanation: "Weeds compete for water and nutrients, especially harmful in dry conditions.",
          },
          {
            order: 3,
            prompt: "Proper post-harvest practice includes:",
            options: ["Drying grain to safe moisture before storage", "Storing wet grain immediately", "Skipping quality checks"],
            correctIndex: 0,
            explanation: "Drying and handling standards protect grain quality and reduce losses.",
          },
        ],
      },
    },
  ];

  for (const moduleData of modules) {
    const existingModule = await prisma.learningModule.findFirst({
      where: { title: moduleData.title },
      select: { id: true },
    });

    const mod = existingModule
      ? await prisma.learningModule.update({
          where: { id: existingModule.id },
          data: {
            content: moduleData.content,
            cropValueChain: moduleData.cropValueChain,
            durationMinutes: moduleData.durationMinutes,
            difficultyLevel: moduleData.difficultyLevel,
            badgeName: moduleData.badgeName ?? null,
          },
        })
      : await prisma.learningModule.create({
          data: {
            title: moduleData.title,
            content: moduleData.content,
            cropValueChain: moduleData.cropValueChain,
            durationMinutes: moduleData.durationMinutes,
            difficultyLevel: moduleData.difficultyLevel,
            badgeName: moduleData.badgeName ?? null,
          },
        });

    for (const lessonData of moduleData.lessons) {
      await prisma.lesson.upsert({
        where: { moduleId_order: { moduleId: mod.id, order: lessonData.order } },
        update: {
          title: lessonData.title,
          body: lessonData.body,
          estimatedMinutes: lessonData.estimatedMinutes,
        },
        create: {
          moduleId: mod.id,
          order: lessonData.order,
          title: lessonData.title,
          body: lessonData.body,
          estimatedMinutes: lessonData.estimatedMinutes,
        },
      });
    }

    const quiz = await prisma.quiz.upsert({
      where: { moduleId: mod.id },
      update: {
        title: moduleData.quiz.title,
        description: moduleData.quiz.description,
        passingScore: moduleData.quiz.passingScore,
      },
      create: {
        moduleId: mod.id,
        title: moduleData.quiz.title,
        description: moduleData.quiz.description,
        passingScore: moduleData.quiz.passingScore,
      },
    });

    for (const questionData of moduleData.quiz.questions) {
      await prisma.quizQuestion.upsert({
        where: { quizId_order: { quizId: quiz.id, order: questionData.order } },
        update: {
          prompt: questionData.prompt,
          optionsJson: JSON.stringify(questionData.options),
          correctIndex: questionData.correctIndex,
          explanation: questionData.explanation,
          type: "single_choice",
        },
        create: {
          quizId: quiz.id,
          order: questionData.order,
          prompt: questionData.prompt,
          optionsJson: JSON.stringify(questionData.options),
          correctIndex: questionData.correctIndex,
          explanation: questionData.explanation,
          type: "single_choice",
        },
      });
    }
  }
}

async function seedDemoEnrollmentsAndBadges() {
  // Enroll a couple demo users so the learning UI shows meaningful data.
  const demoEnrollments = [
    {
      email: "ada.cassava@agripulse.demo",
      moduleTitle: "Cassava Fundamentals: Planting, Spacing, and Ridging",
      progressPercent: 100,
    },
    {
      email: "kelechi.maize@agripulse.demo",
      moduleTitle: "Maize Production: Nutrient Timing and Pest Scouting",
      progressPercent: 50,
    },
  ];

  const userEmails = demoEnrollments.map((e) => e.email);
  const users = await prisma.user.findMany({
    where: { email: { in: userEmails } },
    select: { email: true, agripreneur: { select: { id: true } } },
  });
  const agripreneurIdByEmail = new Map<string, string>();
  for (const u of users) {
    if (u.agripreneur?.id) agripreneurIdByEmail.set(u.email, u.agripreneur.id);
  }

  const moduleTitles = demoEnrollments.map((e) => e.moduleTitle);
  const modules = await prisma.learningModule.findMany({
    where: { title: { in: moduleTitles } },
    select: { id: true, title: true, badgeName: true },
  });
  const moduleIdByTitle = new Map<string, string>();
  const badgeNameByTitle = new Map<string, string | null>();
  for (const m of modules) {
    moduleIdByTitle.set(m.title, m.id);
    badgeNameByTitle.set(m.title, m.badgeName);
  }

  for (const e of demoEnrollments) {
    const agripreneurId = agripreneurIdByEmail.get(e.email);
    const moduleId = moduleIdByTitle.get(e.moduleTitle);
    if (!agripreneurId || !moduleId) continue;

    const exists = await prisma.learningEnrollment.findUnique({
      where: { agripreneurId_moduleId: { agripreneurId, moduleId } },
      select: { id: true },
    });
    if (exists) continue;

    const completed = e.progressPercent >= 100;

    const lessonCount = await prisma.lesson.count({ where: { moduleId } });
    await prisma.learningEnrollment.create({
      data: {
        agripreneurId,
        moduleId,
        progressPercent: Math.min(Math.max(e.progressPercent, 0), 100),
        currentLesson: e.progressPercent >= 100 ? lessonCount : Math.max(1, Math.floor(lessonCount / 2)),
        totalLessons: lessonCount,
        timeSpentMinutes: e.progressPercent >= 100 ? 90 : 35,
        lastViewedAt: new Date(),
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      const alreadyBadge = await prisma.badge.findFirst({
        where: { agripreneurId, moduleId },
        select: { id: true },
      });
      if (!alreadyBadge) {
        const badgeName = badgeNameByTitle.get(e.moduleTitle) ?? `${e.moduleTitle} Graduate`;
        await prisma.badge.create({
          data: {
            agripreneurId,
            name: badgeName,
            description: `Completed "${e.moduleTitle}" module`,
            moduleId,
          },
        });
      }
    }
  }
}

async function main() {
  await resetDemoDataIfRequested();

  const createdDemoUsers = await ensureDemoUsers();
  const ownersByEmail = await seedMarketplaceOwners();

  const ownersForListings = new Map(
    Array.from(ownersByEmail.entries()).map(([email, v]) => [
      email,
      { agripreneurId: v.agripreneurId, region: v.region as Region },
    ]),
  );

  await seedMarketplaceListings(ownersForListings);
  await seedCropAnalyticsData(ownersForListings);
  await seedLearningModules();
  await seedDemoEnrollmentsAndBadges();

  const demoEmails = createdDemoUsers
    .filter((u) => u.role === "agripreneur" || u.role === "admin")
    .map((u) => u.email);

  console.log("Seed complete.");
  console.log(`Demo password for seeded accounts: ${demoPassword}`);
  console.log(`Seeded accounts: ${demoEmails.join(", ")}`);
  if (RESET_DEMO) console.log("Reset mode used: demo data was replaced.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

