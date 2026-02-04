'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { 
  fetchWebhook, 
  fetchWebhookDeliveries,
  testWebhook,
  Webhook,
  WebhookDelivery 
} from '@/lib/api';
import { ClerkProtectedRoute } from '@/components/auth/clerk-protected-route';
import { ErrorBoundary } from '@/components/error-boundary';

export default function WebhookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const webhookId = params.id as string;
  
  const [webhook, setWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);

  useEffect(() => {
    loadWebhookData();
  }, [webhookId]);

  const loadWebhookData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [webhookData, deliveriesData] = await Promise.all([
        fetchWebhook(webhookId),
        fetchWebhookDeliveries(webhookId)
      ]);
      
      setWebhook(webhookData);
      setDeliveries(deliveriesData);
    } catch (err: any) {
      console.error('Error loading webhook data:', err);
      setError(err.message || 'Failed to load webhook details');
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhook) return;
    
    try {
      await testWebhook(webhook.id, 'test.event', { message: 'Test webhook delivery' });
      alert('Test webhook sent successfully!');
      // Reload deliveries to show the new test delivery
      setTimeout(loadWebhookData, 1000);
    } catch (err: any) {
      alert(`Failed to test webhook: ${err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'retrying':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ClerkProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Icons.spinner className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading webhook details...</p>
          </div>
        </div>
      </ClerkProtectedRoute>
    );
  }

  if (error || !webhook) {
    return (
      <ClerkProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Icons.alertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error || 'Webhook not found'}</p>
            <button
              onClick={() => router.push('/webhooks')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Webhooks
            </button>
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
              <button
                onClick={() => router.push('/webhooks')}
                className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
              >
                <Icons.arrowLeft className="h-4 w-4" />
                Back to Webhooks
              </button>
              
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{webhook.name}</h1>
                    <span
                      className={`px-3 py-1 text-sm rounded-full ${
                        webhook.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {webhook.description && (
                    <p className="text-gray-600 mb-2">{webhook.description}</p>
                  )}
                  <p className="text-gray-500 font-mono text-sm">{webhook.url}</p>
                </div>
                <button
                  onClick={handleTestWebhook}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Icons.play className="h-5 w-5" />
                  Test Webhook
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Deliveries</h3>
                <p className="text-3xl font-bold text-gray-900">{deliveries.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Successful</h3>
                <p className="text-3xl font-bold text-green-600">
                  {deliveries.filter((d) => d.status === 'success').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Failed</h3>
                <p className="text-3xl font-bold text-red-600">
                  {deliveries.filter((d) => d.status === 'failed').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Subscribed Events</h3>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(webhook.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(webhook.updated_at).toLocaleString()}
                    </span>
                  </div>
                  {webhook.last_triggered_at && (
                    <div>
                      <span className="text-gray-500">Last Triggered:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(webhook.last_triggered_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery History</h2>
              
              {deliveries.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.inbox className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No deliveries yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Send a test webhook to see delivery history
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDelivery(delivery)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-gray-900">{delivery.event_type}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(delivery.status)}`}>
                              {delivery.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(delivery.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {delivery.http_status_code && (
                            <span className={`text-sm font-medium ${
                              delivery.http_status_code >= 200 && delivery.http_status_code < 300
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              HTTP {delivery.http_status_code}
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Attempts: {delivery.attempts}/{delivery.max_attempts}
                          </p>
                        </div>
                      </div>
                      {delivery.error_message && (
                        <p className="text-sm text-red-600 mt-2">{delivery.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedDelivery && (
          <DeliveryDetailModal
            delivery={selectedDelivery}
            onClose={() => setSelectedDelivery(null)}
          />
        )}
      </ErrorBoundary>
    </ClerkProtectedRoute>
  );
}

interface DeliveryDetailModalProps {
  delivery: WebhookDelivery;
  onClose: () => void;
}

function DeliveryDetailModal({ delivery, onClose }: DeliveryDetailModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'retrying':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Delivery Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icons.close className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
              <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(delivery.status)}`}>
                {delivery.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Event Type</h3>
              <p className="text-gray-900">{delivery.event_type}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Created</h3>
                <p className="text-gray-900">{new Date(delivery.created_at).toLocaleString()}</p>
              </div>
              {delivery.delivered_at && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Delivered</h3>
                  <p className="text-gray-900">{new Date(delivery.delivered_at).toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Attempts</h3>
                <p className="text-gray-900">{delivery.attempts} / {delivery.max_attempts}</p>
              </div>
              {delivery.http_status_code && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">HTTP Status</h3>
                  <p className={`font-medium ${
                    delivery.http_status_code >= 200 && delivery.http_status_code < 300
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {delivery.http_status_code}
                  </p>
                </div>
              )}
            </div>

            {delivery.error_message && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Error Message</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{delivery.error_message}</p>
                </div>
              </div>
            )}

            {delivery.next_retry_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Next Retry</h3>
                <p className="text-gray-900">{new Date(delivery.next_retry_at).toLocaleString()}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Payload</h3>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm overflow-x-auto">
                {JSON.stringify(delivery.payload, null, 2)}
              </pre>
            </div>

            {delivery.response_body && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Response Body</h3>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm overflow-x-auto max-h-40">
                  {delivery.response_body}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
