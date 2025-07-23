import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Minimize2, Bot, User, Loader2, Shield, FileText, MapPin, Clock } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import { WarrantyBuddyService } from '../services/warrantyBuddyService';

interface Receipt {
  id: string;
  product_description: string;
  brand_name: string;
  purchase_date: string;
  purchase_location: string;
  country: string;
  warranty_period: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  suggestions?: string[];
}

interface WarrantyBuddyProps {
  className?: string;
}

const WarrantyBuddy: React.FC<WarrantyBuddyProps> = ({ className = '' }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && user && receipts.length === 0) {
      loadUserReceipts();
    }
  }, [isOpen, user]);

  const loadUserReceipts = async () => {
    if (!user) return;

    setIsLoadingReceipts(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, product_description, brand_name, purchase_date, purchase_location, country, warranty_period')
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading receipts:', error);
        return;
      }

      setReceipts(data || []);
      
      if (data && data.length > 0) {
        setMessages([{
          id: '1',
          text: `Hello! I'm Warranty Buddy 🛡️, your personal warranty assistant. I found ${data.length} items in your receipt collection. Please select an item below to get warranty help!`,
          isUser: false,
          timestamp: new Date(),
          suggestions: []
        }]);
      } else {
        setMessages([{
          id: '1',
          text: `Hello! I'm Warranty Buddy 🛡️. I don't see any receipts in your account yet. Please scan some receipts first, then come back for warranty assistance!`,
          isUser: false,
          timestamp: new Date(),
          suggestions: []
        }]);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  const selectReceipt = async (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    
    const selectionMessage: Message = {
      id: Date.now().toString(),
      text: `Selected: ${receipt.product_description} by ${receipt.brand_name}`,
      isUser: true,
      timestamp: new Date()
    };

    const welcomeMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: `Perfect! I'm now ready to help you with warranty questions about your ${receipt.product_description} by ${receipt.brand_name}. 

Here's what I can help you with:
• Warranty claim process
• Coverage details and exclusions  
• Required documents
• Service center locations
• Warranty period and terms

What would you like to know?`,
      isUser: false,
      timestamp: new Date(),
      suggestions: [
        'How do I claim warranty?',
        'What documents do I need?',
        'Where is the nearest service center?',
        'What is covered under warranty?',
        'How long is my warranty valid?'
      ]
    };

    setMessages(prev => [...prev, selectionMessage, welcomeMessage]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping || !selectedReceipt) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await WarrantyBuddyService.processWarrantyQuery(
        text.trim(),
        selectedReceipt,
        user?.id
      );
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        isUser: false,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Warranty query error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I\'m having trouble accessing warranty information right now. Please try again later or contact our support team for direct assistance.',
        isUser: false,
        timestamp: new Date(),
        suggestions: ['Try again', 'Contact support']
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const minimizeChatbot = () => {
    setIsMinimized(true);
  };

  const restoreChatbot = () => {
    setIsMinimized(false);
  };

  const resetChat = () => {
    setSelectedReceipt(null);
    setMessages([]);
    loadUserReceipts();
  };

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
        <button
          onClick={toggleChatbot}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
          aria-label="Open Warranty Buddy"
        >
          <Shield className="h-6 w-6 group-hover:animate-pulse" />
          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse font-bold">
            💬
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 left-6 z-50 ${className}`}>
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-2">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Warranty Buddy</h3>
              <p className="text-xs text-white/80">Your warranty assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedReceipt && !isMinimized && (
              <button
                onClick={resetChat}
                className="text-white/80 hover:text-white transition-colors p-1 text-xs"
                title="Select different item"
              >
                Reset
              </button>
            )}
            {!isMinimized && (
              <button
                onClick={minimizeChatbot}
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Minimize chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            )}
            {isMinimized && (
              <button
                onClick={restoreChatbot}
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Restore chat"
              >
                <Shield className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={toggleChatbot}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!isMinimized && (
          <>
            {/* Receipt Selection or Messages */}
            <div className="flex-1 h-96 overflow-y-auto bg-gray-50">
              {!selectedReceipt ? (
                <div className="p-4">
                  {isLoadingReceipts ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-600">Loading your receipts...</p>
                    </div>
                  ) : receipts.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-800 mb-3">Select an item for warranty help:</h4>
                      {receipts.map((receipt) => (
                        <button
                          key={receipt.id}
                          onClick={() => selectReceipt(receipt)}
                          className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="font-medium text-gray-800 text-sm">
                            {receipt.product_description}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {receipt.brand_name} • {new Date(receipt.purchase_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Warranty: {receipt.warranty_period || 'Unknown'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No receipts found. Please scan some receipts first!</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div key={message.id} className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">{message.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Selected Item Info */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Selected Item</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      <div className="font-medium">{selectedReceipt.product_description}</div>
                      <div>{selectedReceipt.brand_name} • {new Date(selectedReceipt.purchase_date).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Messages */}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[85%] ${
                        message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.isUser 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {message.isUser ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </div>
                        <div className={`rounded-2xl px-4 py-2 ${
                          message.isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          
                          {/* Suggestions */}
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.suggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-full transition-colors duration-200 border border-blue-200"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            message.isUser ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-2 max-w-[85%]">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl px-4 py-2 bg-white text-gray-800 border border-gray-200">
                          <div className="flex items-center space-x-1">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <p className="text-sm text-gray-600">Researching warranty info...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area - Only show when item is selected */}
            {selectedReceipt && (
              <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <div className="flex items-center space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask about warranty, service centers, claims..."
                    className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={isTyping || !inputText.trim()}
                    className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WarrantyBuddy;