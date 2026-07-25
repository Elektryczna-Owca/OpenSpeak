import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

// Standard Toastmasters club meeting agenda. Times are minutes (min/expected/max);
// per-participant items use sub-item times (e.g. each prepared speech is 5–7 min).
const TOASTMASTERS_CSV = `title,min,expected,max,sub label,sub min,sub expected,sub max
Opening and welcoming guests,2,3,5,,,,
Introduction by the Toastmaster of the Evening,2,3,4,,,,
Helpers introductions: timer / grammarian / ah-counter,3,4,5,,,,
Prepared speeches,2,3,4,Speaker,5,6,7
Break,10,10,15,,,,
Table Topics — impromptu speaking,3,5,7,Participant,1,1.5,2
Speech evaluations,1,2,3,Evaluator,2,2.5,3
Table Topics evaluation,3,4,5,,,,
Helpers reports,3,5,6,Helper,1,1.5,2
General Evaluator report,3,5,7,,,,
Awards and closing,3,5,10,,,,
`

async function main() {
  const name = 'Toastmasters club meeting'
  const existing = await prisma.template.findFirst({ where: { name } })
  if (existing) {
    console.log(`Template "${name}" already exists — skipping`)
  } else {
    await prisma.template.create({ data: { name, csv: TOASTMASTERS_CSV } })
    console.log(`Seeded template "${name}"`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
