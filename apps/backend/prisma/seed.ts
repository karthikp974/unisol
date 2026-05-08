import { PrismaClient, CampusIsolationPolicy, ProgramDurationUnit, UserType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const programs = [
  {
    code: "BTECH",
    name: "B.Tech",
    durationValue: 4,
    semesters: 8,
    branches: [
      ["AI", "Artificial Intelligence"],
      ["AI_ML", "Artificial Intelligence & Machine Learning"],
      ["DS", "Data Science"],
      ["DS_AI", "Data Science & Artificial Intelligence"],
      ["CS", "Cyber Security"]
    ]
  },
  {
    code: "MTECH",
    name: "M.Tech",
    durationValue: 2,
    semesters: 4,
    branches: [
      ["AI", "Artificial Intelligence"],
      ["AI_ML", "Artificial Intelligence & Machine Learning"],
      ["DS", "Data Science"],
      ["DS_AI", "Data Science & Artificial Intelligence"],
      ["CS", "Cyber Security"]
    ]
  },
  {
    code: "DIPLOMA",
    name: "Diploma",
    durationValue: 3,
    semesters: 6,
    branches: [["CSE", "Computer Science"]]
  },
  {
    code: "PG",
    name: "Post Graduate",
    durationValue: 2,
    semesters: 4,
    branches: [
      ["MCA", "Master of Computer Applications"],
      ["MBA", "Master of Business Administration"]
    ]
  }
];

async function main() {
  const sharedGroup = await prisma.campusGroup.upsert({
    where: { name: "KIET-KIEK Shared Group" },
    update: {},
    create: { name: "KIET-KIEK Shared Group", isolationPolicy: CampusIsolationPolicy.SHARED }
  });

  const isolatedGroup = await prisma.campusGroup.upsert({
    where: { name: "KIEW Isolated Group" },
    update: {},
    create: { name: "KIEW Isolated Group", isolationPolicy: CampusIsolationPolicy.ISOLATED }
  });

  const campusInputs = [
    { code: "KIET", name: "KIET", groupId: sharedGroup.id },
    { code: "KIEK", name: "KIEK", groupId: sharedGroup.id },
    { code: "KIEW", name: "KIEW", groupId: isolatedGroup.id }
  ];

  for (const campusInput of campusInputs) {
    const campus = await prisma.campus.upsert({
      where: { code: campusInput.code },
      update: { groupId: campusInput.groupId },
      create: campusInput
    });

    for (const programInput of programs) {
      const program = await prisma.program.upsert({
        where: { campusId_code: { campusId: campus.id, code: programInput.code } },
        update: {},
        create: {
          campusId: campus.id,
          code: programInput.code,
          name: programInput.name,
          durationValue: programInput.durationValue,
          durationUnit: ProgramDurationUnit.YEAR,
          semesters: programInput.semesters
        }
      });

      for (const [code, name] of programInput.branches) {
        await prisma.branch.upsert({
          where: { programId_code: { programId: program.id, code } },
          update: {},
          create: { programId: program.id, code, name }
        });
      }
    }
  }

  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  await prisma.user.upsert({
    where: { email: "admin@college-erp.local" },
    update: { username: "admin" },
    create: {
      email: "admin@college-erp.local",
      username: "admin",
      passwordHash,
      fullName: "Chairman Admin",
      type: UserType.ADMIN
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
