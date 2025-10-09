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
  const [showFilters, setShowFilters] = useState(false);

  // Mock data
  const mockResults: SearchResult[] = [
    {
      id: '1',
      name: 'Production API Server',
      description: 'Main production API endpoint',
      status: 'online',
      type: 'API',
      organization: 'Production',
      capabilities: ['REST API', 'Authentication', 'Rate Limiting'],
      healthScore: 95,
      lastSeen: '2 minutes ago',
      responseTime: 120,
      uptime: 99.8,
      tags: ['production', 'api', 'critical'],
      isFavorite: true
    },
    {
      id: '2',
      name: 'Database Cluster',
      description: 'Primary database cluster',
      status: 'online',
      type: 'Database',
      organization: 'Production',
      capabilities: ['SQL', 'Replication', 'Backup'],
      healthScore: 98,
      lastSeen: '1 minute ago',
      responseTime: 85,
      uptime: 99.9,
      tags: ['database', 'production', 'critical'],
      isFavorite: true
    },
    {
      id: '3',
      name: 'Cache Server',
      description: 'Redis cache server',
      status: 'warning',
      type: 'Cache',
      organization: 'Production',
      capabilities: ['Redis', 'Caching', 'Session Storage'],
      healthScore: 75,
      lastSeen: '3 minutes ago',
      responseTime: 250,
      uptime: 95.2,
      tags: ['cache', 'redis', 'performance'],
      isFavorite: false
    },
    {
      id: '4',
      name: 'File Server',
      description: 'Network file storage',
      status: 'offline',
      type: 'Storage',
      organization: 'Development',
      capabilities: ['File Storage', 'NFS', 'Backup'],
      healthScore: 0,
      lastSeen: '15 minutes ago',
      responseTime: 0,
      uptime: 0,
      tags: ['storage', 'files', 'development'],
      isFavorite: false
    },
    {
      id: '5',
      name: 'Monitoring Server',
      description: 'System monitoring and metrics',
      status: 'online',
      type: 'Monitoring',
      organization: 'Infrastructure',
      capabilities: ['Metrics', 'Logging', 'Alerting'],
      healthScore: 92,
      lastSeen: '1 minute ago',
      responseTime: 95,
      uptime: 99.5,
      tags: ['monitoring', 'metrics', 'infrastructure'],
      isFavorite: false
    }
  ];

  const statusOptions = ['online', 'offline', 'warning'];
  const typeOptions = ['API', 'Database', 'Cache', 'Storage', 'Monitoring', 'Web Server'];
  const organizationOptions = ['Production', 'Development', 'Staging', 'Infrastructure'];
  const capabilityOptions = ['REST API', 'Authentication', 'Rate Limiting', 'SQL', 'Replication', 'Backup', 'Redis', 'Caching', 'Session Storage', 'File Storage', 'NFS', 'Metrics', 'Logging', 'Alerting'];

  const filteredResults = useMemo(() => {
    let results = [...mockResults];

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(result => 
        result.name.toLowerCase().includes(query) ||
        result.description.toLowerCase().includes(query) ||
        result.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      results = results.filter(result => filters.status.includes(result.status));
    }

    // Type filter
    if (filters.type.length > 0) {
      results = results.filter(result => filters.type.includes(result.type));
    }

    // Organization filter
    if (filters.organization.length > 0) {
      results = results.filter(result => filters.organization.includes(result.organization));
    }

    // Capabilities filter
    if (filters.capabilities.length > 0) {
      results = results.filter(result => 
        filters.capabilities.some(cap => result.capabilities.includes(cap))
      );
    }

    // Health score filter
    results = results.filter(result => 
      result.healthScore >= filters.healthScore[0] && 
      result.healthScore <= filters.healthScore[1]
    );

    // Last seen filter
    if (filters.lastSeen) {
      const now = new Date();
      const filterTime = new Date(now.getTime() - parseInt(filters.lastSeen) * 60 * 1000);
      results = results.filter(result => {
        // Mock implementation - in real app, parse lastSeen properly
        return true;
      });
    }

    // Sorting
    results.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'healthScore':
          aValue = a.healthScore;
          bValue = b.healthScore;
          break;
        case 'lastSeen':
          aValue = a.lastSeen;
          bValue = b.lastSeen;
          break;
        case 'responseTime':
          aValue = a.responseTime;
          bValue = b.responseTime;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return results;
  }, [filters]);

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

