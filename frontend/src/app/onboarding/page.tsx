'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { RealServerForm } from '@/components/servers/real-server-form';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationEmail, setOrganizationEmail] = useState('');
  const [showServerForm, setShowServerForm] = useState(false);

  const handleNext = () => {
    try {
      if (step < 3) {
        console.log('Moving from step', step, 'to step', step + 1);
        setStep(step + 1);
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    try {
      console.log('Completing onboarding, redirecting to dashboard');
      // Redirect to dashboard after onboarding
      router.push('/dashboard');
    } catch (error) {
      console.error('Error in handleComplete:', error);
    }
  };

  // Add error boundary
  if (step < 1 || step > 3) {
    console.error('Invalid step:', step);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Error</h1>
          <p className="text-gray-600">Invalid step. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white/90 mb-2">
            Welcome to MCP Sentinel
          </h1>
          <p className="text-gray-600 dark:text-white/60">
            Let's set up your organization to get started
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-white/60">Step {step} of 3</span>
            <span className="text-sm text-gray-600 dark:text-white/60">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <Card className="glass-card border-gray-200 dark:border-white/20">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white/90">
              {step === 1 && 'Organization Information'}
              {step === 2 && 'MCP Server Setup'}
              {step === 3 && 'Complete Setup'}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-white/60">
              {step === 1 && 'Tell us about your organization'}
              {step === 2 && 'Add your first MCP server'}
              {step === 3 && 'Review and complete your setup'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                    Organization Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your organization name"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="glass-input text-gray-900 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                    Organization Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your organization email"
                    value={organizationEmail}
                    onChange={(e) => setOrganizationEmail(e.target.value)}
                    className="glass-input text-gray-900 dark:text-white/90 placeholder:text-gray-500 dark:placeholder:text-white/50"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {!showServerForm ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="h-8 w-8 text-gray-500 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
                        <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
                        <line x1="6" x2="6.01" y1="6" y2="6"/>
                        <line x1="6" x2="6.01" y1="18" y2="18"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white/90 mb-2">
                      Add Your First MCP Server
                    </h3>
                    <p className="text-gray-600 dark:text-white/60 mb-4">
                      Connect to a real MCP server now, or skip this step for later.
                    </p>
                    <div className="space-y-3">
                      <Button 
                        onClick={() => setShowServerForm(true)}
                        className="glass-button bg-gray-100 dark:bg-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/30 w-full"
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Real MCP Server
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleNext}
                        className="glass-button border-gray-200 dark:border-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/20 w-full"
                      >
                        Skip for Now
                      </Button>
                      <p className="text-sm text-gray-500 dark:text-white/50">
                        You can always add servers from the dashboard after setup
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white/90">
                        Configure MCP Server
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowServerForm(false)}
                        className="glass-button border-gray-200 dark:border-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/20"
                      >
                        Back
                      </Button>
                    </div>
                    <RealServerForm 
                      onSuccess={() => {
                        setShowServerForm(false);
                        handleNext();
                      }}
                      onCancel={() => setShowServerForm(false)}
                    />
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white/90 mb-2">Setup Summary</h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-white/60">
                    <p><strong>Organization:</strong> {organizationName}</p>
                    <p><strong>Email:</strong> {organizationEmail}</p>
                    <p><strong>MCP Servers:</strong> 0 (can be added later)</p>
                  </div>
                </div>
                <div className="text-center py-4">
                  <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-white/60">
                    Your organization is ready to use MCP Sentinel!
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={step === 1}
                className="glass-button border-gray-200 dark:border-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/20"
              >
                Previous
              </Button>
              
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  className="glass-button bg-gray-100 dark:bg-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/30"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  className="glass-button bg-gray-100 dark:bg-white/20 text-gray-900 dark:text-white/90 hover:bg-gray-200 dark:hover:bg-white/30"
                >
                  Complete Setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
