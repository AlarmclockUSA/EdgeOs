import * as admin from 'firebase-admin'
import * as path from 'path'

// Initialize Firebase Admin
const serviceAccount = require(path.join(process.cwd(), 'service-account.json'))
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

async function checkWorksheets() {
  console.log('Checking worksheets...')

  // Check root worksheets collection
  const rootWorksheets = await db.collection('worksheets').get()
  console.log(`Found ${rootWorksheets.size} worksheets in root collection`)

  // Check user subcollections
  const users = await db.collection('users').get()
  console.log(`Found ${users.size} users`)

  for (const user of users.docs) {
    const userWorksheets = await db.collection(`users/${user.id}/worksheets`).get()
    console.log(`User ${user.id} has ${userWorksheets.size} worksheets`)
    
    if (userWorksheets.size > 0) {
      console.log('Sample worksheet data:')
      console.log(userWorksheets.docs[0].data())
    }
  }

  console.log('Worksheet check complete')
  process.exit(0)
}

checkWorksheets().catch(error => {
  console.error('Error checking worksheets:', error)
  process.exit(1)
}) 