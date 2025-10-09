'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';

interface ServerPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  default_url: string;
  config_template: Record<string, any>;
  setup_instructions: string;
  security_notes: string;
  required_tools: string[];
}

export function ServerWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const [presets, setPresets] = useState<ServerPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<ServerPreset | null>(null);
  const [serverConfig, setServerConfig] = useState({
    name: '',
    url: '',
    description: '',
  });

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/mcp/presets');
      const data = await response.json();
      if (data.success) {
        setPresets(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      toast.error('Failed to load server presets');
    }
  };

  const categories = [...new Set(presets.map(p => p.category))];

  const handlePresetSelect = (preset: ServerPreset) => {
    setSelectedPreset(preset);
    setServerConfig({
      name: preset.name,
      url: preset.default_url,
      description: preset.description,
    });
    setStep(2);
  };

  const handleCreateServer = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverConfig),
      });

      if (response.ok) {
        toast.success('Server created successfully!');
        onComplete?.();
      } else {
        toast.error('Failed to create server');
      }
    } catch (error) {
      console.error('Error creating server:', error);
      toast.error('Error creating server');
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold
                ${step >= num ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-300'}`}
            >
              {num}
            </div>
            {num < 3 && (
              <div className={`w-16 h-0.5 ${step > num ? 'bg-black' : 'bg-gray-300'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Preset */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Choose a Server Type</h2>
          <p className="text-gray-600 mb-6">Select a preconfigured MCP server to get started quickly</p>

          {categories.map((category) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {presets.filter(p => p.category === category).map((preset) => (
                  <Card
                    key={preset.id}
                    className="aran-card cursor-pointer hover:shadow-brutalLg transition-all"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>{preset.name}</span>
                      </CardTitle>
                      <CardDescription>{preset.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Configure Server */}
      {step === 2 && selectedPreset && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Configure {selectedPreset.name}</h2>
          <Card className="aran-card mb-6">
            <CardHeader>
              <CardTitle>Server Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Server Name</Label>
                <Input
                  value={serverConfig.name}
                  onChange={(e) => setServerConfig({ ...serverConfig, name: e.target.value })}
                  className="aran-input"
                />
              </div>
              <div>
                <Label>Server URL</Label>
                <Input
                  value={serverConfig.url}
                  onChange={(e) => setServerConfig({ ...serverConfig, url: e.target.value })}
                  className="aran-input"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={serverConfig.description}
                  onChange={(e) => setServerConfig({ ...serverConfig, description: e.target.value })}
                  className="aran-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card className="aran-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icons.settings className="h-5 w-5" />
                Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded border-2 border-black whitespace-pre-wrap">
                {selectedPreset.setup_instructions}
              </pre>
            </CardContent>
          </Card>

          {/* Security Notes */}
          <Card className="aran-card bg-orange-50 border-orange-500 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Icons.shield className="h-5 w-5" />
                Security Considerations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-orange-700">{selectedPreset.security_notes}</p>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={() => setStep(1)} variant="outline" className="aran-btn-secondary">
              Back
            </Button>
            <Button onClick={() => setStep(3)} className="aran-btn-primary">
              Next: Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && selectedPreset && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Review & Create Server</h2>
          <Card className="aran-card mb-6">
            <CardHeader>
              <CardTitle>Server Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-semibold">Name:</span> {serverConfig.name}
              </div>
              <div>
                <span className="font-semibold">URL:</span> {serverConfig.url}
              </div>
              <div>
                <span className="font-semibold">Description:</span> {serverConfig.description}
              </div>
              <div>
                <span className="font-semibold">Type:</span> {selectedPreset.category}
              </div>
              <div>
                <span className="font-semibold">Required Tools:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPreset.required_tools.map((tool) => (
                    <span key={tool} className="aran-badge">{tool}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={() => setStep(2)} variant="outline" className="aran-btn-secondary">
              Back
            </Button>
            <Button onClick={handleCreateServer} className="aran-btn-accent">
              <Icons.check className="mr-2 h-4 w-4" />
              Create Server
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



