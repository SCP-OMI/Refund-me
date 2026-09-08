import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  const certifications = [
    {
      name: "OSCP (OffSec Certified Professional)",
      provider: "OffSec",
      fixedCost: 1649.0, // Updated 2024 pricing
      currency: "USD",
    },
    {
      name: "AWS Certified Solutions Architect - Associate",
      provider: "Amazon Web Services",
      fixedCost: 150.0,
      currency: "USD",
    },
    {
      name: "CKAD (Certified Kubernetes Application Developer)",
      provider: "The Linux Foundation",
      fixedCost: 395.0,
      currency: "USD",
    },
  ];

  for (const cert of certifications) {
    await prisma.certificateCatalog.upsert({
      where: { id: "temp-id-check" }, // We don't have a unique name constraint yet, so we'll just create or skip based on check below
      update: {},
      create: cert,
    });
    // Since we don't have unique constraint on Name, we should check if exists first to avoid duplicates in this simple seed
    // actually, let's just use createMany with skip duplicates if we had IDs.
    // simpler approach for 'seed': delete all and recreate, or check existence.
  }
  
  // Cleaner Approach: Check and Create
  for (const cert of certifications) {
    const existing = await prisma.certificateCatalog.findFirst({
        where: { name: cert.name }
    });
    
    if (!existing) {
        await prisma.certificateCatalog.create({ data: cert });
        console.log(`+ Created cert: ${cert.name}`);
    } else {
        console.log(`= Skipped cert: ${cert.name} (already exists)`);
    }
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
