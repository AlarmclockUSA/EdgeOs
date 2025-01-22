import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// Initialize Firebase Admin
const serviceAccount = require(path.join(process.cwd(), 'service-account.json'))

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

async function updateRules() {
  console.log('Checking current Firestore rules...')
  
  try {
    // Read new rules from file
    const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8')
    console.log('\nNew rules to be applied:', rules)
    
    console.log('\nWARNING: This will replace all existing Firestore rules.')
    
    // Update rules
    await admin.securityRules().releaseRuleset({
      name: 'firestore.rules',
      source: {
        files: [{
          content: rules,
          name: 'firestore.rules'
        }]
      }
    })
    console.log('Successfully updated Firestore rules!')
  } catch (error) {
    console.error('Error updating rules:', error)
    process.exit(1)
  }
}

updateRules() 