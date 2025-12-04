'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  X, 
  SortAsc, 
  SortDesc,
  Server,
  AlertTriangle,
  Activity,
  Clock,
  Tag,
  Star,
  Grid,
  List,
  SlidersHorizontal
} from 'lucide-react';

interface SearchFilters {
  query: string;
  status: string[];
  type: string[];
  organization: string[];
  capabilities: string[];
  healthScore: [number, number];
  lastSeen: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
}

interface SearchResult {
  id: string;
  name: string;
  description: string;
  status: 'online' | 'offline' | 'warning';
  type: string;
  organization: string;
  capabilities: string[];
  healthScore: number;
  lastSeen: string;
  responseTime: number;
  uptime: number;
  tags: string[];
  isFavorite: boolean;
}

const AdvancedSearch: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: [],
    type: [],
    organization: [],
    capabilities: [],
    healthScore: [0, 100],
    lastSeen: '',
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'grid'
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Perform search using backend API
  const performSearch = async () => {
    try {
      setIsSearching(true);
      setError(null);

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
      
      // Build search query parameters
      const params = new URLSearchParams();
      if (filters.query) {
        params.append('query', filters.query);
      }
      if (filters.status && filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.type && filters.type.length > 0) {
        params.append('type', filters.type.join(','));
      }
      if (filters.organization && filters.organization.length > 0) {
        params.append('organization', filters.organization.join(','));
      }
      if (filters.capabilities && filters.capabilities.length > 0) {
        params.append('capabilities', filters.capabilities.join(','));
      }
      if (filters.healthScore) {
        params.append('health_score_min', filters.healthScore[0].toString());
        params.append('health_score_max', filters.healthScore[1].toString());
      }
      if (filters.lastSeen) {
        params.append('last_seen', filters.lastSeen);
      }
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);

      // Use registry search endpoint
      const response = await fetch(`${API_BASE}/registry/servers?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform backend data to SearchResult format
      const results: SearchResult[] = (data.servers || data.data || []).map((server: any) => ({
        id: server.id || server.ID,
        name: server.name || server.Name,
        description: server.description || server.Description || '',
        status: (server.status || server.Status || 'unknown').toLowerCase(),
        type: server.type || server.Type || 'Unknown',
        organization: server.organization || server.Organization || '',
        capabilities: server.capabilities || server.Capabilities || [],
        healthScore: server.health_score || server.HealthScore || 0,
        lastSeen: formatLastSeen(server.last_seen || server.LastSeen || server.updated_at || server.UpdatedAt),
        responseTime: server.response_time || server.ResponseTime || 0,
        uptime: server.uptime_percentage || server.UptimePercentage || 0,
        tags: server.tags || server.Tags || [],
        isFavorite: false // Can be enhanced with user preferences
      }));

      setSearchResults(results);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to perform search');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Helper to format last seen time
  const formatLastSeen = (timestamp: string): string => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      
      if (diffSecs < 60) return `${diffSecs}s ago`;
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return `${Math.floor(diffSecs / 86400)}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  // Trigger search when filters change
  useEffect(() => {
    // Only search if there's a query or active filters
    if (filters.query || 
        (filters.status && filters.status.length > 0) ||
        (filters.type && filters.type.length > 0) ||
        (filters.organization && filters.organization.length > 0)) {
      performSearch();
    } else {
      // Clear results if no search criteria
      setSearchResults([]);
    }
  }, [filters.query, filters.status, filters.type, filters.organization, filters.capabilities, filters.healthScore, filters.lastSeen, filters.sortBy, filters.sortOrder]);

  const statusOptions = ['online', 'offline', 'warning', 'error'];
  const typeOptions = ['API', 'Database', 'Cache', 'Storage', 'Monitoring', 'Web Server'];
  const organizationOptions = ['Production', 'Development', 'Staging', 'Infrastructure'];
  const capabilityOptions = ['REST API', 'Authentication', 'Rate Limiting', 'SQL', 'Replication', 'Backup', 'Redis', 'Caching', 'Session Storage', 'File Storage', 'NFS', 'Metrics', 'Logging', 'Alerting'];

  // Use searchResults directly (already filtered by backend)
  const filteredResults = useMemo(() => {
    // Apply client-side sorting if needed (backend should handle this, but fallback)
    let results = [...searchResults];

    // Client-side sorting as fallback
    results.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'healthScore':
          comparison = a.healthScore - b.healthScore;
          break;
        case 'lastSeen':
          // Simple comparison - could be enhanced
          comparison = a.lastSeen.localeCompare(b.lastSeen);
          break;
        default:
          comparison = 0;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [searchResults, filters.sortBy, filters.sortOrder]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const addFilter = (type: string, value: string) => {
    if (type === 'status' && !filters.status.includes(value)) {
      handleFilterChange('status', [...filters.status, value]);
    } else if (type === 'type' && !filters.type.includes(value)) {
      handleFilterChange('type', [...filters.type, value]);
    } else if (type === 'organization' && !filters.organization.includes(value)) {
      handleFilterChange('organization', [...filters.organization, value]);
    } else if (type === 'capabilities' && !filters.capabilities.includes(value)) {
      handleFilterChange('capabilities', [...filters.capabilities, value]);
    }
  };

  const removeFilter = (type: string, value: string) => {
    if (type === 'status') {
      handleFilterChange('status', filters.status.filter(s => s !== value));
    } else if (type === 'type') {
      handleFilterChange('type', filters.type.filter(t => t !== value));
    } else if (type === 'organization') {
      handleFilterChange('organization', filters.organization.filter(o => o !== value));
    } else if (type === 'capabilities') {
      handleFilterChange('capabilities', filters.capabilities.filter(c => c !== value));
    }
  };

  const clearAllFilters = () => {
    setFilters(prev => ({
      ...prev,
      query: '',
      status: [],
      type: [],
      organization: [],
      capabilities: [],
      healthScore: [0, 100]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Search</h1>
          <p className="text-gray-600">Find and filter servers with precision</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search servers, descriptions, tags..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsSearching(!isSearching)}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {(filters.status.length > 0 || filters.type.length > 0 || filters.organization.length > 0 || filters.capabilities.length > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Active Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.status.map(status => (
                <Badge key={status} variant="secondary" className="flex items-center">
                  Status: {status}
                  <X 
                    className="h-3 w-3 ml-2 cursor-pointer" 
                    onClick={() => removeFilter('status', status)}
                  />
                </Badge>
              ))}
              {filters.type.map(type => (
                <Badge key={type} variant="secondary" className="flex items-center">
                  Type: {type}
                  <X 
                    className="h-3 w-3 ml-2 cursor-pointer" 
                    onClick={() => removeFilter('type', type)}
                  />
                </Badge>
              ))}
              {filters.organization.map(org => (
                <Badge key={org} variant="secondary" className="flex items-center">
                  Org: {org}
                  <X 
                    className="h-3 w-3 ml-2 cursor-pointer" 
                    onClick={() => removeFilter('organization', org)}
                  />
                </Badge>
              ))}
              {filters.capabilities.map(cap => (
                <Badge key={cap} variant="secondary" className="flex items-center">
                  {cap}
                  <X 
                    className="h-3 w-3 ml-2 cursor-pointer" 
                    onClick={() => removeFilter('capabilities', cap)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
            <CardDescription>Refine your search with detailed filters</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="sorting">Sorting</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <div className="space-y-2">
                      {statusOptions.map(status => (
                        <label key={status} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addFilter('status', status);
                              } else {
                                removeFilter('status', status);
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="capitalize">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <div className="space-y-2">
                      {typeOptions.map(type => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.type.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addFilter('type', type);
                              } else {
                                removeFilter('type', type);
                              }
                            }}
                            className="mr-2"
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Organization</label>
                    <div className="space-y-2">
                      {organizationOptions.map(org => (
                        <label key={org} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.organization.includes(org)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addFilter('organization', org);
                              } else {
                                removeFilter('organization', org);
                              }
                            }}
                            className="mr-2"
                          />
                          <span>{org}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Capabilities</label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {capabilityOptions.map(cap => (
                        <label key={cap} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.capabilities.includes(cap)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addFilter('capabilities', cap);
                              } else {
                                removeFilter('capabilities', cap);
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{cap}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Health Score Range</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.healthScore[0]}
                          onChange={(e) => handleFilterChange('healthScore', [parseInt(e.target.value) || 0, filters.healthScore[1]])}
                          className="w-20"
                        />
                        <span>-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.healthScore[1]}
                          onChange={(e) => handleFilterChange('healthScore', [filters.healthScore[0], parseInt(e.target.value) || 100])}
                          className="w-20"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium mb-2 block">Last Seen</label>
                      <Select value={filters.lastSeen} onValueChange={(value) => handleFilterChange('lastSeen', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any time</SelectItem>
                          <SelectItem value="5">Last 5 minutes</SelectItem>
                          <SelectItem value="15">Last 15 minutes</SelectItem>
                          <SelectItem value="30">Last 30 minutes</SelectItem>
                          <SelectItem value="60">Last hour</SelectItem>
                          <SelectItem value="1440">Last 24 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sorting" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="healthScore">Health Score</SelectItem>
                        <SelectItem value="lastSeen">Last Seen</SelectItem>
                        <SelectItem value="responseTime">Response Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort Order</label>
                    <div className="flex space-x-2">
                      <Button
                        variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('sortOrder', 'asc')}
                      >
                        <SortAsc className="h-4 w-4 mr-2" />
                        Ascending
                      </Button>
                      <Button
                        variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange('sortOrder', 'desc')}
                      >
                        <SortDesc className="h-4 w-4 mr-2" />
                        Descending
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Search Results ({filteredResults.length})
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <Button
              variant={filters.viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('viewMode', 'grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={filters.viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('viewMode', 'list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className={filters.viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredResults.map((result) => (
              <Card key={result.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(result.status)}`}></div>
                      <div>
                        <CardTitle className="text-lg">{result.name}</CardTitle>
                        <CardDescription>{result.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {result.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      <Button variant="ghost" size="sm">
                        <Activity className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Health Score</span>
                      <span className={`font-medium ${getHealthScoreColor(result.healthScore)}`}>
                        {result.healthScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Response Time</span>
                      <span className="font-medium">{result.responseTime}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="font-medium">{result.uptime}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Seen</span>
                      <span className="font-medium">{result.lastSeen}</span>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {result.capabilities.slice(0, 3).map(cap => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {result.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{result.capabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;

