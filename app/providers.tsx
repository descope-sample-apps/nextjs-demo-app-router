// providers.tsx
import React from 'react';
import { AuthProvider } from "@descope/nextjs-sdk";

const Providers: React.FC<{ children: JSX.Element | undefined }> = ({ children }) => {
  if (process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID === undefined) {
    throw new Error("NEXT_PUBLIC_DESCOPE_PROJECT_ID is not defined");
  }
  
  return (
    <AuthProvider projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID}>
      {children}
    </AuthProvider>
  );
};

export default Providers;
