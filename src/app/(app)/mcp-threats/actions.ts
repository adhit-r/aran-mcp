"use server";

import { z } from "zod";
import { detectMcpThreats } from "@/lib/mcp-utils";

const detectMcpThreatsSchema = z.object({
  mcpEndpoint: z.string().min(1, "MCP endpoint is required"),
  requestData: z.string().min(1, "Request data is required"),
  responseData: z.string().min(1, "Response data is required"),
  userRole: z.string().min(1, "User role is required"),
  trafficVolume: z.string().min(1, "Traffic volume is required"),
});

export type DetectMcpThreatsActionState = {
  message: string;
  error?: string;
  inputErrors?: Array<{ path: string[]; message: string }>;
  threatAnalysis?: {
    threats: string[];
    riskFactors: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      confidence: number;
    }>;
    recommendations: string[];
    threatLevel: 'low' | 'medium' | 'high';
    anomalyScore: number;
  };
};

export async function detectMcpThreatsAction(
  prevState: DetectMcpThreatsActionState,
  formData: FormData
): Promise<DetectMcpThreatsActionState> {
  try {
    const validatedFields = detectMcpThreatsSchema.safeParse({
      mcpEndpoint: formData.get("mcpEndpoint"),
      requestData: formData.get("requestData"),
      responseData: formData.get("responseData"),
      userRole: formData.get("userRole"),
      trafficVolume: formData.get("trafficVolume"),
    });

    if (!validatedFields.success) {
      return {
        message: "",
        inputErrors: validatedFields.error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
        })),
      };
    }

    const { mcpEndpoint, requestData, responseData, userRole, trafficVolume } = validatedFields.data;
    
    const threatAnalysis = await detectMcpThreats({
      mcpEndpoint,
      requestData,
      responseData,
      userRole,
      trafficVolume,
    });

    return {
      message: `Threat analysis completed. ${threatAnalysis.threats.length} potential threats detected.`,
      threatAnalysis,
    };
  } catch (error) {
    console.error("Error detecting MCP threats:", error);
    return {
      message: "",
      error: error instanceof Error ? error.message : "Failed to detect MCP threats",
    };
  }
}
