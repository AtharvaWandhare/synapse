import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: number;
  match_id: number;
  job_title: string;
  other_party_name: string;
  last_message: string | null;
  last_message_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (conversationId: number) => void;
  loading: boolean;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
}: ChatSidebarProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading conversations...</p>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No conversations yet. Accept an application to start chatting!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="space-y-2 p-4">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeConversationId === conv.id
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-sm truncate flex-1">
                    {conv.other_party_name}
                  </h4>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs mb-2">
                  {conv.job_title}
                </Badge>
                {conv.last_message && (
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.last_message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
