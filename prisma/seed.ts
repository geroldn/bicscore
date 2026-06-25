import { config } from "dotenv"
config({ path: ".env.local" })

import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"
import { PrismaClient } from "../app/generated/prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await hash("mamalou", 12)

  await prisma.user.upsert({
    where: { username: "root" },
    update: {},
    create: {
      username: "root",
      name: "Root",
      role: "ROOT",
      password,
    },
  })

  console.log("Seeded root user (username: root, password: )")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
