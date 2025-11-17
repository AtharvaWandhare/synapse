import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import axios from 'axios';

interface Conversation {
  id: number;
  match_id: number;
  job_title: string;
  other_party_name: string;
  last_message: string | null;
  last_message_at: string;
}

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await axios.get('http://localhost:5000/api/chat/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConversations(response.data);

        // Auto-select conversation from URL param
        const conversationIdParam = searchParams.get('conversation');
        if (conversationIdParam) {
          const convId = parseInt(conversationIdParam);
          const conv = response.data.find((c: Conversation) => c.id === convId);
          if (conv) {
            setActiveConversationId(convId);
            setConversationTitle(`${conv.other_party_name} - ${conv.job_title}`);
          }
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [searchParams]);

  const handleSelectConversation = (conversationId: number) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      setActiveConversationId(conversationId);
      setConversationTitle(`${conv.other_party_name} - ${conv.job_title}`);
      setSearchParams({ conversation: conversationId.toString() });
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
      </div>
      <div className="flex-1 max-w-7xl mx-auto px-4 pb-6 w-full overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          <div className="md:col-span-1 h-full">
            <ChatSidebar
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              loading={loading}
            />
          </div>
          <div className="md:col-span-2 h-full">
            <ChatWindow
              conversationId={activeConversationId}
              conversationTitle={conversationTitle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
