// AI Services for Speech-to-Text, LLM, and Text-to-Speech

export interface ApiKeys {
  openaiKey: string;
  elevenlabsKey: string;
}

export class AIServices {
  private apiKeys: ApiKeys;

  constructor(apiKeys: ApiKeys) {
    this.apiKeys = apiKeys;
  }

  // Convert audio blob to text using OpenAI Whisper
  async speechToText(audioBlob: Blob): Promise<string> {
    if (!this.apiKeys.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKeys.openaiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${error}`);
    }

    const result = await response.json();
    return result.text;
  }

  // Generate AI response using OpenAI GPT-4
  async generateResponse(customerMessage: string, conversationHistory: Array<{role: string, content: string}>): Promise<string> {
    if (!this.apiKeys.openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are a professional customer service agent for a technology company. You are helpful, polite, and efficient.

Guidelines:
- Keep responses concise and friendly
- Ask clarifying questions when needed
- Offer solutions proactively
- Always maintain a professional tone
- If you cannot help with something, explain what you can help with instead
- End conversations appropriately when the customer's issue is resolved

The customer has just said: "${customerMessage}"

Respond naturally as a customer service agent would.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: customerMessage }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKeys.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 100,
        temperature: 0.8,
        presence_penalty: 0.6,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  }

  // Convert text to speech using ElevenLabs
  async textToSpeech(text: string): Promise<ArrayBuffer> {
    if (!this.apiKeys.elevenlabsKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Using Rachel voice (21m00Tcm4TlvDq8ikWAM) from ElevenLabs
    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKeys.elevenlabsKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    return response.arrayBuffer();
  }

  // Play audio from ArrayBuffer
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    const audioContext = new AudioContext();
    const audioBufferSource = audioContext.createBufferSource();
    
    const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);
    audioBufferSource.buffer = decodedBuffer;
    audioBufferSource.connect(audioContext.destination);
    
    return new Promise((resolve) => {
      audioBufferSource.onended = () => resolve();
      audioBufferSource.start();
    });
  }
}

// Helper function to get API keys from session storage
export function getApiKeys(): ApiKeys {
  const saved = sessionStorage.getItem('ai-agent-api-keys');
  if (saved) {
    return JSON.parse(saved);
  }
  return { openaiKey: '', elevenlabsKey: '' };
}

// Helper function to record audio for a specified duration
export function recordAudio(stream: MediaStream, duration: number = 3000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      resolve(blob);
    };
    
    mediaRecorder.onerror = (event) => {
      reject(event);
    };
    
    mediaRecorder.start();
    
    // Stop recording after specified duration
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, duration);
  });
}