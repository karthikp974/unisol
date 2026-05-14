import { CampusIsolationPolicy, PrismaClient, ProgramDurationUnit, StructureStatus, UserType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const academicCatalog = {
  KIET: [
    {
      code: "DIPLOMA",
      name: "Diploma",
      durationYears: 3,
      branches: [
        { code: "ME", name: "Mechanical Engineering" },
        { code: "CSE", name: "Computer Science Engineering" }
      ]
    },
    {
      code: "BTECH",
      name: "BTech",
      durationYears: 4,
      branches: [
        { code: "CSC", name: "CSE Cyber Security" },
        { code: "CSDS", name: "CSE Data Science" },
        { code: "CSAIML", name: "CSE AI and Machine Learning" },
        { code: "CSAIDS", name: "CSE AI and Data Science" },
        { code: "CSAI", name: "CSE Artificial Intelligence" }
      ]
    },
    {
      code: "MTECH",
      name: "MTech",
      durationYears: 2,
      branches: [
        { code: "CSC", name: "Cyber Security" },
        { code: "DS", name: "Data Science" },
        { code: "AIML", name: "AI and Machine Learning" },
        { code: "AIDS", name: "AI and Data Science" },
        { code: "AI", name: "Artificial Intelligence" }
      ]
    },
    {
      code: "MBA",
      name: "MBA",
      durationYears: 2,
      branches: [{ code: "CS", name: "Computer Science" }]
    },
    {
      code: "MCA",
      name: "MCA",
      durationYears: 2,
      branches: [{ code: "CS", name: "Computer Science" }]
    }
  ],
  KIEK: [
    {
      code: "DIPLOMA",
      name: "Diploma",
      durationYears: 3,
      branches: [
        { code: "ME", name: "Mechanical Engineering" },
        { code: "CSE", name: "Computer Science Engineering" }
      ]
    },
    {
      code: "BTECH",
      name: "BTech",
      durationYears: 4,
      branches: [
        { code: "CSC", name: "CSE Cyber Security" },
        { code: "CSDS", name: "CSE Data Science" },
        { code: "CSAIML", name: "CSE AI and Machine Learning" },
        { code: "CSAIDS", name: "CSE AI and Data Science" },
        { code: "CSAI", name: "CSE Artificial Intelligence" }
      ]
    },
    {
      code: "MTECH",
      name: "MTech",
      durationYears: 2,
      branches: [
        { code: "CSC", name: "Cyber Security" },
        { code: "DS", name: "Data Science" },
        { code: "AIML", name: "AI and Machine Learning" },
        { code: "AIDS", name: "AI and Data Science" },
        { code: "AI", name: "Artificial Intelligence" }
      ]
    }
  ],
  KIEW: [
    {
      code: "BTECH",
      name: "BTech",
      durationYears: 4,
      branches: [
        { code: "CSAIML", name: "CSE AI and Machine Learning" },
        { code: "CSAIDS", name: "CSE AI and Data Science" },
        { code: "CSAI", name: "CSE Artificial Intelligence" }
      ]
    },
    {
      code: "MTECH",
      name: "MTech",
      durationYears: 2,
      branches: [
        { code: "CSE", name: "Computer Science Engineering" },
        { code: "DS", name: "Data Science" },
        { code: "CSAIML", name: "CSE AI and Machine Learning" },
        { code: "AIDS", name: "AI and Data Science" },
        { code: "CSAI", name: "CSE Artificial Intelligence" }
      ]
    }
  ]
} as const;

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
      update: { groupId: campusInput.groupId, name: campusInput.name, isActive: true, status: StructureStatus.ACTIVE },
      create: { ...campusInput, isActive: true, status: StructureStatus.ACTIVE }
    });

    for (const departmentInput of academicCatalog[campusInput.code as keyof typeof academicCatalog]) {
      const department = await prisma.program.upsert({
        where: { campusId_code: { campusId: campus.id, code: departmentInput.code } },
        update: {
          name: departmentInput.name,
          durationValue: departmentInput.durationYears,
          durationUnit: ProgramDurationUnit.YEAR,
          semesters: departmentInput.durationYears * 2,
          status: StructureStatus.ACTIVE,
          isArchived: false,
          archivedAt: null
        },
        create: {
          campusId: campus.id,
          code: departmentInput.code,
          name: departmentInput.name,
          durationValue: departmentInput.durationYears,
          durationUnit: ProgramDurationUnit.YEAR,
          semesters: departmentInput.durationYears * 2,
          status: StructureStatus.ACTIVE
        }
      });

      for (const branchInput of departmentInput.branches) {
        await prisma.branch.upsert({
          where: { programId_code: { programId: department.id, code: branchInput.code } },
          update: {
            name: branchInput.name,
            status: StructureStatus.ACTIVE,
            isArchived: false,
            archivedAt: null
          },
          create: {
            programId: department.id,
            code: branchInput.code,
            name: branchInput.name,
            status: StructureStatus.ACTIVE
          }
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
