import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Clock, User, Bot } from 'lucide-react';
import { CallSession, Message } from './CallInterface';

interface TranscriptPanelProps {
  session: CallSession | null;
  onAddMessage: (text: string, speaker: 'agent' | 'customer') => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export const TranscriptPanel = ({ session, onAddMessage, isProcessing }: TranscriptPanelProps) => {
  
  const downloadTranscript = () => {
    if (!session) return;
    
    const transcript = session.messages.map(msg => 
      `[${msg.timestamp.toLocaleTimeString()}] ${msg.speaker.toUpperCase()}: ${msg.text}`
    ).join('\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-transcript-${session.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (start: Date, end?: Date) => {
    const duration = (end || new Date()).getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const MessageIcon = ({ speaker }: { speaker: 'agent' | 'customer' }) => {
    return speaker === 'agent' ? (
      <Bot className="h-4 w-4 text-primary" />
    ) : (
      <User className="h-4 w-4 text-secondary-foreground" />
    );
  };

  return (
    <Card className="h-[600px] flex flex-col shadow-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Call Transcript</h3>
          
          {session && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(session.startTime, session.endTime)}
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadTranscript}
                disabled={!session.messages.length}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {!session ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start a call to see the transcript</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {session.messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageIcon speaker={message.speaker} />
                  <span className="capitalize font-medium">
                    {message.speaker}
                  </span>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
                
                <div className={`p-3 rounded-lg border ${
                  message.speaker === 'agent' 
                    ? 'bg-agent-message border-border/50' 
                    : 'bg-customer-message border-border'
                }`}>
                  <p className="text-sm leading-relaxed">{message.text}</p>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-pulse flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animation-delay-400"></div>
                </div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {session && session.status === 'active' && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            Real-time transcript • Session {session.id}
          </div>
        </div>
      )}
    </Card>
  );
};