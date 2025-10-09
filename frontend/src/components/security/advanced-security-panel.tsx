'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';

export function AdvancedSecurityPanel() {
  const [activeTab, setActiveTab] = useState<'prompt' | 'behavior' | 'credentials'>('prompt');
  const [promptText, setPromptText] = useState('');
  const [promptResult, setPromptResult] = useState<any>(null);
  const [credentialText, setCredentialText] = useState('');
  const [credentialResult, setCredentialResult] = useState<any>(null);

  const analyzePrompt = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/security/analyze/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      const data = await response.json();
      if (data.success) {
        setPromptResult(data.data);
        if (data.data.is_detected) {
          toast.error(`Prompt injection detected! Risk level: ${data.data.risk_level}`);
        } else {
          toast.success('Prompt is safe');
        }
      }
    } catch (error) {
      console.error('Error analyzing prompt:', error);
      toast.error('Failed to analyze prompt');
    }
  };

  const scanCredentials = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/security/scan/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: credentialText }),
      });

      const data = await response.json();
      if (data.success) {
        setCredentialResult(data.data);
        if (data.data.has_exposures) {
          toast.error(`${data.data.exposures.length} credential exposure(s) detected!`);
        } else {
          toast.success('No credentials detected');
        }
      }
    } catch (error) {
      console.error('Error scanning credentials:', error);
      toast.error('Failed to scan credentials');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-600';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-600';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-600';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-600';
      default: return 'text-gray-600 bg-gray-50 border-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="aran-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.shield className="h-6 w-6" />
            Advanced Security Analysis (2025 Innovations)
          </CardTitle>
          <CardDescription>
            AI-powered threat detection based on latest MCP security trends
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-black">
        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeTab === 'prompt'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          Prompt Injection Detection
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-4 py-2 font-semibold transition-all ${
            activeTab === 'credentials'
              ? 'bg-black text-white'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          Credential Scanner
        </button>
      </div>

      {/* Prompt Injection Tab */}
      {activeTab === 'prompt' && (
        <div className="space-y-4">
          <Card className="aran-card">
            <CardHeader>
              <CardTitle>Prompt Injection Detector</CardTitle>
              <CardDescription>
                Detect malicious attempts to manipulate AI prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Enter Prompt to Analyze</Label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full min-h-32 p-3 border-2 border-black rounded font-mono text-sm"
                  placeholder="Paste your prompt here..."
                />
              </div>
              <Button onClick={analyzePrompt} className="aran-btn-accent">
                <Icons.search className="mr-2 h-4 w-4" />
                Analyze Prompt
              </Button>
            </CardContent>
          </Card>

          {promptResult && (
            <Card className={`border-2 ${getSeverityColor(promptResult.risk_level)}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {promptResult.is_detected ? (
                    <Icons.alertTriangle className="h-5 w-5" />
                  ) : (
                    <Icons.checkCircle className="h-5 w-5" />
                  )}
                  Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold">Detection Status:</span>{' '}
                    {promptResult.is_detected ? 'DETECTED' : 'SAFE'}
                  </div>
                  <div>
                    <span className="font-semibold">Risk Level:</span>{' '}
                    <span className="uppercase font-bold">{promptResult.risk_level}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Risk Score:</span> {promptResult.score}
                  </div>
                </div>

                {promptResult.matched_patterns && promptResult.matched_patterns.length > 0 && (
                  <div>
                    <span className="font-semibold">Matched Patterns:</span>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {promptResult.matched_patterns.map((pattern: string, idx: number) => (
                        <li key={idx} className="text-sm font-mono">{pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {promptResult.recommendations && (
                  <div>
                    <span className="font-semibold">Recommendations:</span>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {promptResult.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Credential Scanner Tab */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <Card className="aran-card">
            <CardHeader>
              <CardTitle>Credential & Secrets Scanner</CardTitle>
              <CardDescription>
                Detect exposed API keys, passwords, and sensitive data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Enter Text/Code to Scan</Label>
                <textarea
                  value={credentialText}
                  onChange={(e) => setCredentialText(e.target.value)}
                  className="w-full min-h-32 p-3 border-2 border-black rounded font-mono text-sm"
                  placeholder="Paste code, configuration, or text to scan for exposed credentials..."
                />
              </div>
              <Button onClick={scanCredentials} className="aran-btn-accent">
                <Icons.search className="mr-2 h-4 w-4" />
                Scan for Credentials
              </Button>
            </CardContent>
          </Card>

          {credentialResult && (
            <Card className={`border-2 ${credentialResult.has_exposures ? 'bg-red-50 border-red-600' : 'bg-green-50 border-green-600'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {credentialResult.has_exposures ? (
                    <Icons.alertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Icons.checkCircle className="h-5 w-5 text-green-600" />
                  )}
                  Scan Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  {credentialResult.has_exposures ? 'EXPOSURES DETECTED' : 'NO EXPOSURES'}
                </div>
                <div>
                  <span className="font-semibold">Risk Score:</span> {credentialResult.risk_score}
                </div>

                {credentialResult.exposures && credentialResult.exposures.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-semibold">Detected Exposures:</span>
                    {credentialResult.exposures.map((exposure: any, idx: number) => (
                      <Card key={idx} className={`border-2 ${getSeverityColor(exposure.severity)}`}>
                        <CardContent className="p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-semibold">Type:</span> {exposure.type}
                            </div>
                            <div>
                              <span className="font-semibold">Severity:</span>{' '}
                              <span className="uppercase font-bold">{exposure.severity}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="font-semibold">Masked Value:</span>{' '}
                              <code className="bg-black text-white px-2 py-1 rounded">{exposure.masked}</code>
                            </div>
                          </div>
                          {exposure.suggestions && (
                            <ul className="list-disc list-inside mt-2 text-xs">
                              {exposure.suggestions.map((sug: string, sidx: number) => (
                                <li key={sidx}>{sug}</li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}



