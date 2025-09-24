// AI Services for Speech-to-Text, LLM, and Text-to-Speech

export interface ApiKeys {
  openaiKey: string;
  elevenlabsKey: string;
}

export class AIServices {
  private apiKeys: ApiKeys;

  // Predefined responses for specific questions
  private predefinedResponses = {
    "hours": "We're open Monday through Friday, 9 AM to 6 PM Eastern Time. We're closed on weekends and holidays.",
    "return": "We offer a 30-day return policy for all items. Items must be in original condition with receipt. Free return shipping is included.",
    "tracking": "You can track your order using the tracking number sent to your email, or log into your account on our website to view real-time updates."
  };

  constructor(apiKeys: ApiKeys) {
    this.apiKeys = apiKeys;
  }

  // Detect which of the 3 supported questions is being asked
  private detectQuestion(message: string): string | null {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Check for hours-related questions
    if ((normalizedMessage.includes('hour') || normalizedMessage.includes('open') || normalizedMessage.includes('time') || normalizedMessage.includes('when')) &&
        (normalizedMessage.includes('what') || normalizedMessage.includes('when') || normalizedMessage.includes('your'))) {
      return "hours";
    }
    
    // Check for return policy questions
    if ((normalizedMessage.includes('return') || normalizedMessage.includes('refund') || normalizedMessage.includes('policy')) &&
        (normalizedMessage.includes('what') || normalizedMessage.includes('how') || normalizedMessage.includes('your'))) {
      return "return";
    }
    
    // Check for order tracking questions
    if ((normalizedMessage.includes('track') || normalizedMessage.includes('order') || normalizedMessage.includes('shipping') || normalizedMessage.includes('package')) &&
        (normalizedMessage.includes('how') || normalizedMessage.includes('where') || normalizedMessage.includes('my'))) {
      return "tracking";
    }
    
    return null;
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

  // Generate AI response - Fast responses for 3 specific questions
  async generateResponse(customerMessage: string, conversationHistory: Array<{role: string, content: string}>): Promise<string> {
    console.log('Processing message:', customerMessage);
    
    // Check if this is one of our 3 supported questions for instant response
    const detectedQuestion = this.detectQuestion(customerMessage);
    if (detectedQuestion && this.predefinedResponses[detectedQuestion]) {
      console.log(`Fast response for: ${detectedQuestion}`);
      return this.predefinedResponses[detectedQuestion];
    }

    // For any other questions, guide them to the 3 supported topics
    return "Hi! I can help you with three main topics: our business hours, return policy, or order tracking. Please ask me about one of those and I'll give you a quick answer!";
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