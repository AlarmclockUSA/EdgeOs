'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, X, Eye, EyeOff } from 'lucide-react'
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password: string) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

const isValidCompanyName = (name: string) => {
  return name.length >= 2 && name.length <= 100;
};

const isValidCompanySize = (size: string) => {
  if (!size) return false;
  const numSize = parseInt(size);
  // Check if it's a valid number and within reasonable bounds
  return !isNaN(numSize) && numSize >= 1 && numSize <= 10000 && size.trim() === numSize.toString();
};

export default function CompanySetup() {
  const [step, setStep] = useState(1)
  const [masterPassword, setMasterPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [executiveEmail, setExecutiveEmail] = useState('')
  const [executivePassword, setExecutivePassword] = useState('')
  const [executiveFirstName, setExecutiveFirstName] = useState('')
  const [executiveLastName, setExecutiveLastName] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExecutivePassword, setShowExecutivePassword] = useState(false)
  const [showMasterPassword, setShowMasterPassword] = useState(false)
  const router = useRouter()

  const validateStep1 = useCallback(() => {
    const errors: Record<string, string> = {}
    if (masterPassword.length === 0) {
      errors.masterPassword = 'Master password is required'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [masterPassword])

  const validateStep2 = useCallback(() => {
    const errors: Record<string, string> = {}
    console.log('Validating Step 2:', {
      companyName,
      companySize
    });

    if (!companyName) {
      errors.companyName = 'Company name is required'
    } else if (!isValidCompanyName(companyName)) {
      errors.companyName = 'Company name must be between 2 and 100 characters'
    }

    if (!companySize) {
      errors.companySize = 'Company size is required'
    } else if (!isValidCompanySize(companySize)) {
      errors.companySize = 'Company size must be a number between 1 and 10000'
    }

    console.log('Validation Errors:', errors);
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [companyName, companySize])

  const validateStep3 = useCallback(() => {
    const errors: Record<string, string> = {}
    if (executiveFirstName.length === 0) {
      errors.executiveFirstName = 'First name is required'
    }
    if (executiveLastName.length === 0) {
      errors.executiveLastName = 'Last name is required'
    }
    if (!isValidEmail(executiveEmail)) {
      errors.executiveEmail = 'Valid email is required'
    }
    if (!isValidPassword(executivePassword)) {
      errors.executivePassword = 'Password must be at least 8 characters and include uppercase, lowercase, and numbers'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [executiveFirstName, executiveLastName, executiveEmail, executivePassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Only check master password in step 1
    if (step === 1) {
      if (masterPassword !== "Password") {
        setError('Please contact support for the correct master password');
        return;
      }
      nextStep();
      return;
    }

    // Only validate email and proceed with Firebase auth in final step
    if (step === 3) {
      if (!isValidEmail(executiveEmail)) {
        setError('Please enter a valid email address');
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        // Check if the company already exists first
        const companyRef = doc(db, 'companies', companyName)
        const companyDoc = await getDoc(companyRef)

        if (companyDoc.exists()) {
          setError('A company with this name already exists')
          setIsSubmitting(false);
          return;
        }

        // Create the executive user first
        const userCredential = await createUserWithEmailAndPassword(auth, executiveEmail, executivePassword)
        const executiveUid = userCredential.user.uid

        try {
          // Create the company document
          await setDoc(companyRef, {
            name: companyName,
            size: parseInt(companySize),
            createdAt: new Date().toISOString(),
            executiveUid: executiveUid,
            supervisors: [],
            teamMembers: [],
            settings: {
              lastUpdated: new Date().toISOString(),
              trainingEnabled: true,
              worksheetsEnabled: true,
              standupNotesEnabled: true
            }
          })

          // Create the executive user document
          await setDoc(doc(db, 'users', executiveUid), {
            email: executiveEmail,
            firstName: executiveFirstName,
            lastName: executiveLastName,
            role: 'executive',
            companyName: companyName,
            permissions: ['executive', 'supervisor', 'team_member'],
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            supervisorId: '',
            teamMembers: [],
            trainingProgress: {
              lastUpdated: new Date().toISOString(),
              completedVideos: 0,
              totalVideos: 0,
              progress: 0
            }
          })

          // Initialize company statistics document
          await setDoc(doc(db, 'companies', companyName, 'statistics', 'overview'), {
            totalUsers: 1,
            activeUsers: 1,
            completedTrainings: 0,
            averageProgress: 0,
            lastUpdated: new Date().toISOString()
          })

          // Initialize company metrics document
          await setDoc(doc(db, 'companies', companyName, 'metrics', 'training'), {
            totalVideosWatched: 0,
            totalWorksheetsDone: 0,
            totalStandupNotes: 0,
            lastUpdated: new Date().toISOString()
          })

          // Initialize empty collections that will be needed
          const collectionsToInitialize = [
            'standups',
            'worksheets',
            'boldActions',
            'notifications'
          ]

          for (const collectionName of collectionsToInitialize) {
            // Create a placeholder document in each collection that we can delete later
            await setDoc(
              doc(db, 'companies', companyName, collectionName, '_initialized'), 
              {
                createdAt: new Date().toISOString(),
                isPlaceholder: true
              }
            )
          }

          // Sign in the user
          await signInWithEmailAndPassword(auth, executiveEmail, executivePassword)

          toast({
            title: "Company Created Successfully",
            description: "Your company has been set up and you're now logged in as an executive. Redirecting to dashboard...",
          })

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)

        } catch (error) {
          // If company creation fails, delete the user account
          await userCredential.user.delete()
          throw error;
        }

      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('auth/email-already-in-use')) {
            setError('This email is already registered. Please use a different email address or reset your password.');
          } else if (error.message.includes('auth/invalid-email')) {
            setError('Please enter a valid email address.');
          } else if (error.message.includes('auth/weak-password')) {
            setError('Please choose a stronger password. It should be at least 8 characters long.');
          } else if (error.message.includes('network')) {
            setError('Network error. Please check your internet connection and try again.');
          } else {
            setError('An error occurred while creating your company. Please try again or contact support if the problem persists.');
            console.error('Company creation error:', error);
          }
        } else {
          setError('An unexpected error occurred. Please try again or contact support.');
          console.error('Unknown error:', error);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  const nextStep = () => {
    let isValid = false
    console.log('Current step:', step);
    
    switch (step) {
      case 1:
        isValid = validateStep1()
        break
      case 2:
        isValid = validateStep2()
        console.log('Step 2 validation result:', isValid);
        break
      case 3:
        isValid = validateStep3()
        break
    }
    
    if (isValid) {
      setStep(step + 1)
      setError('')
      setFieldErrors({})
      console.log('Moving to step:', step + 1);
    } else {
      console.log('Validation failed, staying on step:', step);
    }
  }

  const prevStep = () => setStep(step - 1)

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#1E1E1E]">
      <div className="w-[500px]">
        <Card className="bg-card border-none shadow-2xl">
          <CardHeader className="space-y-2 pt-8 pb-4">
            <h1 className="text-[32px] font-semibold text-white tracking-tight text-center">LeaderForge</h1>
            <CardTitle className="text-white text-xl">Company Setup - Step {step} of 3</CardTitle>
            <div className="w-full bg-background/50 h-2 rounded-full mt-4">
              <div 
                className="bg-[#F5A524] h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            <CardDescription className="text-muted-foreground">
              {step === 1 && "Enter the master password to begin setup"}
              {step === 2 && "Enter your company's information"}
              {step === 3 && "Create the executive account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="masterPassword" className="text-white">Master Password</Label>
                  <p className="text-sm text-muted-foreground">Enter the master password provided in your billing receipt email.</p>
                  <div className="relative">
                    <Input
                      id="masterPassword"
                      type={showMasterPassword ? "text" : "password"}
                      placeholder="Enter master password"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      required
                      className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowMasterPassword(!showMasterPassword)}
                    >
                      {showMasterPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.masterPassword && <p className="text-destructive text-sm">{fieldErrors.masterPassword}</p>}
                </div>
              )}
              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-white">Company Name</Label>
                    <p className="text-sm text-muted-foreground">Enter the official name of your company.</p>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="e.g., Acme Corporation"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                    />
                    {fieldErrors.companyName && <p className="text-destructive text-sm">{fieldErrors.companyName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companySize" className="text-white">Company Size</Label>
                    <p className="text-sm text-muted-foreground">Enter the number of employees in your company.</p>
                    <Input
                      id="companySize"
                      type="number"
                      min="1"
                      max="10000"
                      placeholder="e.g., 50"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      required
                      className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                    />
                    {fieldErrors.companySize && <p className="text-destructive text-sm">{fieldErrors.companySize}</p>}
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="executiveFirstName" className="text-white">First Name</Label>
                    <p className="text-sm text-muted-foreground">Enter the executive's first name.</p>
                    <Input
                      id="executiveFirstName"
                      type="text"
                      placeholder="First Name"
                      value={executiveFirstName}
                      onChange={(e) => setExecutiveFirstName(e.target.value)}
                      required
                      className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                    />
                    {fieldErrors.executiveFirstName && <p className="text-destructive text-sm">{fieldErrors.executiveFirstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="executiveLastName" className="text-white">Last Name</Label>
                    <p className="text-sm text-muted-foreground">Enter the executive's last name.</p>
                    <Input
                      id="executiveLastName"
                      type="text"
                      placeholder="Last Name"
                      value={executiveLastName}
                      onChange={(e) => setExecutiveLastName(e.target.value)}
                      required
                      className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                    />
                    {fieldErrors.executiveLastName && <p className="text-destructive text-sm">{fieldErrors.executiveLastName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="executiveEmail" className="text-white">Executive Email</Label>
                    <p className="text-sm text-muted-foreground">This email will be used for the main executive account.</p>
                    <Input
                      id="executiveEmail"
                      type="email"
                      placeholder="e.g., executive@company.com"
                      value={executiveEmail}
                      onChange={(e) => setExecutiveEmail(e.target.value)}
                      required
                      pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                      className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                    />
                    {fieldErrors.executiveEmail && <p className="text-destructive text-sm">{fieldErrors.executiveEmail}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="executivePassword" className="text-white">Executive Password</Label>
                    <p className="text-sm text-muted-foreground">Choose a strong password for the executive account.</p>
                    <div className="relative">
                      <Input
                        id="executivePassword"
                        type={showExecutivePassword ? "text" : "password"}
                        placeholder="Enter a strong password"
                        value={executivePassword}
                        onChange={(e) => setExecutivePassword(e.target.value)}
                        required
                        className="rounded-md bg-background border-muted-foreground/20 hover:border-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#F5A524] focus:ring-0 focus:ring-offset-0 focus:border-[#F5A524] text-white"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowExecutivePassword(!showExecutivePassword)}
                      >
                        {showExecutivePassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.executivePassword && <p className="text-destructive text-sm">{fieldErrors.executivePassword}</p>}
                  </div>
                </>
              )}
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-between mt-6">
                {step === 1 ? (
                  <div className="flex justify-between w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/signin')}
                      className="border-muted-foreground/20 hover:bg-background/80 text-white"
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel Setup
                    </Button>
                  </div>
                ) : (
                  step > 1 && (
                    <Button 
                      type="button" 
                      onClick={prevStep} 
                      variant="outline"
                      className="border-muted-foreground/20 hover:bg-background/80 text-white"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                    </Button>
                  )
                )}
                {step < 3 ? (
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    className="bg-[#F5A524] text-white hover:bg-[#F5A524]/90 transition-colors ml-auto"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="bg-[#F5A524] text-white hover:bg-[#F5A524]/90 transition-colors ml-auto relative" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="opacity-0">Create Company</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      </>
                    ) : (
                      'Create Company'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

