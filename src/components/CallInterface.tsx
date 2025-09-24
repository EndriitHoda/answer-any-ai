import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Settings } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';
import { TranscriptPanel } from './TranscriptPanel';
import { ApiKeyManager } from './ApiKeyManager';
import { AIServices, getApiKeys, recordAudio } from '@/lib/ai-services';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  text: string;
  speaker: 'agent' | 'customer';
  timestamp: Date;
}

export interface CallSession {
  id: string;
  messages: Message[];
  startTime: Date;
  endTime?: Date;
  status: 'idle' | 'connecting' | 'active' | 'ended';
}

export const CallInterface = () => {
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiServices, setAiServices] = useState<AIServices | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    updateAIServices();
  }, []);

  const updateAIServices = () => {
    const keys = getApiKeys();
    if (keys.openaiKey && keys.elevenlabsKey) {
      setAiServices(new AIServices(keys));
    } else {
      setAiServices(null);
    }
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Create new call session
      const newSession: CallSession = {
        id: Date.now().toString(),
        messages: [{
          id: '1',
          text: "Hello! Thank you for calling our customer service. How can I help you today?",
          speaker: 'agent',
          timestamp: new Date()
        }],
        startTime: new Date(),
        status: 'active'
      };
      
      setCallSession(newSession);
      setIsRecording(true);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      // Check if AI services are available
      if (!aiServices) {
        toast({
          title: 'API Keys Required',
          description: 'Please configure your OpenAI and ElevenLabs API keys in settings',
          variant: 'destructive'
        });
        setShowSettings(true);
        return;
      }

      // Play welcome message
      try {
        const audioBuffer = await aiServices.textToSpeech("Hello! Thank you for calling our customer service. How can I help you today?");
        await aiServices.playAudio(audioBuffer);
      } catch (error) {
        console.error('Error playing welcome message:', error);
      }

      // Start periodic recording for speech-to-text
      startPeriodicRecording();
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Microphone Error',
        description: 'Unable to access microphone. Please check permissions.',
        variant: 'destructive'
      });
    }
  };

  const endCall = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (callSession) {
      const endedSession = {
        ...callSession,
        status: 'ended' as const,
        endTime: new Date()
      };
      
      setCallSession(endedSession);
      
      // Save to localStorage
      const existingSessions = JSON.parse(localStorage.getItem('ai-agent-sessions') || '[]');
      existingSessions.push(endedSession);
      localStorage.setItem('ai-agent-sessions', JSON.stringify(existingSessions));
    }
    
    setIsRecording(false);
    setConversationHistory([]);
  };

  const startPeriodicRecording = () => {
    if (!streamRef.current || !aiServices) return;

    recordingIntervalRef.current = setInterval(async () => {
      try {
        if (!streamRef.current || !aiServices) return;
        
        setIsProcessing(true);
        
        // Record 3 seconds of audio
        const audioBlob = await recordAudio(streamRef.current, 3000);
        
        // Skip if audio is too small (likely silence)
        if (audioBlob.size < 1000) {
          setIsProcessing(false);
          return;
        }
        
        // Convert to text
        const transcript = await aiServices.speechToText(audioBlob);
        
        // Skip if transcript is too short or empty
        if (!transcript || transcript.trim().length < 5) {
          setIsProcessing(false);
          return;
        }
        
        // Process customer message
        await processCustomerMessage(transcript);
        
      } catch (error) {
        console.error('Error processing audio:', error);
        setIsProcessing(false);
      }
    }, 5000); // Record every 5 seconds
  };

  const processCustomerMessage = async (customerMessage: string) => {
    if (!aiServices) return;

    try {
      // Add customer message to history and UI
      addMessage(customerMessage, 'customer');
      
      // Update conversation history for AI context
      const newHistory = [...conversationHistory, { role: 'user', content: customerMessage }];
      
      // Generate AI response
      const aiResponse = await aiServices.generateResponse(customerMessage, conversationHistory);
      
      // Add AI response to history and UI
      addMessage(aiResponse, 'agent');
      
      // Update conversation history
      const updatedHistory = [...newHistory, { role: 'assistant', content: aiResponse }];
      setConversationHistory(updatedHistory);

      // Convert AI response to speech and play
      try {
        const audioBuffer = await aiServices.textToSpeech(aiResponse);
        await aiServices.playAudio(audioBuffer);
      } catch (error) {
        console.error('Error with text-to-speech:', error);
      }

      setIsProcessing(false);

    } catch (error) {
      console.error('Error processing customer message:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process customer message. Check your API keys.',
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255);
      
      if (isRecording) {
        requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  };

  const addMessage = (text: string, speaker: 'agent' | 'customer') => {
    if (!callSession) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      speaker,
      timestamp: new Date()
    };
    
    setCallSession({
      ...callSession,
      messages: [...callSession.messages, newMessage]
    });
  };

  const getStatusColor = () => {
    switch (callSession?.status) {
      case 'active': return 'bg-call-active';
      case 'connecting': return 'bg-call-muted';
      case 'ended': return 'bg-call-inactive';
      default: return 'bg-muted';
    }
  };

  const getStatusText = () => {
    switch (callSession?.status) {
      case 'active': return 'Call Active';
      case 'connecting': return 'Connecting...';
      case 'ended': return 'Call Ended';
      default: return 'Ready';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Call Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
                  <span className="text-lg font-semibold">{getStatusText()}</span>
                </div>
                {callSession && (
                  <Badge variant="secondary">
                    Session {callSession.id}
                  </Badge>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowSettings(!showSettings);
                  updateAIServices();
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            {showSettings && (
              <div className="mt-4 pt-4 border-t border-border">
                <ApiKeyManager />
              </div>
            )}
          </Card>

          {/* Audio Visualization */}
          <Card className="p-6 shadow-card">
            <div className="text-center space-y-4">
              <AudioWaveform 
                isActive={isRecording} 
                audioLevel={audioLevel}
              />
              
              {isProcessing && (
                <div className="text-sm text-muted-foreground">
                  Processing audio...
                </div>
              )}
            </div>
          </Card>

          {/* Call Controls */}
          <Card className="p-6 shadow-card">
            <div className="flex justify-center gap-4">
              {!callSession || callSession.status === 'ended' ? (
                <Button
                  onClick={startCall}
                  size="lg"
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Start Call
                </Button>
              ) : (
                <>
                  <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="lg"
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={endCall}
                  >
                    <PhoneOff className="mr-2 h-5 w-5" />
                    End Call
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Transcript Panel */}
        <div className="lg:col-span-1">
          <TranscriptPanel 
            session={callSession}
            onAddMessage={addMessage}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        </div>
      </div>
    </div>
  );
};