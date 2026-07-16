// Seeds the database with a mix of:
//  1. Real, verified government and private scholarships (source: GOVERNMENT / PRIVATE),
//     sourced from official programme pages as of July 2026. Amounts, eligibility, and
//     deadlines are accurate at time of writing but change year to year — the
//     `officialUrl` on each is the source of truth, always link out to it.
//  2. Studently's own weekly-test-funded scholarships (source: STUDENTLY_WEEKLY),
//     which are the platform's real product, distinct from the external listings.
//
// Usage: npm run db:seed  (after `npm run db:migrate`)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- Sponsors (for Studently's own pool-funded scholarships) ---
  const studentlyPool = await prisma.sponsor.create({
    data: { name: "Studently Weekly Test Pool", totalPledged: 1284600, totalDisbursed: 1284600 },
  });

  // --- Real external scholarships: GOVERNMENT (via National Scholarship Portal / AICTE) ---
  await prisma.scholarship.createMany({
    data: [
      {
        title: "Central Sector Scheme of Scholarship (CSSS)",
        source: "GOVERNMENT",
        providerName: "Department of Higher Education, Govt. of India (via NSP)",
        officialUrl: "https://scholarships.gov.in/",
        amount: 20000,
        qualification: "Class 12",
        location: "All India",
        description: "For the top 20th percentile of Class 12 board toppers going on to college/university. Renewable each year based on academic performance. Applications open on the National Scholarship Portal for the 2026-27 cycle.",
        deadline: new Date("2026-10-31"),
      },
      {
        title: "AICTE Pragati Scholarship for Girls",
        source: "GOVERNMENT",
        providerName: "All India Council for Technical Education (AICTE), via NSP",
        officialUrl: "https://www.aicte-india.org/schemes/students-development-schemes/Pragati",
        amount: 50000,
        qualification: "Diploma",
        location: "All India",
        description: "₹50,000/year for girl students admitted to the 1st year of an AICTE-approved technical degree or diploma programme. Family income must not exceed ₹8 lakh/year. Up to 2 girls per family may apply. 10,000 scholarships awarded annually.",
        deadline: new Date("2026-10-31"),
      },
      {
        title: "AICTE Saksham Scholarship for Specially-Abled Students",
        source: "GOVERNMENT",
        providerName: "All India Council for Technical Education (AICTE), via NSP",
        officialUrl: "https://www.aicte-india.org/schemes/students-development-schemes/Saksham",
        amount: 50000,
        qualification: "Diploma",
        location: "All India",
        description: "₹50,000/year for differently-abled students (minimum 40% disability) admitted to an AICTE-approved technical degree/diploma programme. Family income must not exceed ₹8 lakh/year.",
        deadline: new Date("2026-10-31"),
      },
      {
        title: "National Means-cum-Merit Scholarship (NMMSS)",
        source: "GOVERNMENT",
        providerName: "Department of School Education & Literacy, Govt. of India (via NSP)",
        officialUrl: "https://scholarships.gov.in/",
        amount: 12000,
        qualification: "Class 9",
        location: "All India",
        description: "₹12,000/year for meritorious students from economically weaker sections, to prevent dropout after Class 8 and support continued education through Class 12.",
        deadline: new Date("2026-10-31"),
      },
    ],
  });

  // --- Real external scholarships: PRIVATE (corporate/foundation) ---
  await prisma.scholarship.createMany({
    data: [
      {
        title: "Reliance Foundation Undergraduate Scholarship",
        source: "PRIVATE",
        providerName: "Reliance Foundation",
        officialUrl: "https://www.scholarships.reliancefoundation.org/UG_Scholarship.aspx",
        amount: 200000,
        qualification: "Undergraduate",
        location: "All India",
        description: "Merit-cum-means scholarship of up to ₹2 lakh over the full undergraduate degree, for 1st-year students in any stream with household income under ₹15 lakh (preference to under ₹2.5 lakh). Selection includes a mandatory 60-minute online aptitude test. Supports ~5,000 scholars annually.",
        deadline: new Date("2026-10-15"),
      },
      {
        title: "Reliance Foundation Postgraduate Scholarship",
        source: "PRIVATE",
        providerName: "Reliance Foundation",
        officialUrl: "https://www.scholarships.reliancefoundation.org/",
        amount: 600000,
        qualification: "Postgraduate",
        location: "All India",
        description: "Up to ₹6 lakh over the postgraduate programme for students in AI, Computer Science, Mathematics & Computing, Electrical/Electronics, Chemical/Mechanical Engineering, Renewable Energy, Material Science, or Life Sciences. Requires a GATE score of 550-1000 or UG CGPA of 7.5+.",
        deadline: new Date("2026-10-15"),
      },
    ],
  });

  // --- Studently's own weekly-test-funded scholarships (the real product) ---
  await prisma.scholarship.createMany({
    data: [
      {
        title: "Studently Weekly Scholarship — Banking Category",
        source: "STUDENTLY_WEEKLY",
        sponsorId: studentlyPool.id,
        providerName: "Studently Weekly Test Pool",
        amount: 15000,
        qualification: "Undergraduate",
        location: "All India",
        description: "Awarded to the top-ranked students in this week's Banking category scholarship test. Funded entirely by Studently's weekly test pool — take the test to become eligible.",
        deadline: new Date(Date.now() + 2 * 86400000),
      },
      {
        title: "Studently Weekly Scholarship — JEE Category",
        source: "STUDENTLY_WEEKLY",
        sponsorId: studentlyPool.id,
        providerName: "Studently Weekly Test Pool",
        amount: 12000,
        qualification: "Class 12",
        location: "All India",
        description: "Awarded to the top-ranked students in this week's JEE category scholarship test. Funded entirely by Studently's weekly test pool — take the test to become eligible.",
        deadline: new Date(Date.now() + 4 * 86400000),
      },
    ],
  });

  // --- Jobs: real, verifiable listings only ---
  // Unlike scholarships, actual private-company openings (specific roles at Razorpay,
  // Zoho, etc.) churn daily and can't be safely hardcoded here without going stale or
  // simply being fabricated. What IS stable and real, the same way government
  // scholarship schemes were, are government recruitment exams and internship schemes —
  // so that's what's seeded, each tagged with its real source and official link.
  // (Accurate as of July 2026 — verify exact dates/stipends on the official links before
  // students rely on them, since notification windows shift.)
  await prisma.job.createMany({
    data: [
      {
        role: "SSC CGL 2026 — Combined Graduate Level",
        company: "Staff Selection Commission (SSC)",
        location: "All India",
        salary: "₹25,500–₹1,51,100 (Pay Level 4–8)",
        type: "GOVERNMENT",
        employmentTerm: "Central Govt · Group B/C",
        description: "~12,256 vacancies across central govt ministries/departments. 2026 notification released; Tier 1 exam expected Aug–Sep 2026. Always confirm current application status on the official site.",
        source: "GOVERNMENT_EXAM",
        providerName: "Staff Selection Commission, Govt. of India",
        officialUrl: "https://ssc.gov.in/",
      },
      {
        role: "IBPS PO/MT 2026 — Probationary Officer (CRP-XVI)",
        company: "Institute of Banking Personnel Selection (IBPS)",
        location: "All India",
        salary: "₹48,480 basic (in-hand ≈ ₹74,000–₹76,000/mo)",
        type: "GOVERNMENT",
        employmentTerm: "PSU Bank · 2-yr probation",
        description: "6,715 vacancies across 11 public sector banks. Online applications open now — closes 21 July 2026. Prelims: 22–23 Aug 2026.",
        status: "PUBLISHED",
        source: "GOVERNMENT_EXAM",
        providerName: "Institute of Banking Personnel Selection",
        officialUrl: "https://www.ibps.in/",
        applicationDeadline: new Date("2026-07-21"),
      },
      {
        role: "PM Internship Scheme 2026",
        company: "Ministry of Corporate Affairs, Govt. of India",
        location: "All India (rolling, sector/location choice)",
        salary: "Monthly stipend + ₹6,000 one-time joining grant (confirm current stipend on portal — sources vary)",
        type: "INTERNSHIP",
        employmentTerm: "6–12 months",
        description: "Rolling internship programme placing candidates aged 21–24 inside India's top 500 companies by CSR spend. No application fee, ever. Runs on a continuous rolling model rather than fixed rounds.",
        source: "GOVERNMENT_SCHEME",
        providerName: "Ministry of Corporate Affairs (PMIS)",
        officialUrl: "https://pminternship.mca.gov.in/",
      },
      {
        role: "Browse verified private-sector jobs & internships",
        company: "National Career Service (NCS)",
        location: "All India",
        salary: "Varies by employer",
        type: "REMOTE",
        employmentTerm: "Aggregator portal",
        description: "Government-run job portal aggregating real, verified private and public employer postings across sectors — the honest place to find current company openings instead of a hardcoded list here.",
        source: "EXTERNAL_PORTAL",
        providerName: "National Career Service, Ministry of Labour & Employment",
        officialUrl: "https://www.ncs.gov.in/",
      },
    ],
  });

  // --- Opportunity Aggregation Engine: Source registry ---
  // Two sources are enabled out of the box because Greenhouse's and Lever's
  // public job-board APIs are stable, documented, and don't need an API key —
  // safe to actually run against on day one. The rest are seeded disabled as
  // worked examples: flip `enabled: true` and fill in `config` once you have
  // real credentials/selectors for that source (see each connector's comment
  // in lib/aggregator/connectors/ for the exact config shape expected).
  await prisma.source.createMany({
    data: [
      {
        name: "GitLab — Greenhouse",
        kind: "GREENHOUSE_API",
        targetType: "JOB",
        url: "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs",
        config: { boardToken: "gitlab", organizationName: "GitLab" },
        enabled: true,
        fetchIntervalMins: 360,
      },
      {
        name: "Lever — Lever's own careers page",
        kind: "LEVER_API",
        targetType: "JOB",
        url: "https://api.lever.co/v0/postings/lever?mode=json",
        config: { account: "lever", organizationName: "Lever" },
        enabled: true,
        fetchIntervalMins: 360,
      },
      {
        name: "[Example] PIB press releases RSS — verify feed URL before enabling",
        kind: "RSS_FEED",
        targetType: "JOB",
        url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
        config: { organizationName: "Press Information Bureau, Govt. of India", defaultLocation: "All India" },
        enabled: false,
      },
      {
        name: "[Example] data.gov.in open dataset — add your API key",
        kind: "JSON_API",
        targetType: "SCHOLARSHIP",
        url: "https://api.data.gov.in/resource/REPLACE-WITH-RESOURCE-ID",
        config: {
          apiKeyEnvVar: "DATA_GOV_IN_KEY",
          apiKeyQueryParam: "api-key",
          recordsPath: "records",
          fieldMap: {
            externalId: "id",
            title: "scheme_name",
            organization: "ministry",
            location: "state",
            description: "details",
            applyUrl: "official_link",
            deadlineRaw: "last_date",
            compensationRaw: "amount",
          },
          extraQuery: { format: "json", limit: "200" },
        },
        enabled: false,
      },
      {
        name: "[Example] Partner feed — fill in a real partner URL",
        kind: "PARTNER_FEED",
        targetType: "INTERNSHIP",
        url: "https://partner.example.com/studently-feed.json",
        config: { apiKeyEnvVar: "PARTNER_EXAMPLE_KEY" },
        enabled: false,
      },
      {
        name: "[Example] University placement notice board — fill in real selectors",
        kind: "NOTICE_BOARD",
        targetType: "JOB",
        url: "https://www.example.ac.in/placements/notices",
        config: {
          itemSelector: ".notice-list li",
          titleSelector: "a",
          linkSelector: "a",
          organizationName: "Example University",
        },
        enabled: false,
      },
    ],
  });

  // --- Weekly Scholarship Tests: one live test per major category, each with
  // a full question set. startsAt is in the past and endsAt in the future so
  // these are immediately "live" and takeable right after seeding — the app
  // has no fallback/mock test data, so without this the Weekly Test page has
  // nothing to show for most categories. ---
  const testDefs = [
    {
      category: "BANKING",
      title: "Banking Weekly Test — Week 27",
      weekNumber: 27,
      scholarshipPoolAmount: 100000,
      questions: [
        { text: "If the marked price is ₹1,200 with a 15% discount, what is the selling price?", options: ["₹1,020", "₹1,080", "₹1,140", "₹960"], correctIndex: 1 },
        { text: "Choose the correctly spelled word:", options: ["Occassion", "Ocasion", "Occasion", "Occaision"], correctIndex: 2 },
        { text: "A train 150m long crosses a pole in 15 seconds. What is its speed in km/h?", options: ["30 km/h", "36 km/h", "45 km/h", "40 km/h"], correctIndex: 1 },
        { text: "Simple interest on ₹5,000 at 8% p.a. for 3 years is:", options: ["₹1,000", "₹1,200", "₹1,500", "₹800"], correctIndex: 1 },
        { text: "Find the odd one out: Cheque, Draft, NEFT, Passbook", options: ["Cheque", "Draft", "NEFT", "Passbook"], correctIndex: 3 },
        { text: "RBI's Monetary Policy Committee has how many members?", options: ["4", "6", "8", "10"], correctIndex: 1 },
        { text: "Synonym of 'Prudent':", options: ["Careless", "Wise", "Angry", "Slow"], correctIndex: 1 },
        { text: "If 20% of a number is 50, the number is:", options: ["200", "250", "150", "100"], correctIndex: 1 },
      ],
    },
    {
      category: "SSC",
      title: "SSC Weekly Test — Week 27",
      weekNumber: 27,
      scholarshipPoolAmount: 80000,
      questions: [
        { text: "Who is known as the 'Iron Man of India'?", options: ["Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "Bhagat Singh", "Subhas Chandra Bose"], correctIndex: 1 },
        { text: "The Fundamental Rights are enshrined in which Part of the Indian Constitution?", options: ["Part II", "Part III", "Part IV", "Part V"], correctIndex: 1 },
        { text: "Antonym of 'Ancient':", options: ["Old", "Modern", "Historic", "Rare"], correctIndex: 1 },
        { text: "The longest river in India is:", options: ["Yamuna", "Godavari", "Ganga", "Brahmaputra"], correctIndex: 2 },
        { text: "Find the next number: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "44"], correctIndex: 2 },
        { text: "The Battle of Plassey was fought in:", options: ["1757", "1764", "1857", "1947"], correctIndex: 0 },
      ],
    },
    {
      category: "UPSC",
      title: "UPSC Weekly Test — Week 27",
      weekNumber: 27,
      scholarshipPoolAmount: 120000,
      questions: [
        { text: "The 'Directive Principles of State Policy' are borrowed from the constitution of:", options: ["USA", "UK", "Ireland", "Canada"], correctIndex: 2 },
        { text: "Who was the first Chief Election Commissioner of India?", options: ["Sukumar Sen", "T.N. Seshan", "S.Y. Quraishi", "V.S. Sampath"], correctIndex: 0 },
        { text: "The Tropic of Cancer does NOT pass through which state?", options: ["Gujarat", "Madhya Pradesh", "Punjab", "West Bengal"], correctIndex: 2 },
        { text: "The 'Green Revolution' in India is most associated with which crop?", options: ["Rice", "Wheat", "Sugarcane", "Cotton"], correctIndex: 1 },
        { text: "Article 370, now abrogated, applied to:", options: ["Punjab", "Jammu & Kashmir", "Assam", "Sikkim"], correctIndex: 1 },
      ],
    },
    {
      category: "JEE",
      title: "JEE Weekly Test — Week 27",
      weekNumber: 27,
      scholarshipPoolAmount: 90000,
      questions: [
        { text: "The SI unit of electric resistance is:", options: ["Volt", "Ampere", "Ohm", "Watt"], correctIndex: 2 },
        { text: "The derivative of sin(x) with respect to x is:", options: ["cos(x)", "-cos(x)", "-sin(x)", "tan(x)"], correctIndex: 0 },
        { text: "Which of these is an example of a redox reaction?", options: ["NaCl dissolving in water", "Zn + CuSO4 → ZnSO4 + Cu", "Ice melting", "NaOH + HCl → NaCl + H2O"], correctIndex: 1 },
        { text: "The value of ∫0^1 x dx is:", options: ["0", "1/2", "1", "2"], correctIndex: 1 },
        { text: "Which quantum number determines the shape of an orbital?", options: ["Principal", "Azimuthal", "Magnetic", "Spin"], correctIndex: 1 },
      ],
    },
    {
      category: "NEET",
      title: "NEET Weekly Test — Week 27",
      weekNumber: 27,
      scholarshipPoolAmount: 90000,
      questions: [
        { text: "The powerhouse of the cell is:", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], correctIndex: 2 },
        { text: "Human beings have how many pairs of chromosomes?", options: ["21", "22", "23", "24"], correctIndex: 2 },
        { text: "Which hormone regulates blood sugar levels?", options: ["Thyroxine", "Insulin", "Adrenaline", "Estrogen"], correctIndex: 1 },
        { text: "The functional unit of the kidney is called:", options: ["Neuron", "Nephron", "Alveolus", "Villus"], correctIndex: 1 },
        { text: "Photosynthesis primarily occurs in the:", options: ["Roots", "Chloroplast", "Mitochondria", "Nucleus"], correctIndex: 1 },
      ],
    },
    {
      category: "SCHOOL",
      title: "School Weekly Test — Week 27",
      weekNumber: 27,
      scholarshipPoolAmount: 50000,
      questions: [
        { text: "What is the capital of India?", options: ["Mumbai", "Kolkata", "New Delhi", "Chennai"], correctIndex: 2 },
        { text: "7 × 8 = ?", options: ["54", "56", "58", "64"], correctIndex: 1 },
        { text: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctIndex: 1 },
        { text: "The chemical formula of water is:", options: ["CO2", "H2O", "O2", "NaCl"], correctIndex: 1 },
        { text: "Choose the correct plural of 'child':", options: ["Childs", "Childes", "Children", "Childrens"], correctIndex: 2 },
      ],
    },
    {
      category: "COLLEGE",
      title: "College Weekly Test — Week 27",
      weekNumber: 27,
      scholarshipPoolAmount: 100000,
      questions: [
        { text: "Which data structure uses FIFO order?", options: ["Stack", "Queue", "Tree", "Graph"], correctIndex: 1 },
        { text: "The time complexity of binary search is:", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], correctIndex: 2 },
        { text: "In economics, 'inflation' refers to:", options: ["Falling prices", "Rising prices", "Stable prices", "Falling wages"], correctIndex: 1 },
        { text: "Which of these is NOT an OOP concept?", options: ["Inheritance", "Polymorphism", "Compilation", "Encapsulation"], correctIndex: 2 },
        { text: "GDP stands for:", options: ["Gross Domestic Product", "General Domestic Price", "Gross Development Plan", "General Direct Product"], correctIndex: 0 },
      ],
    },
  ];

  const createdTests = [];
  for (const def of testDefs) {
    const t = await prisma.weeklyTest.create({
      data: {
        title: def.title,
        category: def.category,
        weekNumber: def.weekNumber,
        startsAt: new Date(Date.now() - 6 * 3600000), // started 6h ago
        endsAt: new Date(Date.now() + 3 * 86400000), // closes in 3 days
        scholarshipPoolAmount: def.scholarshipPoolAmount,
      },
    });
    await prisma.question.createMany({
      data: def.questions.map((q, i) => ({
        testId: t.id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        order: i + 1,
      })),
    });
    createdTests.push(t);
  }

  const user = await prisma.user.create({
    data: {
      phone: "9876543210",
      email: "yash@example.com",
      role: "STUDENT",
      student: {
        create: {
          fullName: "Yash Rathore",
          city: "Kanpur",
          qualification: "Undergraduate",
          institution: "SOIL School of Business Design",
          profileCompletion: 82,
          eligibilityScore: 91,
          resumeScore: 76,
          xp: 1240,
          level: 4,
        },
      },
    },
  });

  await prisma.payment.create({
    data: { userId: user.id, amount: 499, provider: "RAZORPAY", status: "SUCCESS", planName: "Premium Monthly" },
  });

  console.log(`Seed complete: 4 government scholarships, 2 private scholarships, 2 Studently weekly-pool scholarships, 4 jobs, ${createdTests.length} weekly tests across all categories (live now), 1 student.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
