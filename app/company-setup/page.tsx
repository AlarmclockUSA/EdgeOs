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

export default function CompanySetup() {
  const [step, setStep] = useState(1)
  const [masterPassword, setMasterPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [executiveEmail, setExecutiveEmail] = useState('')
  const [executivePassword, setExecutivePassword] = useState('')
  const [companyPassword, setCompanyPassword] = useState('')
  const [executiveFirstName, setExecutiveFirstName] = useState('')
  const [executiveLastName, setExecutiveLastName] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompanyPassword, setShowCompanyPassword] = useState(false)
  const [showExecutivePassword, setShowExecutivePassword] = useState(false)
  const [showMasterPassword, setShowMasterPassword] = useState(false)
  const [companyStartDate, setCompanyStartDate] = useState(new Date().toISOString().split('T')[0])
  const [trainingStartDate, setTrainingStartDate] = useState(new Date().toISOString().split('T')[0])
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
    if (companyName.length === 0) {
      errors.companyName = 'Company name is required'
    }
    if (companySize.length === 0) {
      errors.companySize = 'Company size is required'
    }
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
    if (executivePassword.length === 0) {
      errors.executivePassword = 'Password is required'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [executiveFirstName, executiveLastName, executiveEmail, executivePassword])

  const validateStep4 = useCallback(() => {
    const errors: Record<string, string> = {}
    if (companyPassword.length === 0) {
      errors.companyPassword = 'Company password is required'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [companyPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Only check master password in step 1
    if (step === 1) {
      if (masterPassword !== "Password") {
        setError('Invalid master password');
        return;
      }
      nextStep();
      return;
    }

    // Only validate email and proceed with Firebase auth in final step
    if (step === 4) {
      if (!isValidEmail(executiveEmail)) {
        setError('Please enter a valid email address');
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        // Sign out any existing user
        await signOut(auth)

        // Create the executive user
        const userCredential = await createUserWithEmailAndPassword(auth, executiveEmail, executivePassword)
        const executiveUid = userCredential.user.uid

        // Sign in the user to get the auth token
        await signInWithEmailAndPassword(auth, executiveEmail, executivePassword)

        // Check if the company already exists
        const companyRef = doc(db, 'companies', companyName)
        const companyDoc = await getDoc(companyRef)

        if (companyDoc.exists()) {
          setError('A company with this name already exists')
          return
        }

        // Create the company document
        await setDoc(companyRef, {
          name: companyName,
          size: companySize,
          companyPassword: companyPassword,
          startDate: new Date(companyStartDate),
          trainingStartDate: new Date(trainingStartDate),
          createdAt: new Date().toISOString(),
          executiveUid: executiveUid
        })

        // Create the executive user document with full access permissions
        const userRef = doc(db, 'users', executiveUid)
        await setDoc(userRef, {
          email: executiveEmail,
          firstName: executiveFirstName,
          lastName: executiveLastName,
          role: 'executive',
          companyName: companyName,
          permissions: ['executive', 'supervisor', 'team_member'],
          createdAt: new Date().toISOString()
        })

        // Add a delay to allow Firebase to propagate the changes
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Refresh the user's token to ensure the latest claims are fetched
        await auth.currentUser?.getIdToken(true);

        toast({
          title: "Company Created",
          description: "Your company has been successfully set up. Redirecting to dashboard...",
        })

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)

      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('auth/email-already-in-use')) {
            setError('This email is already in use. Please use a different email.');
          } else if (error.message.includes('auth/invalid-email')) {
            setError('The email address is badly formatted.');
          } else {
            setError('Failed to create company and executive account: ' + error.message);
          }
        } else {
          setError('An unexpected error occurred');
        }
        console.error(error)
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  const nextStep = () => {
    let isValid = false
    switch (step) {
      case 1:
        isValid = validateStep1()
        break
      case 2:
        isValid = validateStep2()
        break
      case 3:
        isValid = validateStep3()
        break
      case 4:
        isValid = validateStep4()
        break
    }
    if (isValid) {
      setStep(step + 1)
      setError('')
      setFieldErrors({})
    }
  }

  const prevStep = () => setStep(step - 1)

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Company Setup - Step {step} of 4</CardTitle>
          <CardDescription>
            {step === 2 && "Enter your company's information"}
            {step === 3 && "Create the executive account"}
            {step === 4 && "Set up security measures"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="masterPassword">Master Password</Label>
                <p className="text-sm text-muted-foreground">Enter the master password provided in your billing receipt email.</p>
                <div className="relative">
                  <Input
                    id="masterPassword"
                    type={showMasterPassword ? "text" : "password"}
                    placeholder="Enter master password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                  >
                    {showMasterPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {fieldErrors.masterPassword && <p className="text-red-500 text-sm">{fieldErrors.masterPassword}</p>}
              </div>
            )}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <p className="text-sm text-muted-foreground">Enter the official name of your company.</p>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="e.g., Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                  {fieldErrors.companyName && <p className="text-red-500 text-sm">{fieldErrors.companyName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <p className="text-sm text-muted-foreground">Enter the number of employees in your company.</p>
                  <Input
                    id="companySize"
                    type="number"
                    placeholder="e.g., 50"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    required
                  />
                  {fieldErrors.companySize && <p className="text-red-500 text-sm">{fieldErrors.companySize}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyStartDate">Company Start Date</Label>
                  <Input
                    id="companyStartDate"
                    type="date"
                    value={companyStartDate}
                    onChange={(e) => setCompanyStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainingStartDate">Training Start Date</Label>
                  <Input
                    id="trainingStartDate"
                    type="date"
                    value={trainingStartDate}
                    onChange={(e) => setTrainingStartDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="executiveFirstName">First Name</Label>
                  <p className="text-sm text-muted-foreground">Enter the executive's first name.</p>
                  <Input
                    id="executiveFirstName"
                    type="text"
                    placeholder="First Name"
                    value={executiveFirstName}
                    onChange={(e) => setExecutiveFirstName(e.target.value)}
                    required
                  />
                  {fieldErrors.executiveFirstName && <p className="text-red-500 text-sm">{fieldErrors.executiveFirstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="executiveLastName">Last Name</Label>
                  <p className="text-sm text-muted-foreground">Enter the executive's last name.</p>
                  <Input
                    id="executiveLastName"
                    type="text"
                    placeholder="Last Name"
                    value={executiveLastName}
                    onChange={(e) => setExecutiveLastName(e.target.value)}
                    required
                  />
                  {fieldErrors.executiveLastName && <p className="text-red-500 text-sm">{fieldErrors.executiveLastName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="executiveEmail">Executive Email</Label>
                  <p className="text-sm text-muted-foreground">This email will be used for the main executive account.</p>
                  <Input
                    id="executiveEmail"
                    type="email"
                    placeholder="e.g., executive@company.com"
                    value={executiveEmail}
                    onChange={(e) => setExecutiveEmail(e.target.value)}
                    required
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  />
                  {fieldErrors.executiveEmail && <p className="text-red-500 text-sm">{fieldErrors.executiveEmail}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="executivePassword">Executive Password</Label>
                  <p className="text-sm text-muted-foreground">Choose a strong password for the executive account.</p>
                  <div className="relative">
                    <Input
                      id="executivePassword"
                      type={showExecutivePassword ? "text" : "password"}
                      placeholder="Enter a strong password"
                      value={executivePassword}
                      onChange={(e) => setExecutivePassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowExecutivePassword(!showExecutivePassword)}
                    >
                      {showExecutivePassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.executivePassword && <p className="text-red-500 text-sm">{fieldErrors.executivePassword}</p>}
                </div>
              </>
            )}
            {step === 4 && (
              <div className="space-y-2">
                <Label htmlFor="companyPassword">Company Password</Label>
                <p className="text-sm text-muted-foreground">This password will be used by employees to join the company.</p>
                <div className="relative">
                  <Input
                    id="companyPassword"
                    type={showCompanyPassword ? "text" : "password"}
                    placeholder="Enter company password"
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowCompanyPassword(!showCompanyPassword)}
                  >
                    {showCompanyPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {fieldErrors.companyPassword && <p className="text-red-500 text-sm">{fieldErrors.companyPassword}</p>}
              </div>
            )}
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex justify-between mt-6">
              {step === 1 ? (
                <div className="flex justify-between w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/signin')}
                    className="mr-2"
                  >
                    <X className="w-4 h-4 mr-2" /> Back
                  </Button>
                </div>
              ) : (
                step > 1 && (
                  <Button type="button" onClick={prevStep} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                  </Button>
                )
              )}
              {step < 4 ? (
                <Button type="button" onClick={nextStep} className="ml-auto">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                  Create Company
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

