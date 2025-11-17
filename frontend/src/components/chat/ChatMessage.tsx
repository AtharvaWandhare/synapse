import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: number;
  sender_type: string;
  sender_id: number;
  content: string;
  created_at: string;
  is_own_message?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isOwnMessage = message.is_own_message;

  // Safely parse the timestamp
  const timestamp = (() => {
    try {
      const date = new Date(message.created_at);
      if (isNaN(date.getTime())) {
        return 'just now';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'just now';
    }
  })();

  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isOwnMessage
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <span
          className={cn(
            'text-xs mt-1 block',
            isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {timestamp}
        </span>
      </div>
    </div>
  );
}
