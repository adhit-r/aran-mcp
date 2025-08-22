"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { detectMcpThreatsAction, type DetectMcpThreatsActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, ShieldCheck, AlertCircle, Info, Network, Cpu } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Analyze MCP Traffic
    </Button>
  );
}

export default function MCPThreatsPage() {
  const initialState: DetectMcpThreatsActionState = { message: "" };
  const [state, formAction] = useFormState(detectMcpThreatsAction, initialState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.message && !state.error && !state.inputErrors) {
      // Optionally reset form if desired, though for analysis, keeping inputs might be useful
      // formRef.current?.reset(); 
    }
  }, [state]);

  const getErrorForField = (fieldName: string) => {
    return state.inputErrors?.find(err => err.path.includes(fieldName))?.message;
  }
  
  const getThreatLevelBadgeVariant = (threatLevel?: 'low' | 'medium' | 'high') => {
    switch (threatLevel) {
      case 'low': return 'default'; 
      case 'medium': return 'secondary'; 
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getSeverityBadgeVariant = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'high': return <ShieldAlert className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">MCP Threat Detection</h1>
        <p className="text-muted-foreground mt-2">
          Analyze MCP traffic for potential security threats and vulnerabilities.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Analyze MCP Traffic</CardTitle>
            <CardDescription>
              Enter the MCP traffic details to analyze for potential security threats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} ref={formRef} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mcpEndpoint">MCP Endpoint</Label>
                  <Input
                    id="mcpEndpoint"
                    name="mcpEndpoint"
                    placeholder="https://api.example.com/mcp/endpoint"
                    defaultValue="https://api.example.com/mcp/endpoint"
                  />
                  {getErrorForField("mcpEndpoint") && (
                    <p className="text-sm text-destructive">
                      {getErrorForField("mcpEndpoint")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userRole">User Role</Label>
                  <Input
                    id="userRole"
                    name="userRole"
                    placeholder="admin"
                    defaultValue="admin"
                  />
                  {getErrorForField("userRole") && (
                    <p className="text-sm text-destructive">
                      {getErrorForField("userRole")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trafficVolume">Traffic Volume</Label>
                <select
                  id="trafficVolume"
                  name="trafficVolume"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue="medium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                {getErrorForField("trafficVolume") && (
                  <p className="text-sm text-destructive">
                    {getErrorForField("trafficVolume")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestData">Request Data</Label>
                  <Textarea
                    id="requestData"
                    name="requestData"
                    placeholder="Paste MCP request data here..."
                    className="min-h-[200px] font-mono text-sm"
                    defaultValue={`{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "Hello!"}],
  "tools": [{"type": "code_interpreter"}]
}`}
                  />
                  {getErrorForField("requestData") && (
                    <p className="text-sm text-destructive">
                      {getErrorForField("requestData")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responseData">Response Data</Label>
                  <Textarea
                    id="responseData"
                    name="responseData"
                    placeholder="Paste MCP response data here..."
                    className="min-h-[200px] font-mono text-sm"
                    defaultValue={`{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello there, how may I assist you today?"
    },
    "finish_reason": "stop"
  }]
}`}
                  />
                  {getErrorForField("responseData") && (
                    <p className="text-sm text-destructive">
                      {getErrorForField("responseData")}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <SubmitButton />
              </div>
            </form>
          </CardContent>
        </Card>

        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state?.message && !state.error && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Analysis Complete</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state?.threatAnalysis && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Threat Analysis Results</CardTitle>
                <Badge variant={getThreatLevelBadgeVariant(state.threatAnalysis.threatLevel)}>
                  {state.threatAnalysis.threatLevel.toUpperCase()} THREAT LEVEL
                </Badge>
              </div>
              <CardDescription>
                Anomaly Score: {state.threatAnalysis.anomalyScore.toFixed(2)}/100
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Detected Threats</h4>
                {state.threatAnalysis.threats.length > 0 ? (
                  <ul className="space-y-2">
                    {state.threatAnalysis.threats.map((threat, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                        <span>{threat}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>No critical threats detected</span>
                  </div>
                )}
              </div>

              {state.threatAnalysis.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Risk Factors</h4>
                  <div className="space-y-3">
                    {state.threatAnalysis.riskFactors.map((factor, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(factor.severity)}
                            <span className="font-medium">{factor.type}</span>
                          </div>
                          <Badge variant={getSeverityBadgeVariant(factor.severity)}>
                            {factor.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {factor.description}
                        </p>
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Confidence: {factor.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.threatAnalysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {state.threatAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              About MCP Threat Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">Common MCP Threats</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Tool poisoning and manipulation</li>
                  <li>• Prompt injection attacks</li>
                  <li>• Data exfiltration</li>
                  <li>• Unauthorized tool access</li>
                  <li>• Privilege escalation</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Best Practices</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Regularly audit MCP tool permissions</li>
                  <li>• Implement strict input validation</li>
                  <li>• Monitor for unusual traffic patterns</li>
                  <li>• Keep MCP implementations updated</li>
                  <li>• Use the principle of least privilege</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
