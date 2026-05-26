import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import { Button } from '../ui/UI';

export const VoiceRecorder = ({ onTranscriptChange, disabled, autoStart = false, hideControls = false, silent = false, className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const recordingRef = useRef(false);
  const transcriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Браузер не підтримує розпізнавання мовлення. Спробуй Chrome або Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'uk-UA';

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = transcriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += transcriptPart + ' ';
        } else {
          interimText += transcriptPart;
        }
      }

      transcriptRef.current = finalText;
      setTranscript(finalText);
      setInterimTranscript(interimText);
      onTranscriptChange(finalText + interimText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        setError('Мовлення не виявлено. Спробуй говорити голосніше.');
      } else if (event.error === 'audio-capture') {
        setError('Мікрофон недоступний. Перевір налаштування.');
      } else if (event.error === 'not-allowed') {
        setError('Доступ до мікрофона заборонено. Дозволь доступ у налаштуваннях браузера.');
      } else {
        setError(`Помилка розпізнавання: ${event.error}`);
      }

      recordingRef.current = false;
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (recordingRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recordingRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscriptChange]);

  const startRecording = async () => {
    try {
      setError('');

      if (!autoStart) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      transcriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      recordingRef.current = true;
      setIsRecording(true);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Не вдалося отримати доступ до мікрофона. Перевір налаштування.');
    }
  };

  const stopRecording = () => {
    recordingRef.current = false;
    setIsRecording(false);
    setInterimTranscript('');

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    if (!autoStart || disabled || !isSupported || isRecording) return;
    startRecording();
  }, [autoStart, disabled, isSupported, isRecording]);

  if (silent) {
    return null;
  }

  if (!isSupported) {
    return (
      <div className={`rounded-xl border border-amber-200 bg-amber-50 p-6 ${className || ''}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">Голосовий ввід недоступний</p>
            <p className="text-sm text-amber-800">
              {error || 'Твій браузер не підтримує розпізнавання мовлення. Використовуй текстовий режим.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      
      {!hideControls && (
      <div className="flex items-center justify-center gap-4 mb-6">
        {!isRecording ? (
          <Button
            variant="gradient"
            size="lg"
            icon={Mic}
            onClick={startRecording}
            disabled={disabled}
            className="px-8"
          >
            Почати запис
          </Button>
        ) : (
          <Button
            variant="danger"
            size="lg"
            icon={Square}
            onClick={stopRecording}
            className="px-8"
          >
            Зупинити запис
          </Button>
        )}
      </div>
      )}

      
      {isRecording && (
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping" />
          </div>
          <span className="text-red-700 font-semibold">Запис...</span>
        </div>
      )}

      
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      
      {(transcript || interimTranscript) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-semibold text-slate-500 mb-2">Транскрипція:</p>
          <div className="text-slate-950 whitespace-pre-wrap">
            <span>{transcript}</span>
            {interimTranscript && (
              <span className="text-slate-500 italic">{interimTranscript}</span>
            )}
          </div>
        </div>
      )}

      
      {!isRecording && !transcript && (
        <div className="text-center text-sm font-medium text-slate-500">
          <p>Натисни кнопку та почни говорити.</p>
          <p className="mt-1">Твоє мовлення буде автоматично перетворено на текст.</p>
        </div>
      )}
    </div>
  );
};
