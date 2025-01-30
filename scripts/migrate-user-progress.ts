import * as admin from 'firebase-admin'

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('../service-account.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function migrateUserProgress() {
  console.log('Starting user progress migration...')
  
  try {
    // Get all user progress documents from root collection
    const userProgressRef = db.collection('userProgress')
    const snapshot = await userProgressRef.get()
    
    console.log(`Found ${snapshot.size} user progress documents to migrate`)
    
    let migratedCount = 0
    
    // Migrate each user progress document
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()
      const userId = data.userId
      const worksheetId = data.worksheetId
      
      if (!userId || !worksheetId) {
        console.warn(`User progress ${docSnapshot.id} has no userId or worksheetId, skipping...`)
        continue
      }
      
      // Create new document in user's subcollection
      const newDocRef = db.doc(`users/${userId}/progress/${worksheetId}`)
      await newDocRef.set({
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Delete old document
      await docSnapshot.ref.delete()
      migratedCount++
      
      console.log(`Migrated user progress for user ${userId}, worksheet ${worksheetId}`)
    }
    
    console.log('Migration completed successfully!')
    console.log(`Migrated ${migratedCount} user progress documents`)
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  }
}

migrateUserProgress() 