import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { db } from './firebase'

export async function initializeDatabase() {
  const auth = getAuth();

  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const trainingsRef = collection(db, 'trainings')
          const dummyDoc = doc(trainingsRef, 'dummy')
          
          // Check if the document exists first
          const docSnap = await getDoc(dummyDoc);
          
          if (!docSnap.exists()) {
            // Only create the document if it doesn't exist
            await setDoc(dummyDoc, { initialized: true }, { merge: true })
          }
          
          console.log('Database initialized successfully')
          resolve(true)
        } catch (error) {
          console.error('Error initializing database:', error)
          reject(error)
        }
      } else {
        console.log('User not authenticated. Skipping database initialization.')
        resolve(false)
      }
    })
  })
}

