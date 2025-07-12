import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Database,
  Brain,
  Eye,
  Github,
  Key,
  ArrowLeft
} from 'lucide-react';
import { testSupabaseConnection, testOpenAIConnection } from '../lib/supabase';
import { OCRService } from '../services/ocrService';

interface APIConnectionTestProps {
  onBack: () => void;
}

interface ConnectionStatus {
  name: string;
  status: 'checking' | 'connected' | 'error' | 'not-configured';
  message: string;
  icon: React.ComponentType<any>;
  required: boolean;
  details?: string;
}

const APIConnectionTest: React.FC<APIConnectionTestProps> = ({ onBack }) => {
  const [connections, setConnections] = useState<ConnectionStatus[]>([
    {
      name: 'Supabase Database',
      status: 'checking',
      message: 'Testing connection...',
      icon: Database,
      required: true
    },
    {
      name: 'OpenAI API (GPT-4o)',
      status: 'checking',
      message: 'Testing connection...',
      icon: Brain,
      required: true
    },
    {
      name: 'Google Cloud Vision OCR',
      status: 'checking',
      message: 'Testing connection...',
      icon: Eye,
      required: false
    },
    {
      name: 'Tesseract OCR (Fallback)',
      status: 'checking',
      message: 'Testing availability...',
      icon: Eye,
      required: false
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [envVariables, setEnvVariables] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    checkAllConnections();
    checkEnvironmentVariables();
  }, []);

  const checkEnvironmentVariables = () => {
    const envVars = {
      'VITE_SUPABASE_URL': !!import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder'),
      'VITE_SUPABASE_ANON_KEY': !!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('placeholder'),
      'VITE_OPENAI_API_KEY': !!import.meta.env.VITE_OPENAI_API_KEY,
      'VITE_GOOGLE_CLOUD_API_KEY': !!import.meta.env.VITE_GOOGLE_CLOUD_API_KEY
    };
    setEnvVariables(envVars);
  };

  const checkAllConnections = async () => {
    const newConnections = [...connections];

    // Test Supabase
    try {
      const supabaseWorking = await testSupabaseConnection();
      const supabaseIndex = newConnections.findIndex(c => c.name === 'Supabase Database');
      if (supabaseIndex !== -1) {
        newConnections[supabaseIndex] = {
          ...newConnections[supabaseIndex],
          status: supabaseWorking ? 'connected' : 'error',
          message: supabaseWorking ? 'Connected successfully' : 'Connection failed - check credentials',
          details: supabaseWorking ? 'Database queries working' : 'Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
        };
      }
    } catch (error) {
      const supabaseIndex = newConnections.findIndex(c => c.name === 'Supabase Database');
      if (supabaseIndex !== -1) {
        newConnections[supabaseIndex] = {
          ...newConnections[supabaseIndex],
          status: 'error',
          message: 'Connection error',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test OpenAI
    try {
      const openaiWorking = await testOpenAIConnection();
      const openaiIndex = newConnections.findIndex(c => c.name === 'OpenAI API (GPT-4o)');
      if (openaiIndex !== -1) {
        newConnections[openaiIndex] = {
          ...newConnections[openaiIndex],
          status: openaiWorking ? 'connected' : 'error',
          message: openaiWorking ? 'API key valid and working' : 'API key invalid or missing',
          details: openaiWorking ? 'GPT-4o model accessible' : 'Check VITE_OPENAI_API_KEY in .env file'
        };
      }
    } catch (error) {
      const openaiIndex = newConnections.findIndex(c => c.name === 'OpenAI API (GPT-4o)');
      if (openaiIndex !== -1) {
        newConnections[openaiIndex] = {
          ...newConnections[openaiIndex],
          status: 'error',
          message: 'Connection failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Test Google Cloud Vision
    try {
      const googleVisionWorking = await OCRService.testEngine('google-cloud-vision');
      const googleIndex = newConnections.findIndex(c => c.name === 'Google Cloud Vision OCR');
      if (googleIndex !== -1) {
        newConnections[googleIndex] = {
          ...newConnections[googleIndex],
          status: googleVisionWorking ? 'connected' : 'not-configured',
          message: googleVisionWorking ? 'API key configured' : 'API key not configured',
          details: googleVisionWorking ? 'Enhanced OCR available' : 'Optional: Add VITE_GOOGLE_CLOUD_API_KEY for better OCR'
        };
      }
    } catch (error) {
      const googleIndex = newConnections.findIndex(c => c.name === 'Google Cloud Vision OCR');
      if (googleIndex !== -1) {
        newConnections[googleIndex] = {
          ...newConnections[googleIndex],
          status: 'not-configured',
          message: 'Not configured',
          details: 'Optional service for enhanced OCR'
        };
      }
    }

    // Test Tesseract (always available)
    try {
      const tesseractWorking = await OCRService.testEngine('tesseract');
      const tesseractIndex = newConnections.findIndex(c => c.name === 'Tesseract OCR (Fallback)');
      if (tesseractIndex !== -1) {
        newConnections[tesseractIndex] = {
          ...newConnections[tesseractIndex],
          status: tesseractWorking ? 'connected' : 'error',
          message: tesseractWorking ? 'Available as fallback' : 'Not available',
          details: tesseractWorking ? 'Backup OCR service ready' : 'Fallback OCR not working'
        };
      }
    } catch (error) {
      const tesseractIndex = newConnections.findIndex(c => c.name === 'Tesseract OCR (Fallback)');
      if (tesseractIndex !== -1) {
        newConnections[tesseractIndex] = {
          ...newConnections[tesseractIndex],
          status: 'error',
          message: 'Error testing Tesseract',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    setConnections(newConnections);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkAllConnections();
    checkEnvironmentVariables();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'not-configured':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'not-configured':
        return 'border-yellow-200 bg-yellow-50';
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const requiredConnectionsWorking = connections
    .filter(c => c.required)
    .every(c => c.status === 'connected');

  const allConnectionsChecked = connections.every(c => c.status !== 'checking');

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <Key className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-text-primary">API Connection Status</h1>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Status */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">System Status</h2>
            {allConnectionsChecked && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                requiredConnectionsWorking ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {requiredConnectionsWorking ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {requiredConnectionsWorking ? 'All Required Services Connected' : 'Some Required Services Failed'}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-text-secondary">
            {requiredConnectionsWorking 
              ? 'Your Smart Receipt application is ready to use! All required APIs are connected and working.'
              : 'Some required services need attention. Please check the details below and fix any configuration issues.'
            }
          </p>
        </div>

        {/* Environment Variables Status */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-4">Environment Variables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(envVariables).map(([key, isSet]) => (
              <div key={key} className={`p-3 rounded-lg border ${isSet ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center space-x-2">
                  {isSet ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-text-primary">{key}</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {isSet ? 'Configured' : 'Missing or using placeholder'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* API Connections */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-text-primary mb-6">API Connection Tests</h2>
          
          <div className="space-y-4">
            {connections.map((connection, index) => {
              const Icon = connection.icon;
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor(connection.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="h-6 w-6 text-text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-text-primary">{connection.name}</h3>
                          {connection.required && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary mb-1">{connection.message}</p>
                        {connection.details && (
                          <p className="text-xs text-text-secondary">{connection.details}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusIcon(connection.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Setup Instructions */}
        {!requiredConnectionsWorking && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mt-8">
            <h2 className="text-xl font-bold text-text-primary mb-4">Setup Instructions</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-text-primary mb-2">1. Create .env file:</h4>
                <code className="block bg-gray-100 p-2 rounded text-xs">cp .env.example .env</code>
              </div>
              
              <div>
                <h4 className="font-medium text-text-primary mb-2">2. Add required API keys to .env:</h4>
                <div className="bg-gray-100 p-3 rounded text-xs space-y-1">
                  <div>VITE_SUPABASE_URL=https://napulczxrrnsjtmaixzp.supabase.co</div>
                  <div>VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here</div>
                  <div>VITE_OPENAI_API_KEY=sk-your_openai_api_key_here</div>
                  <div>VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_key_here (optional)</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text-primary mb-2">3. Get API keys from:</h4>
                <ul className="list-disc list-inside space-y-1 text-text-secondary">
                  <li>Supabase: <a href="https://supabase.com/dashboard" className="text-primary hover:underline">Dashboard → Settings → API</a></li>
                  <li>OpenAI: <a href="https://platform.openai.com/api-keys" className="text-primary hover:underline">Platform → API Keys</a></li>
                  <li>Google Cloud: <a href="https://console.cloud.google.com/apis/credentials" className="text-primary hover:underline">Console → APIs → Credentials</a></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default APIConnectionTest;