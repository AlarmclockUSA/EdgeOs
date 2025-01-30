import * as admin from 'firebase-admin'

// Initialize Firebase Admin
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('../service-account.json')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

async function setupSubcollections() {
  console.log('Setting up subcollections...')
  
  try {
    // Get all users
    const usersRef = db.collection('users')
    const usersSnapshot = await usersRef.get()
    
    console.log(`Found ${usersSnapshot.size} users to setup`)
    
    // Setup subcollections for each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      
      // Create a placeholder worksheet to ensure collection exists
      const placeholderRef = db.collection(`users/${userId}/worksheets`).doc('placeholder')
      await placeholderRef.set({
        _created: new Date().toISOString(),
        _description: 'Placeholder document to create worksheets collection'
      })
      
      console.log(`Created worksheets collection for user ${userId}`)
      
      // Delete the placeholder
      await placeholderRef.delete()
    }
    
    console.log('Collections setup completed!')
  } catch (error) {
    console.error('Error setting up collections:', error)
    throw error
  }
}

async function migrateWorksheets() {
  console.log('Starting worksheets migration...')
  
  try {
    // Setup collections first
    await setupSubcollections()
    
    // Get all worksheets from root collection
    const worksheetsRef = db.collection('worksheets')
    const snapshot = await worksheetsRef.get()
    
    console.log(`Found ${snapshot.size} worksheets to migrate`)
    
    let migratedCount = 0
    let skippedCount = 0
    
    // Migrate each worksheet
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()
      const userId = data.userId
      
      if (!userId) {
        console.warn(`Worksheet ${docSnapshot.id} has no userId, skipping...`)
        skippedCount++
        continue
      }

      try {
        // Create new document in user's worksheets collection
        const newDocRef = db.collection(`users/${userId}/worksheets`).doc(docSnapshot.id)
        await newDocRef.set({
          ...data,
          trainingId: docSnapshot.id, // Add training ID reference
          completedAt: data.completedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

        // If worksheet is completed, ensure progress is recorded
        if (data.completed) {
          const progressRef = db.doc(`users/${userId}/progress/trainings`)
          await progressRef.set({
            [docSnapshot.id]: {
              worksheetCompleted: true,
              lastUpdated: data.completedAt || new Date().toISOString()
            }
          }, { merge: true })
        }
        
        // Delete old document
        await docSnapshot.ref.delete()
        migratedCount++
        
        console.log(`Migrated worksheet ${docSnapshot.id} for user ${userId}`)
      } catch (error) {
        console.error(`Error migrating worksheet ${docSnapshot.id}:`, error)
        skippedCount++
      }
    }
    
    console.log('Migration completed successfully!')
    console.log(`Migrated ${migratedCount} worksheets`)
    console.log(`Skipped ${skippedCount} worksheets`)
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  }
}

migrateWorksheets() 