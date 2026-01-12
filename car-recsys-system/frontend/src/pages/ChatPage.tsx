/**
 * Full Page Chat Component
 * Provides a dedicated chat experience with conversation history
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, Send, Loader2, Car, Plus, Trash2, 
  ChevronLeft, Clock, Search, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  chatApi, ChatMessage, ChatConversation, Vehicle, 
  formatPrice, formatMileage, isAuthenticated, getCurrentUser 
} from '@/lib/api';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  vehicles?: Vehicle[];
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = getCurrentUser();

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    if (isAuthenticated()) {
      loadConversations();
    }
  }, []);

  // Load welcome message for new conversation
  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! 👋 I'm your AI car shopping assistant. I can help you:\n\n• Find vehicles that match your needs and budget\n• Compare different makes and models\n• Answer questions about features and specifications\n• Provide personalized recommendations\n\nWhat kind of car are you looking for today?",
        timestamp: new Date()
      }]);
    }
  }, [messages.length, conversationId]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const convs = await chatApi.getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (convId: string) => {
    setIsLoading(true);
    try {
      const msgs = await chatApi.getConversationMessages(convId);
      setMessages(msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        vehicles: m.vehicles,
        timestamp: new Date(m.created_at)
      })));
      setConversationId(convId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  const deleteConversation = async (convId: string) => {
    try {
      await chatApi.deleteConversation(convId);
      setConversations(prev => prev.filter(c => c.conversation_id !== convId));
      if (conversationId === convId) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(userMessage.content, conversationId || undefined);
      
      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
        // Refresh conversation list
        if (isAuthenticated()) {
          loadConversations();
        }
      }

      const assistantMessage: Message = {
        id: response.message_id,
        role: 'assistant',
        content: response.response,
        vehicles: response.vehicles,
        timestamp: new Date(response.timestamp)
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return msgDate.toLocaleDateString();
  };

  // Quick suggestion prompts
  const suggestions = [
    "I'm looking for a reliable SUV under $30,000",
    "What are the best fuel-efficient sedans?",
    "Show me luxury cars with low mileage",
    "Compare Honda Accord vs Toyota Camry",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation History */}
        {isAuthenticated() && (
          <div className={cn(
            "w-72 border-r bg-muted/30 flex flex-col transition-all duration-300",
            !showSidebar && "w-0 border-r-0"
          )}>
            {showSidebar && (
              <>
                <div className="p-4 border-b">
                  <Button
                    onClick={startNewConversation}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                    New Conversation
                  </Button>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {loadingConversations ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No conversations yet
                      </p>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.conversation_id}
                          className={cn(
                            "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                            "hover:bg-accent",
                            conversationId === conv.conversation_id && "bg-accent"
                          )}
                          onClick={() => loadConversation(conv.conversation_id)}
                        >
                          <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              {conv.preview || 'New conversation'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(conv.updated_at)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.conversation_id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-14 border-b flex items-center px-4 gap-3">
            {isAuthenticated() && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden"
              >
                <ChevronLeft className={cn(
                  "h-5 w-5 transition-transform",
                  !showSidebar && "rotate-180"
                )} />
              </Button>
            )}
            <Avatar className="h-8 w-8 bg-primary">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Car className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">Car Shopping Assistant</h2>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={cn(
                  "flex gap-4",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <Avatar className={cn(
                    "h-10 w-10 flex-shrink-0",
                    message.role === 'user' ? "bg-secondary" : "bg-primary"
                  )}>
                    <AvatarFallback className={cn(
                      message.role === 'user' 
                        ? "bg-secondary text-secondary-foreground" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {message.role === 'user' 
                        ? (user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U') 
                        : <Car className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={cn(
                    "max-w-[80%] space-y-2",
                    message.role === 'user' && "text-right"
                  )}>
                    <div className={cn(
                      "inline-block rounded-lg px-4 py-3",
                      message.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <p className="whitespace-pre-wrap text-left">{message.content}</p>
                    </div>
                    
                    {/* Vehicle Cards */}
                    {message.vehicles && message.vehicles.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {message.vehicles.slice(0, 4).map((vehicle) => (
                          <Link
                            key={vehicle.id}
                            to={`/vehicles/${vehicle.id}`}
                            className="block p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                          >
                            <div className="flex gap-3">
                              {vehicle.image_url ? (
                                <img
                                  src={vehicle.image_url}
                                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                  className="w-24 h-18 object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-24 h-18 bg-muted rounded flex items-center justify-center">
                                  <Car className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </p>
                                {vehicle.trim && (
                                  <p className="text-xs text-muted-foreground">{vehicle.trim}</p>
                                )}
                                <p className="text-sm font-semibold text-primary mt-1">
                                  {formatPrice(vehicle.price)}
                                </p>
                                {vehicle.mileage && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatMileage(vehicle.mileage)}
                                  </p>
                                )}
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 bg-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Car className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions for new conversations */}
              {messages.length <= 1 && !isLoading && (
                <div className="mt-8">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Try asking:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-sm"
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="max-w-3xl mx-auto flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
