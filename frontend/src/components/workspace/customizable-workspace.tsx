'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Layout, 
  Palette, 
  Bell, 
  Eye, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Copy,
  Star,
  Grid,
  List,
  BarChart3,
  Activity,
  Server,
  AlertTriangle,
  TrendingUp,
  Clock,
  Filter,
  Search
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isFavorite: boolean;
  layout: 'grid' | 'list' | 'compact';
  theme: 'light' | 'dark' | 'auto';
  widgets: Widget[];
  filters: FilterConfig;
  notifications: NotificationConfig;
  createdAt: string;
  updatedAt: string;
}

interface Widget {
  id: string;
  type: 'metrics' | 'chart' | 'server-list' | 'alerts' | 'performance' | 'custom';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  isVisible: boolean;
}

interface FilterConfig {
  status: string[];
  type: string[];
  organization: string[];
  healthScore: [number, number];
  timeRange: string;
}

interface NotificationConfig {
  email: boolean;
  push: boolean;
  sms: boolean;
  criticalOnly: boolean;
  frequency: 'immediate' | 'hourly' | 'daily';
}

const CustomizableWorkspace: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load workspaces from localStorage (since there's no backend endpoint yet)
  useEffect(() => {
    const loadWorkspaces = () => {
      try {
        const stored = localStorage.getItem('mcp-workspaces');
        if (stored) {
          const parsedWorkspaces: Workspace[] = JSON.parse(stored);
          setWorkspaces(parsedWorkspaces);
          const defaultWorkspace = parsedWorkspaces.find(w => w.isDefault) || parsedWorkspaces[0];
          if (defaultWorkspace) {
            setActiveWorkspace(defaultWorkspace);
          }
        } else {
          // No workspaces stored - start with empty array
          setWorkspaces([]);
        }
      } catch (error) {
        console.error('Failed to load workspaces from localStorage:', error);
        setWorkspaces([]);
      }
    };

    loadWorkspaces();
  }, []);

  // Save workspaces to localStorage whenever they change
  useEffect(() => {
    if (workspaces.length > 0) {
      try {
        localStorage.setItem('mcp-workspaces', JSON.stringify(workspaces));
      } catch (error) {
        console.error('Failed to save workspaces to localStorage:', error);
      }
    }
  }, [workspaces]);

  const handleCreateWorkspace = () => {
    const newWorkspace: Workspace = {
      id: Date.now().toString(),
      name: 'New Workspace',
      description: 'Custom workspace',
      isDefault: false,
      isFavorite: false,
      layout: 'grid',
      theme: 'light',
      widgets: [],
      filters: {
        status: [],
        type: [],
        organization: [],
        healthScore: [0, 100],
        timeRange: '24h'
      },
      notifications: {
        email: true,
        push: true,
        sms: false,
        criticalOnly: false,
        frequency: 'immediate'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setWorkspaces(prev => [...prev, newWorkspace]);
    setActiveWorkspace(newWorkspace);
    setIsEditing(true);
  };

  const handleUpdateWorkspace = (workspace: Workspace) => {
    setWorkspaces(prev => 
      prev.map(w => w.id === workspace.id ? { ...workspace, updatedAt: new Date().toISOString() } : w)
    );
    setActiveWorkspace(workspace);
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    if (activeWorkspace?.id === workspaceId) {
      setActiveWorkspace(workspaces.find(w => w.id !== workspaceId) || workspaces[0]);
    }
  };

  const handleDuplicateWorkspace = (workspace: Workspace) => {
    const duplicated: Workspace = {
      ...workspace,
      id: Date.now().toString(),
      name: `${workspace.name} (Copy)`,
      isDefault: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setWorkspaces(prev => [...prev, duplicated]);
  };

  const handleSetDefault = (workspaceId: string) => {
    setWorkspaces(prev => 
      prev.map(w => ({ ...w, isDefault: w.id === workspaceId }))
    );
  };

  const handleToggleFavorite = (workspaceId: string) => {
    setWorkspaces(prev => 
      prev.map(w => w.id === workspaceId ? { ...w, isFavorite: !w.isFavorite } : w)
    );
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'metrics': return <BarChart3 className="h-4 w-4" />;
      case 'chart': return <TrendingUp className="h-4 w-4" />;
      case 'server-list': return <Server className="h-4 w-4" />;
      case 'alerts': return <AlertTriangle className="h-4 w-4" />;
      case 'performance': return <Activity className="h-4 w-4" />;
      default: return <Grid className="h-4 w-4" />;
    }
  };

  const getLayoutIcon = (layout: string) => {
    switch (layout) {
      case 'grid': return <Grid className="h-4 w-4" />;
      case 'list': return <List className="h-4 w-4" />;
      case 'compact': return <Layout className="h-4 w-4" />;
      default: return <Grid className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customizable Workspaces</h1>
          <p className="text-gray-600">Create and manage your personalized dashboards</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={showSettings ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleCreateWorkspace}>
            <Plus className="h-4 w-4 mr-2" />
            New Workspace
          </Button>
        </div>
      </div>

      {/* Workspace Tabs */}
      <Tabs value={activeWorkspace?.id} onValueChange={(value) => {
        const workspace = workspaces.find(w => w.id === value);
        if (workspace) setActiveWorkspace(workspace);
      }}>
        <TabsList className="grid w-full grid-cols-4">
          {workspaces.map((workspace) => (
            <TabsTrigger key={workspace.id} value={workspace.id} className="flex items-center space-x-2">
              {workspace.isFavorite && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
              <span>{workspace.name}</span>
              {workspace.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {workspaces.map((workspace) => (
          <TabsContent key={workspace.id} value={workspace.id} className="space-y-4">
            {/* Workspace Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      {getLayoutIcon(workspace.layout)}
                      <span>{workspace.name}</span>
                      {workspace.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                    </CardTitle>
                    <CardDescription>{workspace.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(workspace.id)}
                    >
                      <Star className={`h-4 w-4 ${workspace.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateWorkspace(workspace)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!workspace.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Workspace Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Widgets */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Widgets</CardTitle>
                    <CardDescription>Customize your dashboard widgets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {workspace.widgets.map((widget) => (
                        <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getWidgetIcon(widget.type)}
                            <div>
                              <p className="font-medium">{widget.title}</p>
                              <p className="text-sm text-gray-600 capitalize">{widget.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={widget.isVisible ? "default" : "secondary"}>
                              {widget.isVisible ? "Visible" : "Hidden"}
                            </Badge>
                            {isEditing && (
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {isEditing && (
                      <Button variant="outline" className="w-full mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Widget
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Default filters for this workspace</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <div className="flex flex-wrap gap-2">
                          {workspace.filters.status.map(status => (
                            <Badge key={status} variant="outline">{status}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Type</label>
                        <div className="flex flex-wrap gap-2">
                          {workspace.filters.type.map(type => (
                            <Badge key={type} variant="outline">{type}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Health Score Range</label>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{workspace.filters.healthScore[0]}%</span>
                          <span>-</span>
                          <span className="text-sm text-gray-600">{workspace.filters.healthScore[1]}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Settings Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Layout Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Layout</label>
                      <Select value={workspace.layout} onValueChange={(value) => 
                        handleUpdateWorkspace({ ...workspace, layout: value as any })
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid</SelectItem>
                          <SelectItem value="list">List</SelectItem>
                          <SelectItem value="compact">Compact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Theme</label>
                      <Select value={workspace.theme} onValueChange={(value) => 
                        handleUpdateWorkspace({ ...workspace, theme: value as any })
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={workspace.notifications.email}
                          onChange={(e) => handleUpdateWorkspace({
                            ...workspace,
                            notifications: { ...workspace.notifications, email: e.target.checked }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm">Email notifications</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={workspace.notifications.push}
                          onChange={(e) => handleUpdateWorkspace({
                            ...workspace,
                            notifications: { ...workspace.notifications, push: e.target.checked }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm">Push notifications</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={workspace.notifications.criticalOnly}
                          onChange={(e) => handleUpdateWorkspace({
                            ...workspace,
                            notifications: { ...workspace.notifications, criticalOnly: e.target.checked }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm">Critical alerts only</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Frequency</label>
                      <Select value={workspace.notifications.frequency} onValueChange={(value) => 
                        handleUpdateWorkspace({
                          ...workspace,
                          notifications: { ...workspace.notifications, frequency: value as any }
                        })
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!workspace.isDefault && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSetDefault(workspace.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button variant="outline" className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default CustomizableWorkspace;

