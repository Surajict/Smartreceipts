import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  X, 
  Camera, 
  Search, 
  Shield, 
  User,
  Settings,
  ChevronRight,
  Target,
  Sparkles
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  action?: string;
  actionFn?: () => void;
}

interface GettingStartedChecklistProps {
  isVisible: boolean;
  onClose: () => void;
  onItemAction: (itemId: string) => void;
  completedItems: string[];
  onShowTour: () => void;
}

const GettingStartedChecklist: React.FC<GettingStartedChecklistProps> = ({
  isVisible,
  onClose,
  onItemAction,
  completedItems,
  onShowTour
}) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'take-tour',
      title: 'Take the Interactive Tour',
      description: 'Get familiar with Smart Receipts features in just 2 minutes',
      icon: Target,
      completed: completedItems.includes('take-tour'),
      action: 'Start Tour',
      actionFn: onShowTour
    },
    {
      id: 'scan-first-receipt',
      title: 'Scan Your First Receipt',
      description: 'Try our AI-powered receipt scanning technology',
      icon: Camera,
      completed: completedItems.includes('scan-first-receipt'),
      action: 'Scan Receipt',
      actionFn: () => onItemAction('scan-first-receipt')
    },
    {
      id: 'try-smart-search',
      title: 'Try Smart Search',
      description: 'Ask a question about your receipts using natural language',
      icon: Search,
      completed: completedItems.includes('try-smart-search'),
      action: 'Try Search',
      actionFn: () => onItemAction('try-smart-search')
    },
    {
      id: 'check-warranty',
      title: 'Explore Warranty Tracking',
      description: 'See how we automatically track your product warranties',
      icon: Shield,
      completed: completedItems.includes('check-warranty'),
      action: 'View Warranties',
      actionFn: () => onItemAction('check-warranty')
    },
    {
      id: 'complete-profile',
      title: 'Complete Your Profile',
      description: 'Add your name and preferences for a personalized experience',
      icon: User,
      completed: completedItems.includes('complete-profile'),
      action: 'Edit Profile',
      actionFn: () => onItemAction('complete-profile')
    }
  ]);

  useEffect(() => {
    setChecklist(prev => prev.map(item => ({
      ...item,
      completed: completedItems.includes(item.id)
    })));
  }, [completedItems]);

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:top-4 md:right-4 md:left-auto w-auto md:w-96 max-w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 max-h-[80vh] md:max-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary p-3 md:p-4 text-white">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 rounded-full p-1.5 md:p-2">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <h3 className="font-bold text-base md:text-lg">Getting Started</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
        
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs md:text-sm">
            <span>Your Progress</span>
            <span>{completedCount} of {totalCount} completed</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-1.5 md:h-2">
            <div 
              className="bg-white h-1.5 md:h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {progressPercentage === 100 && (
            <p className="text-xs md:text-sm text-white/90 mt-2">
              🎉 Congratulations! You've completed the onboarding!
            </p>
          )}
        </div>
      </div>

      {/* Checklist Items */}
      <div className="max-h-64 md:max-h-96 overflow-y-auto">
        <div className="p-3 md:p-4 space-y-2 md:space-y-3">
          {checklist.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`group border rounded-lg p-3 md:p-4 transition-all duration-200 ${
                  item.completed 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 hover:border-primary/30 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 md:space-x-3 flex-1">
                    {/* Completion Status */}
                    <div className="flex-shrink-0 mt-0.5 md:mt-1">
                      {item.completed ? (
                        <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 md:h-5 md:w-5 text-gray-400 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 md:space-x-2 mb-1">
                        <Icon className={`h-3 w-3 md:h-4 md:w-4 ${item.completed ? 'text-green-600' : 'text-primary'}`} />
                        <h4 className={`font-semibold text-xs md:text-sm ${item.completed ? 'text-green-800' : 'text-text-primary'} leading-tight`}>
                          {item.title}
                        </h4>
                      </div>
                      <p className={`text-xs leading-relaxed ${item.completed ? 'text-green-600' : 'text-text-secondary'}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!item.completed && item.action && item.actionFn && (
                    <button
                      onClick={item.actionFn}
                      className="flex items-center space-x-1 bg-primary text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors ml-2 md:ml-3 flex-shrink-0"
                    >
                      <span className="hidden md:inline">{item.action}</span>
                      <span className="md:hidden text-xs">Go</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}

                  {/* Completed Badge */}
                  {item.completed && (
                    <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ml-2 md:ml-3 flex-shrink-0">
                      <CheckCircle className="h-3 w-3" />
                      <span className="hidden md:inline">Done</span>
                      <span className="md:hidden">✓</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 md:p-4 bg-gray-50">
        <div className="text-center space-y-2">
          {progressPercentage < 100 ? (
            <>
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                Complete these steps to get the most out of Smart Receipts
              </p>
              <button
                onClick={onShowTour}
                className="text-primary hover:text-primary/80 text-xs md:text-sm font-medium transition-colors"
              >
                Need help? Take the interactive tour →
              </button>
            </>
          ) : (
            <>
              <p className="text-xs md:text-sm font-medium text-green-700">
                🎉 You're all set up! Enjoy using Smart Receipts.
              </p>
              <button
                onClick={onClose}
                className="bg-green-500 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-green-600 transition-colors"
              >
                Continue Using App
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GettingStartedChecklist; 