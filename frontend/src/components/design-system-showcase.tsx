"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DESIGN_SYSTEM, 
  COLORS, 
  TYPOGRAPHY, 
  SPACING, 
  BORDER_RADIUS, 
  BOX_SHADOW,
  getColor,
  getSpacing,
  getBorderRadius,
  getBoxShadow
} from '@/lib/design-tokens';

export function DesignSystemShowcase() {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          {DESIGN_SYSTEM.product.name} Design System
        </h1>
        <p className="text-lg text-muted-foreground">
          {DESIGN_SYSTEM.product.description}
        </p>
        <Badge variant="outline" className="text-sm">
          Version {DESIGN_SYSTEM.product.version}
        </Badge>
      </div>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>
            Semantic color tokens for consistent theming
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Primary</h4>
              <div className="h-16 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">Primary</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Secondary</h4>
              <div className="h-16 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-secondary-foreground text-sm font-medium">Secondary</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Destructive</h4>
              <div className="h-16 rounded-lg bg-destructive flex items-center justify-center">
                <span className="text-destructive-foreground text-sm font-medium">Destructive</span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Muted</h4>
              <div className="h-16 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm font-medium">Muted</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>
            Font families, sizes, and weights from the design system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold">Heading 1</h1>
            <h2 className="text-5xl font-bold">Heading 2</h2>
            <h3 className="text-4xl font-bold">Heading 3</h3>
            <h4 className="text-3xl font-bold">Heading 4</h4>
            <h5 className="text-2xl font-bold">Heading 5</h5>
            <h6 className="text-xl font-bold">Heading 6</h6>
            <p className="text-base">Body text - Regular paragraph text</p>
            <p className="text-sm text-muted-foreground">Small text - Muted foreground</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">Code text - Monospace font</code>
          </div>
        </CardContent>
      </Card>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle>Components</CardTitle>
          <CardDescription>
            UI components using the design system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Buttons */}
          <div className="space-y-3">
            <h4 className="font-semibold">Buttons</h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🚀</Button>
            </div>
          </div>

          {/* Form Elements */}
          <div className="space-y-3">
            <h4 className="font-semibold">Form Elements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" />
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="space-y-3">
            <h4 className="font-semibold">Alerts</h4>
            <Alert>
              <AlertDescription>
                This is a default alert message.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertDescription>
                This is a destructive alert message.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Spacing & Layout */}
      <Card>
        <CardHeader>
          <CardTitle>Spacing & Layout</CardTitle>
          <CardDescription>
            Spacing tokens and layout utilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Spacing Scale</h4>
            <div className="space-y-2">
              {Object.entries(SPACING).slice(0, 10).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-12 text-sm font-mono">{key}</span>
                  <div 
                    className="bg-primary h-4 rounded"
                    style={{ width: value }}
                  />
                  <span className="text-sm text-muted-foreground font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle>Border Radius</CardTitle>
          <CardDescription>
            Border radius tokens for consistent rounded corners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(BORDER_RADIUS).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div 
                  className="h-16 bg-primary"
                  style={{ borderRadius: value }}
                />
                <div className="text-center">
                  <p className="text-sm font-medium">{key}</p>
                  <p className="text-xs text-muted-foreground font-mono">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Box Shadows */}
      <Card>
        <CardHeader>
          <CardTitle>Box Shadows</CardTitle>
          <CardDescription>
            Shadow tokens for depth and elevation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(BOX_SHADOW).slice(0, 6).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div 
                  className="h-16 bg-background border"
                  style={{ boxShadow: value }}
                />
                <div className="text-center">
                  <p className="text-sm font-medium">{key}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Design Tokens Info */}
      <Card>
        <CardHeader>
          <CardTitle>Design Tokens</CardTitle>
          <CardDescription>
            Utility functions for accessing design tokens programmatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Color Functions</h4>
              <code className="block text-sm bg-muted p-2 rounded">
                getColor('light', 'primary') // {getColor('light', 'primary')}
              </code>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Spacing Functions</h4>
              <code className="block text-sm bg-muted p-2 rounded">
                getSpacing('4') // {getSpacing('4')}
              </code>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Border Radius Functions</h4>
              <code className="block text-sm bg-muted p-2 rounded">
                getBorderRadius('lg') // {getBorderRadius('lg')}
              </code>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Box Shadow Functions</h4>
              <code className="block text-sm bg-muted p-2 rounded">
                getBoxShadow('md') // {getBoxShadow('md')}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
