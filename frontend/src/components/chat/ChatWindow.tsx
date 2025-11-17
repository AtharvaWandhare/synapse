import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import ChatMessage from './ChatMessage';
import axios from 'axios';

interface Message {
  id: number;
  sender_type: string;
  sender_id: number;
  content: string;
  created_at: string;
  is_own_message?: boolean;
}

interface ChatWindowProps {
  conversationId: number | null;
  conversationTitle: string;
}

export default function ChatWindow({ conversationId, conversationTitle }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { socket, isConnected } = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasJoinedRoom = useRef(false);

  // Fetch message history
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('jwt');
        const response = await axios.get(
          `http://localhost:5000/api/chat/conversations/${conversationId}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages(response.data.messages || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    hasJoinedRoom.current = false;
  }, [conversationId]);

  // Join socket room
  useEffect(() => {
    if (!socket || !conversationId || !isConnected || hasJoinedRoom.current) {
      return;
    }

    const token = localStorage.getItem('jwt');
    const currentUserId = parseInt(localStorage.getItem('user_id') || '0');
    const currentUserType = localStorage.getItem('user_type');
    
    socket.emit('join', { conversation_id: conversationId, token });
    hasJoinedRoom.current = true;

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      // Calculate is_own_message based on current user
      const isOwnMessage = 
        message.sender_type === currentUserType && 
        message.sender_id === currentUserId;
      
      setMessages((prev) => [...prev, { ...message, is_own_message: isOwnMessage }]);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      if (conversationId) {
        socket.emit('leave', { conversation_id: conversationId });
      }
    };
  }, [socket, conversationId, isConnected]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket || !conversationId || sending) {
      return;
    }

    setSending(true);
    const token = localStorage.getItem('jwt');

    socket.emit('send_message', {
      conversation_id: conversationId,
      content: newMessage.trim(),
      token,
    });

    setNewMessage('');
    setSending(false);
  };

  if (!conversationId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground text-center">
            Select a conversation to start chatting
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden relative">
      <CardHeader className="border-b shrink-0">
        <CardTitle className="text-lg">{conversationTitle}</CardTitle>
        {!isConnected && (
          <p className="text-xs text-muted-foreground">Connecting...</p>
        )}
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-4 pb-24" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <CardFooter className="p-4 border-t shrink-0 bg-white/95 absolute bottom-0 left-0 right-0 z-20 shadow-md backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="w-full">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || !isConnected}
            className="flex-1 bg-white/60 dark:bg-input/80 border"
          />
          <Button type="submit" disabled={sending || !isConnected || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        </form>
      </CardFooter>
    </Card>
  );
}
