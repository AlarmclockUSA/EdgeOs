import * as admin from 'firebase-admin'

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('../service-account.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function migrateBoldActions() {
  console.log('Starting bold actions migration...')
  
  try {
    // Get all bold actions from root collection
    const boldActionsRef = db.collection('boldActions')
    const snapshot = await boldActionsRef.get()
    
    console.log(`Found ${snapshot.size} bold actions to migrate`)
    
    let migratedCount = 0
    
    // Migrate each bold action
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()
      const userId = data.userId // Note: lowercase userId
      
      if (!userId) {
        console.warn(`Bold action ${docSnapshot.id} has no userId, skipping...`)
        continue
      }
      
      // Create new document in user's subcollection
      const newDocRef = db.doc(`users/${userId}/boldActions/${docSnapshot.id}`)
      await newDocRef.set({
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Delete old document
      await docSnapshot.ref.delete()
      migratedCount++
      
      console.log(`Migrated bold action ${docSnapshot.id} for user ${userId}`)
    }
    
    console.log('Migration completed successfully!')
    console.log(`Migrated ${migratedCount} bold actions`)
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  }
}

migrateBoldActions() 