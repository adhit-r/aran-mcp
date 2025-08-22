"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { discoverMcpsAction, type DiscoverMcpsActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Terminal, Info, Network, Cpu, Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Discover MCP Implementations
    </Button>
  );
}

export default function MCPDiscoveryPage() {
  const initialState: DiscoverMcpsActionState = { message: "" };
  const [state, formAction] = useFormState(discoverMcpsAction, initialState);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.message && !state.error && !state.inputErrors) {
      // Optionally reset form or parts of it on success, if desired
      // formRef.current?.reset(); 
    }
  }, [state]);

  const getSecurityLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">MCP Implementation Discovery</h1>
        <p className="text-muted-foreground mt-2">
          Analyze network traffic or logs to discover Model Context Protocol implementations in your environment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discover MCP Implementations</CardTitle>
          <CardDescription>
            Paste network traffic, logs, or configuration data to identify MCP implementations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} ref={formRef} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trafficData">Traffic Data or Logs</Label>
              <Textarea
                id="trafficData"
                name="trafficData"
                placeholder="Paste network traffic, logs, or configuration data here..."
                className="min-h-[200px] font-mono text-sm"
                required
              />
              {state?.inputErrors?.map((error, index) => (
                error.path.includes("trafficData") && (
                  <p key={index} className="text-sm text-destructive">
                    {error.message}
                  </p>
                )
              ))}
            </div>
            
            <div className="flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>

      {state?.error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state?.message && !state.error && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Discovery Results</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state?.discoveredMcps && state.discoveredMcps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Discovered MCP Implementations</CardTitle>
            <CardDescription>
              {state.discoveredMcps.length} MCP implementations found in the provided data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Endpoints</TableHead>
                    <TableHead>Security Level</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.discoveredMcps.map((mcp) => (
                    <TableRow key={mcp.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-muted-foreground" />
                          {mcp.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mcp.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {mcp.endpoints.slice(0, 2).map((endpoint, i) => (
                            <code key={i} className="text-xs bg-muted p-1 rounded">
                              {endpoint}
                            </code>
                          ))}
                          {mcp.endpoints.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{mcp.endpoints.length - 2} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSecurityLevelBadgeVariant(mcp.securityLevel)}>
                          {mcp.securityLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="mr-2">
                          <Cpu className="mr-2 h-3 w-3" />
                          Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Shield className="mr-2 h-3 w-3" />
                          Secure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            About MCP Discovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">What is MCP?</h4>
              <p className="text-sm text-muted-foreground">
                The Model Context Protocol (MCP) enables AI models to interact with external tools and data sources.
                It allows models to perform actions, access information, and integrate with various systems.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">How Discovery Works</h4>
              <p className="text-sm text-muted-foreground">
                The discovery process analyzes your input for patterns that indicate MCP implementations,
                such as API endpoints, configuration settings, or log entries related to model interactions.
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Best Practices</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Only analyze logs and traffic from authorized sources</li>
              <li>• Review discovered implementations for security risks</li>
              <li>• Regularly scan for new or unauthorized MCP implementations</li>
              <li>• Implement proper access controls for all MCP endpoints</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
