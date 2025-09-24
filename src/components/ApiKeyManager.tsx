import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiKeys {
  openaiKey: string;
  elevenlabsKey: string;
}

export const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ 
    openaiKey: '', 
    elevenlabsKey: '' 
  });
  const [showKeys, setShowKeys] = useState({ 
    openaiKey: false, 
    elevenlabsKey: false 
  });
  const [keyStatus, setKeyStatus] = useState({
    openaiKey: false,
    elevenlabsKey: false
  });
  
  const { toast } = useToast();

  useEffect(() => {
    // Load API keys from sessionStorage (temporary storage for demo)
    const savedKeys = sessionStorage.getItem('ai-agent-api-keys');
    if (savedKeys) {
      const keys = JSON.parse(savedKeys);
      setApiKeys(keys);
      setKeyStatus({
        openaiKey: !!keys.openaiKey,
        elevenlabsKey: !!keys.elevenlabsKey
      });
    }
  }, []);

  const handleKeyChange = (keyType: keyof ApiKeys, value: string) => {
    const newKeys = { ...apiKeys, [keyType]: value };
    setApiKeys(newKeys);
    
    // Save to sessionStorage
    sessionStorage.setItem('ai-agent-api-keys', JSON.stringify(newKeys));
    
    // Update status
    setKeyStatus(prev => ({
      ...prev,
      [keyType]: !!value
    }));
  };

  const toggleShowKey = (keyType: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [keyType]: !prev[keyType] }));
  };

  const testApiKey = async (keyType: keyof ApiKeys) => {
    const key = apiKeys[keyType];
    if (!key) return;

    try {
      if (keyType === 'openaiKey') {
        // Test OpenAI API key
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        
        if (response.ok) {
          toast({ title: 'OpenAI API Key Valid', description: 'Successfully connected to OpenAI' });
        } else {
          toast({ title: 'Invalid OpenAI API Key', variant: 'destructive' });
        }
      } else if (keyType === 'elevenlabsKey') {
        // Test ElevenLabs API key
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': key }
        });
        
        if (response.ok) {
          toast({ title: 'ElevenLabs API Key Valid', description: 'Successfully connected to ElevenLabs' });
        } else {
          toast({ title: 'Invalid ElevenLabs API Key', variant: 'destructive' });
        }
      }
    } catch (error) {
      toast({ 
        title: 'Connection Error', 
        description: 'Unable to verify API key',
        variant: 'destructive'
      });
    }
  };

  const getInstructions = () => (
    <div className="text-xs text-muted-foreground space-y-2">
      <p><strong>OpenAI API Key:</strong> Get from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a> (Free tier: $18 credit)</p>
      <p><strong>ElevenLabs API Key:</strong> Get from <a href="https://elevenlabs.io/app/speech-synthesis" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">elevenlabs.io</a> (Free tier: 10k characters/month)</p>
      <p className="text-yellow-500">⚠️ Keys are stored temporarily in your browser session only</p>
    </div>
  );

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4" />
        <h4 className="font-medium">API Configuration</h4>
      </div>

      <div className="space-y-4">
        {/* OpenAI API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="openai-key" className="flex items-center gap-2">
              OpenAI API Key
              {keyStatus.openaiKey ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-orange-500" />
              )}
            </Label>
            <Badge variant={keyStatus.openaiKey ? "default" : "secondary"}>
              {keyStatus.openaiKey ? "Set" : "Missing"}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="openai-key"
                type={showKeys.openaiKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKeys.openaiKey}
                onChange={(e) => handleKeyChange('openaiKey', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => toggleShowKey('openaiKey')}
              >
                {showKeys.openaiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testApiKey('openaiKey')}
              disabled={!apiKeys.openaiKey}
            >
              Test
            </Button>
          </div>
        </div>

        {/* ElevenLabs API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="elevenlabs-key" className="flex items-center gap-2">
              ElevenLabs API Key
              {keyStatus.elevenlabsKey ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-orange-500" />
              )}
            </Label>
            <Badge variant={keyStatus.elevenlabsKey ? "default" : "secondary"}>
              {keyStatus.elevenlabsKey ? "Set" : "Missing"}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="elevenlabs-key"
                type={showKeys.elevenlabsKey ? "text" : "password"}
                placeholder="Enter ElevenLabs API key..."
                value={apiKeys.elevenlabsKey}
                onChange={(e) => handleKeyChange('elevenlabsKey', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => toggleShowKey('elevenlabsKey')}
              >
                {showKeys.elevenlabsKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testApiKey('elevenlabsKey')}
              disabled={!apiKeys.elevenlabsKey}
            >
              Test
            </Button>
          </div>
        </div>
      </div>

      {getInstructions()}
    </Card>
  );
};