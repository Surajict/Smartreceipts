import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minimize2, Bot, User, Loader2 } from 'lucide-react';
import { FAQItem } from '../data/faqKnowledgeBase';
import { ChatbotService } from '../services/chatbotService';
import { useUser } from '../contexts/UserContext';
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
}

// Function to generate a unique session ID
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

const Chatbot: React.FC<ChatbotProps> = ({ className = '' }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sessionId] = useState<string>(() => generateSessionId()); // Generate session ID once
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
  }, [sessionId]);
      // Use the enhanced chatbot service
      const result = await ChatbotService.processMessage(text.trim(), sessionId, user?.id);
      
        faqMatch: result.faqMatch,
        suggestions: result.suggestions
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I\'m sorry, I\'m having technical difficulties right now. Please try again later or contact our support team directly.',
        isUser: false,
        timestamp: new Date()
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
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

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <button
          onClick={toggleChatbot}
          className="bg-gradient-to-r from-primary to-teal-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6 group-hover:animate-pulse" />
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            ?
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary to-teal-600 text-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-2">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Smart Receipts Assistant</h3>
              <p className="text-xs text-white/80">Ask me anything!</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={toggleChatbot}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Close chat"
            <div className="absolute -top-2 -right-2 bg-accent-yellow text-text-primary text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse font-bold">
              FAQ
            </button>
          </div>
        </div>

        {/* Messages Area */}
        {!isMinimized && (
          <>
            <div className="flex-1 p-4 space-y-4 h-80 overflow-y-auto bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[80%] ${
                    message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.isUser 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-600'
                          <span className="text-xs text-green-600 flex items-center font-medium">
                      {message.isUser ? (
                            FAQ Match: {message.faqMatch.category}
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`rounded-2xl px-4 py-2 ${
                      message.isUser
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.isUser ? 'text-white/70' : 'text-gray-500'
                      }`}>
                          className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full transition-colors duration-200 border border-primary/20"
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
                  <div className="flex items-start space-x-2 max-w-[80%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl px-4 py-2 bg-white text-gray-800 border border-gray-200">
                      <div className="flex items-center space-x-1">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm text-gray-600">Thinking...</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about Smart Receipts..."
                  className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded transition-colors duration-200 capitalize"
                  className="bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
                <h3 className="font-semibold text-sm">Smart Receipts FAQ Assistant</h3>
                <p className="text-xs text-white/80">Instant answers to your questions!</p>
      </div>
    </div>
  );
};

export default Chatbot; 