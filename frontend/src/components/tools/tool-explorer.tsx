'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { mcpApi, MCPTool, ToolExecution } from '@/lib/mcp-api';
import { 
  Tool, 
  Play, 
  BarChart3, 
  Shield, 
  Clock, 
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function ToolExplorer() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<Record<string, ToolExecution>>({});

  useEffect(() => {
    loadTools();
  }, [selectedCategory, selectedRiskLevel]);

  const loadTools = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }
      
      if (selectedRiskLevel !== 'all') {
        filters.risk_level = selectedRiskLevel;
      }

      const toolsData = await mcpApi.listTools(filters);
      setTools(toolsData || []);
    } catch (error) {
      console.error('Failed to load tools:', error);
      toast.error('Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTool = async (tool: MCPTool) => {
    try {
      setExecutingTool(tool.id);
      
      // For demo purposes, use empty arguments
      // In a real app, you'd show a form to collect arguments
      const execution = await mcpApi.executeTool(tool.id, {});
      
      setExecutionResults(prev => ({
        ...prev,
        [tool.id]: execution
      }));
      
      if (execution.status === 'completed') {
        toast.success(`Tool "${tool.name}" executed successfully`);
      } else {
        toast.error(`Tool execution failed: ${execution.error}`);
      }
    } catch (error) {
      console.error('Failed to execute tool:', error);
      toast.error('Failed to execute tool');
    } finally {
      setExecutingTool(null);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(tools.map(tool => tool.category))];
  const riskLevels = ['low', 'medium', 'high'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tool Explorer</h2>
          <p className="text-gray-600">Discover and execute MCP tools</p>
        </div>
        <Button onClick={loadTools} variant="outline">
          <Tool className="h-4 w-4 mr-2" />
          Refresh Tools
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>

        {/* Risk Level Filter */}
        <select
          value={selectedRiskLevel}
          onChange={(e) => setSelectedRiskLevel(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Risk Levels</option>
          {riskLevels.map(level => (
            <option key={level} value={level}>
              {level.charAt(0).toUpperCase() + level.slice(1)} Risk
            </option>
          ))}
        </select>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Tool className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tools found</h3>
            <p className="text-gray-600">
              {searchQuery || selectedCategory !== 'all' || selectedRiskLevel !== 'all'
                ? 'No tools match your current filters.'
                : 'No tools have been discovered yet. Add MCP servers to discover their tools.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTools.map((tool) => (
            <Card key={tool.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedTool(
                        expandedTool === tool.id ? null : tool.id
                      )}
                    >
                      {expandedTool === tool.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <p className="text-sm text-gray-600">{tool.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{tool.category}</Badge>
                    <Badge variant={getRiskLevelColor(tool.risk_level)}>
                      {getRiskLevelIcon(tool.risk_level)}
                      <span className="ml-1">{tool.risk_level}</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Tool Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <BarChart3 className="h-4 w-4 text-gray-500" />
                      <span>{tool.usage_count} uses</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleExecuteTool(tool)}
                      disabled={executingTool === tool.id}
                    >
                      {executingTool === tool.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-2" />
                          Execute
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTool === tool.id && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Input Schema */}
                    <div>
                      <h4 className="font-semibold mb-2">Input Schema</h4>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(tool.input_schema, null, 2)}
                      </pre>
                    </div>

                    {/* Execution Result */}
                    {executionResults[tool.id] && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          Last Execution Result
                          {getExecutionStatusIcon(executionResults[tool.id].status)}
                        </h4>
                        <div className="bg-gray-100 p-3 rounded">
                          <div className="text-xs space-y-2">
                            <div>
                              <span className="font-medium">Status:</span> {executionResults[tool.id].status}
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span> {executionResults[tool.id].duration}ms
                            </div>
                            {executionResults[tool.id].error && (
                              <div>
                                <span className="font-medium text-red-600">Error:</span>
                                <pre className="text-red-600 mt-1">{executionResults[tool.id].error}</pre>
                              </div>
                            )}
                            {executionResults[tool.id].result && (
                              <div>
                                <span className="font-medium text-green-600">Result:</span>
                                <pre className="text-green-600 mt-1 max-h-32 overflow-y-auto">
                                  {JSON.stringify(executionResults[tool.id].result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}