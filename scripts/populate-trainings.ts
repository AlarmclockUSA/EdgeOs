import * as admin from 'firebase-admin'
import * as path from 'path'
import fetch from 'node-fetch'

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(process.cwd(), 'service-account.json'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// These are the actual training IDs and titles from the user progress
const trainings = {
  '2258181': '1.1 Introduction to Leadership',
  '2258182': '1.2 Understanding Your Role',
  '2258183': '1.3 Setting Clear Expectations',
  '2258184': '2.1 Building Trust',
  '2258185': '2.2 Effective Communication',
  '2258186': '2.3 Active Listening',
  '2258187': '3.1 Time Management',
  '2258188': '3.2 Delegation Skills',
  '2258189': '3.3 Priority Setting',
  '2258190': '4.1 Strategic Thinking',
  '2258191': '4.2 The Power of Buckets',
  '2258192': '4.3 Decision Making'
}

async function populateTrainings() {
  try {
    console.log('Starting to populate trainings...')
    for (const [id, title] of Object.entries(trainings)) {
      console.log(`Adding training ${id}...`)
      await db.doc(`trainings/${id}`).set({
        title,
        updatedAt: admin.firestore.Timestamp.now()
      })
      console.log(`Successfully added training: ${id} -> ${title}`)
    }
    console.log('Finished populating trainings')
    process.exit(0)
  } catch (error) {
    console.error('Error populating trainings:', error)
    process.exit(1)
  }
}

populateTrainings() 