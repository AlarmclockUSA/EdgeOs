import { FirebaseError } from 'firebase/app';
import { toast } from "@/components/ui/use-toast"

export function handleFirestoreError(error: unknown, customMessage: string) {
  console.error(customMessage, error);
  
  let errorMessage = "An unexpected error occurred. Please try again.";
  
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        errorMessage = "You don't have permission to perform this action. Please check your authentication status.";
        break;
      case 'unauthenticated':
        errorMessage = "You are not authenticated. Please sign in and try again.";
        break;
      default:
        errorMessage = `Firebase error: ${error.message}`;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  toast({
    title: "Error",
    description: errorMessage,
    variant: "destructive",
  });

  return errorMessage;
}

