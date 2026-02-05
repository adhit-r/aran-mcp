'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { 
  fetchWebhooks, 
  createWebhook, 
  updateWebhook, 
  deleteWebhook, 
  testWebhook,
  Webhook,
  CreateWebhookRequest 
} from '@/lib/api';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { ErrorBoundary } from '@/components/error-boundary';

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWebhooks();
      setWebhooks(data);
    } catch (err: any) {
      console.error('Error loading webhooks:', err);
      setError(err.message || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = () => {
    setEditingWebhook(null);
    setShowCreateModal(true);
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setShowCreateModal(true);
  };

  const handleDeleteWebhook = async (webhook: Webhook) => {
    if (!confirm(`Are you sure you want to delete webhook "${webhook.name}"?`)) {
      return;
    }

    try {
      await deleteWebhook(webhook.id);
      await loadWebhooks();
    } catch (err: any) {
      alert(`Failed to delete webhook: ${err.message}`);
    }
  };

  const handleTestWebhook = async (webhook: Webhook) => {
    try {
      await testWebhook(webhook.id, 'test.event', { message: 'Test webhook delivery' });
      alert('Test webhook sent successfully! Check your endpoint for the delivery.');
    } catch (err: any) {
      alert(`Failed to test webhook: ${err.message}`);
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await updateWebhook(webhook.id, { is_active: !webhook.is_active });
      await loadWebhooks();
    } catch (err: any) {
      alert(`Failed to update webhook: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <ClerkProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Icons.spinner className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading webhooks...</p>
          </div>
        </div>
      </ClerkProtectedRoute>
    );
  }

  return (
    <ClerkProtectedRoute>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Webhooks</h1>
                  <p className="text-gray-600 mt-2">
                    Configure webhooks to receive event notifications from your MCP servers
                  </p>
                </div>
                <button
                  onClick={handleCreateWebhook}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Icons.plus className="h-5 w-5" />
                  Create Webhook
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {webhooks.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Icons.webhook className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No webhooks yet</h3>
                <p className="text-gray-600 mb-6">
                  Create your first webhook to start receiving event notifications
                </p>
                <button
                  onClick={handleCreateWebhook}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Webhook
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              webhook.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {webhook.description && (
                          <p className="text-gray-600 text-sm mb-2">{webhook.description}</p>
                        )}
                        <p className="text-gray-500 text-sm font-mono mb-3">{webhook.url}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {webhook.events.map((event) => (
                            <span
                              key={event}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(webhook.created_at).toLocaleString()}
                          {webhook.last_triggered_at && (
                            <span className="ml-4">
                              Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTestWebhook(webhook)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Test webhook"
                        >
                          <Icons.play className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(webhook)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title={webhook.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Icons.power className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => router.push(`/webhooks/${webhook.id}`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View details"
                        >
                          <Icons.eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEditWebhook(webhook)}
                          className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                          title="Edit webhook"
                        >
                          <Icons.edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete webhook"
                        >
                          <Icons.trash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <WebhookModal
            webhook={editingWebhook}
            onClose={() => {
              setShowCreateModal(false);
              setEditingWebhook(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingWebhook(null);
              loadWebhooks();
            }}
          />
        )}
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}

interface WebhookModalProps {
  webhook: Webhook | null;
  onClose: () => void;
  onSuccess: () => void;
}

function WebhookModal({ webhook, onClose, onSuccess }: WebhookModalProps) {
  const [formData, setFormData] = useState({
    name: webhook?.name || '',
    url: webhook?.url || '',
    description: webhook?.description || '',
    events: webhook?.events || [],
    is_active: webhook?.is_active !== false,
  });
  const [selectedEvent, setSelectedEvent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableEvents = [
    'server.status.changed',
    'server.health.alert',
    'server.created',
    'server.updated',
    'server.deleted',
    'alert.triggered',
    'alert.resolved',
    'security.test.completed',
    'discovery.scan.completed',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (webhook) {
        await updateWebhook(webhook.id, formData);
      } else {
        await createWebhook(formData as CreateWebhookRequest);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = () => {
    if (selectedEvent && !formData.events.includes(selectedEvent)) {
      setFormData({
        ...formData,
        events: [...formData.events, selectedEvent],
      });
      setSelectedEvent('');
    }
  };

  const handleRemoveEvent = (event: string) => {
    setFormData({
      ...formData,
      events: formData.events.filter((e) => e !== event),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {webhook ? 'Edit Webhook' : 'Create Webhook'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icons.close className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events *
                </label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an event</option>
                    {availableEvents
                      .filter((event) => !formData.events.includes(event))
                      .map((event) => (
                        <option key={event} value={event}>
                          {event}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddEvent}
                    disabled={!selectedEvent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.events.map((event) => (
                    <span
                      key={event}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {event}
                      <button
                        type="button"
                        onClick={() => handleRemoveEvent(event)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {formData.events.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Select at least one event type to subscribe to
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active (receive webhook notifications)
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || formData.events.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving && <Icons.spinner className="h-4 w-4 animate-spin" />}
                {webhook ? 'Update Webhook' : 'Create Webhook'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
