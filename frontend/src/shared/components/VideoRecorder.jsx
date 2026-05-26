import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AlertCircle, Camera, Mic, Play, Square, Video } from 'lucide-react';
import { Button } from '../ui/UI';

export const VideoRecorder = forwardRef(({ disabled, autoStart = false, hideControls = false, onRecordingComplete, onMetricsChange, className }, ref) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [metrics, setMetrics] = useState({
    cameraActive: false,
    microphoneActive: false,
    brightness: 0,
    blur: 0,
    clarity: 0,
    focusRatio: 0,
    speakingActivity: 0,
    speakingStability: 0,
    confidenceHeuristic: 0,
    offscreenRatio: null,
    blinkRate: null,
    fps: null,
    resolution: '',
    recommendations: [],
  });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(null);
  const stopResolverRef = useRef(null);
  const metricsSamplesRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const eyeBaselineRef = useRef(null);
  const lastBlinkAtRef = useRef(0);
  const blinkTimestampsRef = useRef([]);

  useEffect(() => {
    if ('FaceDetector' in window) {
      try {
        faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      } catch (detectorError) {
        faceDetectorRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (disabled) return undefined;
    let mounted = true;
    let localStream = null;

    const initializePreview = async () => {
      try {
        setError('');
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Браузер не підтримує доступ до камери або мікрофона.');
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream = mediaStream;
        setStream(mediaStream);
        const nextCameraActive = mediaStream.getVideoTracks().some((track) => track.readyState === 'live');
        const nextMicrophoneActive = mediaStream.getAudioTracks().some((track) => track.readyState === 'live');
        setCameraActive(nextCameraActive);
        setMicrophoneActive(nextMicrophoneActive);

        try {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(mediaStream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
        } catch (audioError) {
          analyserRef.current = null;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {
            setError('Камеру отримано, але браузер заблокував autoplay preview. Онови сторінку або перевір дозволи.');
          });
        }
      } catch (previewError) {
        setError('Не вдалося отримати доступ до камери або мікрофона. Перевір дозволи браузера.');
      }
    };

    initializePreview();

    return () => {
      mounted = false;
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      const activeStream = localStream || stream;
      activeStream?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close?.();
    };
  }, [disabled]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    if (!stream || !videoRef.current) return undefined;

    const estimateFaceBox = (data, width, height) => {
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      let skinPixels = 0;

      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const centerBias = Math.abs(x / width - 0.5) < 0.42 && y / height < 0.82;
          const looksLikeSkin = centerBias && r > 55 && g > 35 && b > 20 && max - min > 12 && r > g * 1.05 && r > b * 1.15;

          if (looksLikeSkin) {
            skinPixels += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (skinPixels < 50) return null;

      return {
        x: minX / width,
        y: minY / height,
        width: Math.max(0.12, (maxX - minX) / width),
        height: Math.max(0.16, (maxY - minY) / height),
        source: 'canvas_heuristic',
      };
    };

    const estimateBlinkRate = (data, width, height, faceBox) => {
      if (!faceBox) return null;

      const x1 = Math.max(0, Math.floor((faceBox.x + faceBox.width * 0.18) * width));
      const x2 = Math.min(width - 1, Math.floor((faceBox.x + faceBox.width * 0.82) * width));
      const y1 = Math.max(0, Math.floor((faceBox.y + faceBox.height * 0.28) * height));
      const y2 = Math.min(height - 1, Math.floor((faceBox.y + faceBox.height * 0.45) * height));
      let luminanceTotal = 0;
      let count = 0;

      for (let y = y1; y <= y2; y += 2) {
        for (let x = x1; x <= x2; x += 2) {
          const index = (y * width + x) * 4;
          luminanceTotal += (data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722) / 255;
          count += 1;
        }
      }

      if (!count) return null;

      const eyeLuminance = luminanceTotal / count;
      const baseline = eyeBaselineRef.current == null
        ? eyeLuminance
        : eyeBaselineRef.current * 0.9 + eyeLuminance * 0.1;
      eyeBaselineRef.current = baseline;

      const now = Date.now();
      if (baseline > 0.08 && eyeLuminance < baseline * 0.72 && now - lastBlinkAtRef.current > 900) {
        blinkTimestampsRef.current = [...blinkTimestampsRef.current, now].slice(-80);
        lastBlinkAtRef.current = now;
      }

      const oneMinuteAgo = now - 60000;
      blinkTimestampsRef.current = blinkTimestampsRef.current.filter((timestamp) => timestamp >= oneMinuteAgo);
      return blinkTimestampsRef.current.length;
    };

    const intervalId = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      const width = 160;
      const height = Math.max(90, Math.round((video.videoHeight / video.videoWidth) * width));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;
      let luminanceTotal = 0;
      let diffTotal = 0;
      let pixels = 0;

      for (let index = 0; index < data.length; index += 4) {
        const luminance = (data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722) / 255;
        luminanceTotal += luminance;
        pixels += 1;
        if (index >= 4) {
          const previous = (data[index - 4] * 0.2126 + data[index - 3] * 0.7152 + data[index - 2] * 0.0722) / 255;
          diffTotal += Math.abs(luminance - previous);
        }
      }

      const brightness = luminanceTotal / Math.max(1, pixels);
      const clarity = Math.min(1, diffTotal / Math.max(1, pixels) * 9);
      const blur = 1 - clarity;
      let faceBox = null;

      if (faceDetectorRef.current) {
        try {
          const faces = await faceDetectorRef.current.detect(video);
          const box = faces?.[0]?.boundingBox;
          if (box && video.videoWidth && video.videoHeight) {
            faceBox = {
              x: Math.max(0, Math.min(1, box.x / video.videoWidth)),
              y: Math.max(0, Math.min(1, box.y / video.videoHeight)),
              width: Math.max(0, Math.min(1, box.width / video.videoWidth)),
              height: Math.max(0, Math.min(1, box.height / video.videoHeight)),
              source: 'face_detector',
            };
          }
        } catch (detectorError) {
          faceDetectorRef.current = null;
        }
      }

      if (!faceBox) {
        faceBox = estimateFaceBox(data, width, height);
      }

      const facePresent = faceBox ? 1 : 0;
      const faceCenterX = faceBox ? faceBox.x + faceBox.width / 2 : 0.5;
      const faceCenterY = faceBox ? faceBox.y + faceBox.height / 2 : 0.5;
      const centerDistance = Math.min(1, Math.hypot(faceCenterX - 0.5, faceCenterY - 0.46) / 0.45);
      const offscreenNow = faceBox ? Math.max(0, Math.min(1, centerDistance)) : 1;
      const blinkRate = estimateBlinkRate(data, width, height, faceBox);
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings?.() || {};
      const fps = settings.frameRate || null;
      const resolution = settings.width && settings.height
        ? `${settings.width}x${settings.height}`
        : `${video.videoWidth}x${video.videoHeight}`;

      let volume = 0;
      const analyser = analyserRef.current;
      if (analyser) {
        const audioData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(audioData);
        volume = audioData.reduce((sum, value) => sum + value, 0) / Math.max(1, audioData.length) / 255;
      }

      const speakingNow = volume > 0.04 ? 1 : 0;
      const focusRatio = Math.max(0, Math.min(1, (brightness > 0.18 && brightness < 0.92 ? 0.25 : 0.12) + (clarity * 0.25) + (facePresent * 0.25) + ((1 - offscreenNow) * 0.25)));
      const sample = { brightness, blur, clarity, focusRatio, speakingNow, volume, facePresent, offscreenNow, timestamp: Date.now() };
      metricsSamplesRef.current = [...metricsSamplesRef.current, sample].slice(-240);
      const samples = metricsSamplesRef.current;
      const speakingActivity = samples.reduce((sum, item) => sum + item.speakingNow, 0) / Math.max(1, samples.length);
      const offscreenRatio = samples.reduce((sum, item) => sum + item.offscreenNow, 0) / Math.max(1, samples.length);
      const facePresenceRatio = samples.reduce((sum, item) => sum + item.facePresent, 0) / Math.max(1, samples.length);
      const volumes = samples.map((item) => item.volume).filter((value) => value > 0.04);
      const avgVolume = volumes.reduce((sum, value) => sum + value, 0) / Math.max(1, volumes.length);
      const variance = volumes.reduce((sum, value) => sum + Math.abs(value - avgVolume), 0) / Math.max(1, volumes.length);
      const speakingStability = volumes.length ? Math.max(0, 1 - variance * 8) : 0;
      const confidenceHeuristic = Math.max(0, Math.min(1, (focusRatio * 0.45) + (clarity * 0.25) + (speakingStability * 0.2) + (speakingActivity * 0.1)));
      const recommendations = [];
      if (brightness < 0.28) recommendations.push('Освітлення занадто темне.');
      if (brightness > 0.9) recommendations.push('Освітлення занадто яскраве.');
      if (clarity < 0.35) recommendations.push('Камера виглядає розмитою.');
      if (facePresenceRatio < 0.6) recommendations.push('Обличчя часто виходить з кадру.');
      if (offscreenRatio > 0.35) recommendations.push('Погляд часто відводиться від камери або обличчя зміщується від центру кадру.');
      if (speakingActivity < 0.15) recommendations.push('Спостерігаються часті паузи або низька активність мовлення.');
      if (focusRatio < 0.45) recommendations.push('Можлива втрата фокусу кадру. Спробуйте дивитися ближче до камери.');
      if (speakingActivity >= 0.15 && speakingStability > 0.55) recommendations.push('Темп мовлення виглядає стабільним.');
      recommendations.push('Не хвилюйтеся, короткі паузи під час відповіді — це нормально.');

      const nextMetrics = {
        cameraActive,
        microphoneActive,
        brightness,
        blur,
        clarity,
        focusRatio,
        speakingActivity,
        speakingStability,
        confidenceHeuristic,
        offscreenRatio,
        blinkRate,
        fps,
        resolution,
        recommendations: [...new Set(recommendations)].slice(0, 5),
      };
      setMetrics(nextMetrics);
      onMetricsChange?.(nextMetrics);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [stream, cameraActive, microphoneActive, onMetricsChange]);

  useEffect(() => {
    if (!isRecording) return undefined;

    const intervalId = window.setInterval(() => {
      if (startedAtRef.current) {
        setDurationSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  useEffect(() => {
    if (!autoStart || disabled || !stream || isRecording || recordedUrl || !cameraActive || !microphoneActive) return;
    startRecording();
  }, [autoStart, disabled, stream, isRecording, recordedUrl, cameraActive, microphoneActive]);

  const startRecording = () => {
    if (!stream || disabled) return;

    try {
      setError('');
      if (typeof MediaRecorder === 'undefined') {
        setError('Браузер не підтримує MediaRecorder. Спробуй Chrome або Edge.');
        return;
      }
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setDurationSeconds(0);

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm',
      });

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const nextUrl = URL.createObjectURL(blob);
        const nextDuration = startedAtRef.current
          ? Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000))
          : durationSeconds;

        setRecordedUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return nextUrl;
        });
        setDurationSeconds(nextDuration);
        setIsRecording(false);
        const payload = { videoUrl: nextUrl, durationSeconds: nextDuration };
        onRecordingComplete?.(payload);
        stopResolverRef.current?.(payload);
        stopResolverRef.current = null;
      };

      recorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
    } catch (recordingError) {
      setError('Не вдалося стартувати запис відео. Перевір підтримку MediaRecorder у браузері.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  useImperativeHandle(ref, () => ({
    stop: () => new Promise((resolve) => {
      if (recorderRef.current?.state === 'recording') {
        stopResolverRef.current = resolve;
        recorderRef.current.stop();
        return;
      }
      resolve(null);
    }),
    getMetricsSummary: () => {
      const samples = metricsSamplesRef.current;
      const average = (key) => samples.reduce((sum, item) => sum + (item[key] || 0), 0) / Math.max(1, samples.length);
      return {
        average_focus_ratio: average('focusRatio'),
        average_brightness: average('brightness'),
        average_blur_score: average('blur'),
        average_clarity_score: average('clarity'),
        estimated_blink_rate: metrics.blinkRate,
        offscreen_ratio: average('offscreenNow'),
        speaking_activity_ratio: samples.reduce((sum, item) => sum + item.speakingNow, 0) / Math.max(1, samples.length),
        speaking_stability: metrics.speakingStability,
        confidence_heuristic: metrics.confidenceHeuristic,
        fps: metrics.fps,
        resolution_width: Number((metrics.resolution || '').split('x')[0]) || null,
        resolution_height: Number((metrics.resolution || '').split('x')[1]) || null,
        duration_seconds: durationSeconds,
        warnings: metrics.recommendations?.filter((item) => !item.includes('нормально') && !item.includes('стабільним')) || [],
        recommendations: metrics.recommendations || [],
      };
    },
  }));

  return (
    <div className={className}>
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16/9' }}>
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {isRecording && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            REC {durationSeconds}s
          </div>
        )}
        {!stream && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Video className="mx-auto mb-2 h-12 w-12 text-slate-500" />
              <p className="font-medium text-slate-600">Запит доступу до камери та мікрофона...</p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border p-4 ${cameraActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <span className="font-semibold">{cameraActive ? 'Камера активна' : 'Камера неактивна'}</span>
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${microphoneActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            <span className="font-semibold">{microphoneActive ? 'Мікрофон активний' : 'Мікрофон неактивний'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-sm font-medium text-blue-900">
          Камера та мікрофон стартують автоматично для відео-відповіді і MVP-метрик. Сире відео не зберігається в БД; після сесії надсилається тільки summary метрик.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {!hideControls && (!isRecording ? (
            <Button variant="gradient" icon={Play} disabled={disabled || !stream} onClick={startRecording}>
              Почати запис
            </Button>
          ) : (
            <Button variant="danger" icon={Square} onClick={stopRecording}>
              Зупинити запис
            </Button>
          ))}
          {recordedUrl && (
            <Button variant="outline" icon={Video} onClick={() => window.open(recordedUrl, '_blank')}>
              Переглянути запис
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

VideoRecorder.displayName = 'VideoRecorder';
