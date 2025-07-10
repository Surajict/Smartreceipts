import React, { useState, useEffect } from 'react';
import { Brain, Zap, Check, AlertCircle, Loader2 } from 'lucide-react';
import { OCREngine, OCRService } from '../services/ocrService';

interface OCRSelectorProps {
  selectedEngine: OCREngine;
  onEngineChange: (engine: OCREngine) => void;
  disabled?: boolean;
}

const OCRSelector: React.FC<OCRSelectorProps> = ({
  selectedEngine,
  onEngineChange,
  disabled = false
}) => {
  const [availableEngines, setAvailableEngines] = useState<
    { engine: OCREngine; name: string; description: string; available: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAvailableEngines();
  }, []);

  const checkAvailableEngines = async () => {
    setLoading(true);
    
    const engines = OCRService.getAvailableEngines();
    const enginesWithAvailability = await Promise.all(
      engines.map(async (engine) => ({
        ...engine,
        available: await OCRService.testEngine(engine.engine)
      }))
    );

    setAvailableEngines(enginesWithAvailability);
    setLoading(false);

    // If selected engine is not available, switch to first available one
    const selectedEngineAvailable = enginesWithAvailability.find(
      e => e.engine === selectedEngine && e.available
    );
    
    if (!selectedEngineAvailable) {
      const firstAvailable = enginesWithAvailability.find(e => e.available);
      if (firstAvailable) {
        onEngineChange(firstAvailable.engine);
      }
    }
  };

  const getEngineIcon = (engine: OCREngine) => {
    switch (engine) {
      case 'tesseract':
        return <Zap className="w-5 h-5" />;
      case 'google-cloud-vision':
        return <Brain className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getEngineFeatures = (engine: OCREngine) => {
    switch (engine) {
      case 'tesseract':
        return {
          pros: ['Works offline', 'Privacy-focused', 'No external dependencies', 'Always available'],
          cons: ['Lower accuracy', 'Slower processing', 'Limited for complex receipts']
        };
      case 'google-cloud-vision':
        return {
          pros: ['Highest accuracy', 'Fast processing', 'Handles complex layouts', 'AI-powered'],
          cons: ['Requires internet', 'Needs configuration', 'Primary option when available']
        };
      default:
        return { pros: [], cons: [] };
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Checking available OCR engines...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
        <Brain className="w-5 h-5 mr-2 text-blue-600" />
        Text Recognition Options
      </h3>
      
      <div className="space-y-3">
        {availableEngines.map((engine) => {
          const features = getEngineFeatures(engine.engine);
          const isSelected = selectedEngine === engine.engine;
          const isAvailable = engine.available;
          
          return (
            <div
              key={engine.engine}
              className={`
                relative border rounded-lg p-4 cursor-pointer transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                ${disabled ? 'pointer-events-none opacity-50' : ''}
              `}
              onClick={() => {
                if (isAvailable && !disabled) {
                  onEngineChange(engine.engine);
                }
              }}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
              )}
              
              {/* Unavailable Indicator */}
              {!isAvailable && (
                <div className="absolute top-2 right-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              )}

              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {getEngineIcon(engine.engine)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${
                      isSelected ? 'text-blue-800' : 'text-gray-800'
                    }`}>
                      {engine.name}
                    </h4>
                    {!isAvailable && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Not Available
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {engine.description}
                  </p>

                  {/* Features */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium text-green-700 mb-1">Advantages:</div>
                      <ul className="space-y-1">
                        {features.pros.map((pro, index) => (
                          <li key={index} className="text-green-600 flex items-center">
                            <Check className="w-3 h-3 mr-1" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <div className="font-medium text-orange-700 mb-1">Considerations:</div>
                      <ul className="space-y-1">
                        {features.cons.map((con, index) => (
                          <li key={index} className="text-orange-600 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Setup Instructions for unavailable engines */}
                  {!isAvailable && engine.engine === 'google-cloud-vision' && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Setup Required:</strong> Smart text recognition is not configured. Please contact support for assistance.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Smart text recognition provides the best accuracy for all types of receipts, 
          while basic recognition works as a reliable backup option.
        </p>
      </div>
    </div>
  );
};

export default OCRSelector; 