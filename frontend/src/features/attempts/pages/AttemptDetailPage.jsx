import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Pause,
  Play,
  Save,
  Square,
} from 'lucide-react';
import { attemptsAPI, getApiErrorMessage } from '../../../shared/api/client';
import { Badge, Button, GlassCard, GradientText, LoadingSpinner, ProgressBar } from '../../../shared/ui/UI';
import { VideoRecorder } from '../../../shared/components/VideoRecorder';
import { VoiceRecorder } from '../../../shared/components/VoiceRecorder';
import { VideoMetricsPanel } from '../../../shared/components/VideoMetricsPanel';
import toast from 'react-hot-toast';

const statusLabels = {
  active: 'Активна',
  paused: 'На паузі',
  processing: 'Обробка результатів',
  completed: 'Завершена',
  under_review: 'Очікує перевірки',
  reviewed: 'Перевірена',
  auto_submitted: 'Автоматично завершена',
  cancelled: 'Скасована',
  expired: 'Прострочена',
};

const finalStatuses = ['processing', 'completed', 'under_review', 'reviewed', 'auto_submitted', 'cancelled', 'expired'];

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const parseBackendDateMs = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();

  const text = String(value);
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  return Date.parse(hasTimezone ? text : `${text}Z`);
};

const calculateRemainingSeconds = (attempt) => {
  const durationMinutes = attempt?.template?.duration_minutes;
  if (!attempt?.started_at || !durationMinutes) return null;

  const startedAt = parseBackendDateMs(attempt.started_at);
  if (!Number.isFinite(startedAt)) return null;

  const pausedDurationSeconds = Number(attempt.paused_duration || 0);
  const pausedAt = parseBackendDateMs(attempt.paused_at);
  const currentTime = attempt.status === 'paused' && Number.isFinite(pausedAt) ? pausedAt : Date.now();
  const elapsedSeconds = Math.max(0, Math.floor((currentTime - startedAt) / 1000) - pausedDurationSeconds);
  return Math.max(0, durationMinutes * 60 - elapsedSeconds);
};

export const AttemptDetailPage = () => {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [savedQuestionIds, setSavedQuestionIds] = useState(new Set());
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const autoFinishStarted = useRef(false);
  const videoRecorderRef = useRef(null);

  const questions = attempt?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isReadOnly = finalStatuses.includes(attempt?.status);
  const isPaused = attempt?.status === 'paused';
  const isTakingAttempt = !isReadOnly && !isPaused;
  const canPause = attempt?.status === 'active' && attempt?.template?.allow_pause && !attempt?.template?.strict_timer;
  const answerMode = attempt?.template?.answer_mode;
  const isVideoMode = answerMode === 'voice_video';
  const isAssessment = attempt?.template?.session_type === 'assessment';
  const answeredCount = savedQuestionIds.size;
  const progressPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  const loadAttempt = async () => {
    try {
      setLoading(true);
      const response = await attemptsAPI.getById(attemptId);
      const nextAttempt = response.data;
      const drafts = {};
      const savedIds = new Set();

      nextAttempt.answers?.forEach((answer) => {
        drafts[answer.question_id] = answer.answer_text || answer.transcript || '';
        savedIds.add(answer.question_id);
      });

      setAttempt(nextAttempt);
      setAnswerDrafts(drafts);
      setSavedQuestionIds(savedIds);
      setRemainingSeconds(calculateRemainingSeconds(nextAttempt));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося завантажити спробу'));
    } finally {
      setLoading(false);
    }
  };

  const loadResult = async () => {
    try {
      setResultLoading(true);
      const response = await attemptsAPI.getResult(attemptId);
      setResult(response.data);
    } catch (error) {
      setResult(null);
    } finally {
      setResultLoading(false);
    }
  };

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  useEffect(() => {
    if (attempt && finalStatuses.includes(attempt.status)) {
      loadResult();
    }
  }, [attempt]);

  useEffect(() => {
    if (!attempt || isReadOnly || !attempt.template?.duration_minutes) return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(calculateRemainingSeconds(attempt));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [attempt, isReadOnly]);

  const finishAttempt = async ({ auto = false } = {}) => {
    try {
      setActionLoading(true);
      if (!isReadOnly && !isPaused && currentQuestion) {
        await saveCurrentAnswer();
      }
      if (isVideoMode) {
        const metricsSummary = videoRecorderRef.current?.getMetricsSummary?.();
        if (metricsSummary) {
          await attemptsAPI.saveVideoMetrics(attemptId, metricsSummary);
        }
      }
      const response = await attemptsAPI.finish(attemptId);
      setAttempt((current) => ({
        ...current,
        ...response.data,
        status: auto && response.data.status === 'completed' ? 'auto_submitted' : response.data.status,
      }));
      setShowFinishConfirm(false);
      toast.success(auto ? 'Час вийшов. Сесію передано на обробку.' : 'Сесію передано на обробку.');
      await loadAttempt();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося завершити сесію'));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (!attempt || isReadOnly || remainingSeconds !== 0 || autoFinishStarted.current) return;

    autoFinishStarted.current = true;
    finishAttempt({ auto: true });
  }, [attempt, isReadOnly, remainingSeconds]);

  const currentAnswer = useMemo(() => {
    if (!currentQuestion) return '';
    return answerDrafts[currentQuestion.id] || '';
  }, [answerDrafts, currentQuestion]);

  const updateCurrentAnswer = (value) => {
    if (!currentQuestion) return;
    setSaveMessage('');
    setAnswerDrafts((current) => ({
      ...current,
      [currentQuestion.id]: value,
    }));
  };

  const handleTranscriptChange = (value) => {
    updateCurrentAnswer(value);
  };

  const handleRecordingComplete = ({ videoUrl, durationSeconds }) => {
    if (!currentQuestion) return;
    setAnswerDrafts((current) => {
      const existing = current[currentQuestion.id];
      return {
        ...current,
        [currentQuestion.id]: typeof existing === 'string'
          ? { text: existing, videoUrl, durationSeconds }
          : { ...(existing || {}), videoUrl, durationSeconds },
      };
    });
    setSaveMessage('Відео записано. Додай текстову транскрипцію або короткий опис і збережи відповідь.');
  };

  const handleVideoAnalysis = (metrics) => {
    setVideoAnalysis(metrics);
    console.log('Video analysis metrics:', metrics);
  };

  const saveCurrentAnswer = async () => {
    if (!currentQuestion || isReadOnly || isPaused) return false;

    const currentDraft = answerDrafts[currentQuestion.id];
    const draftText = typeof currentDraft === 'string' ? currentDraft : currentDraft?.text;
    let answerText = (draftText || '').trim();
    let videoUrl = typeof currentDraft === 'object' ? currentDraft?.videoUrl : null;
    let durationSeconds = typeof currentDraft === 'object' ? currentDraft?.durationSeconds : null;

    if (isVideoMode && !videoUrl) {
      const recordingPayload = await videoRecorderRef.current?.stop?.();
      if (recordingPayload?.videoUrl) {
        videoUrl = isAssessment ? null : recordingPayload.videoUrl;
        durationSeconds = recordingPayload.durationSeconds;
      }
    }

    if (isVideoMode && !answerText && durationSeconds) {
      answerText = 'Відео-відповідь записано, автоматична транскрипція недоступна.';
    }

    if (!answerText && !videoUrl && !isAssessment) {
      setSaveMessage('Відповідь порожня. Її можна пропустити, але вона не буде збережена.');
      return false;
    }

    try {
      setSavingQuestionId(currentQuestion.id);
      const response = await attemptsAPI.submitAnswer(attemptId, {
        question_id: currentQuestion.id,
        answer_text: answerText,
        video_url: isAssessment ? null : videoUrl,
        duration_seconds: durationSeconds,
      });
      setSavedQuestionIds((current) => new Set([...current, currentQuestion.id]));
      setSaveMessage('Відповідь збережено. AI-оцінювання запуститься після завершення всієї сесії.');
      return true;
    } catch (error) {
      setSaveMessage(getApiErrorMessage(error, 'Не вдалося зберегти відповідь'));
      return false;
    } finally {
      setSavingQuestionId(null);
    }
  };

  const goToQuestion = async (index) => {
    if (index < 0 || index >= questions.length) return;
    if (!isReadOnly && !isPaused && currentQuestion) {
      await saveCurrentAnswer();
    }
    setCurrentQuestionIndex(index);
    setSaveMessage('');
  };

  const pauseAttempt = async () => {
    try {
      setActionLoading(true);
      const response = await attemptsAPI.pause(attemptId);
      const nextAttempt = { ...attempt, ...response.data };
      setAttempt(nextAttempt);
      setRemainingSeconds(calculateRemainingSeconds(nextAttempt));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося поставити сесію на паузу'));
    } finally {
      setActionLoading(false);
    }
  };

  const resumeAttempt = async () => {
    try {
      setActionLoading(true);
      const response = await attemptsAPI.resume(attemptId);
      const nextAttempt = { ...attempt, ...response.data };
      setAttempt(nextAttempt);
      setRemainingSeconds(calculateRemainingSeconds(nextAttempt));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося продовжити сесію'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen px-4 py-8">
        <GlassCard className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Спробу не знайдено</h1>
          <Link to="/attempts"><Button variant="gradient">До спроб</Button></Link>
        </GlassCard>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen px-4 py-8">
        <GlassCard className="max-w-2xl mx-auto text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
          <h1 className="text-2xl font-bold mb-2">У шаблоні немає питань</h1>
          <p className="text-slate-600 mb-6">Сесію неможливо пройти, бо повʼязаний шаблон порожній або пошкоджений.</p>
          <Link to="/templates"><Button variant="gradient">До шаблонів</Button></Link>
        </GlassCard>
      </div>
    );
  }

  const timerVariant = remainingSeconds !== null && remainingSeconds <= 60
    ? 'text-red-700 border-red-200 bg-red-50'
    : remainingSeconds !== null && remainingSeconds <= 300
      ? 'text-amber-700 border-amber-200 bg-amber-50'
      : 'text-slate-800 border-slate-200 bg-slate-50';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="sticky top-20 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Interactive session</p>
              <h1 className="text-3xl font-bold">
                <GradientText>{attempt.template?.title || `Attempt #${attempt.id}`}</GradientText>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={attempt.status === 'active' ? 'success' : attempt.status === 'paused' ? 'warning' : 'info'}>
                {statusLabels[attempt.status] || attempt.status}
              </Badge>
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold ${timerVariant}`}>
                <Clock className="w-4 h-4" />
                {remainingSeconds === null ? 'Без таймера' : formatTime(remainingSeconds)}
              </div>
              {attempt.status === 'paused' ? (
                <Button variant="success" size="sm" icon={Play} onClick={resumeAttempt} loading={actionLoading}>
                  Продовжити
                </Button>
              ) : (
                <Button variant="ghost" size="sm" icon={Pause} onClick={pauseAttempt} disabled={!canPause || actionLoading || isReadOnly}>
                  Пауза
                </Button>
              )}
              <Button variant="danger" size="sm" icon={Square} onClick={() => setShowFinishConfirm(true)} disabled={isReadOnly || actionLoading}>
                Завершити сесію
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
              <span>Відповіли на {answeredCount} з {questions.length} питань</span>
              <span>{progressPercent}% complete</span>
            </div>
            <ProgressBar value={progressPercent} />
          </div>
        </div>

        {isPaused && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <h2 className="font-bold">Сесію поставлено на паузу</h2>
            <p className="mt-1 text-sm text-amber-800">Відповіді заблоковані, доки ти не натиснеш “Продовжити”.</p>
          </div>
        )}

        {isReadOnly && isAssessment && (
          <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
            Оціночну сесію завершено. AI-вердикт і коментар викладача зʼявляться у розділі “Ментор”.
          </div>
        )}

        {isReadOnly && isAssessment && (
          <div className="mt-10 space-y-6">
            <GlassCard hover={false}>
              <h2 className="mb-4 text-2xl font-bold">Подані відповіді</h2>
              <p className="mb-5 text-sm text-slate-600">
                Тут показані твої відповіді з оціночної сесії. Камера, live metrics і recorder у режимі перегляду не запускаються.
              </p>
              {resultLoading ? (
                <div className="flex items-center justify-center py-6">
                  <LoadingSpinner size="md" />
                </div>
              ) : result?.questions?.length ? (
                <div className="space-y-4">
                  {result.questions.map((item, index) => (
                    <div key={item.question_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">Питання {index + 1}</p>
                          <p className="mt-1 font-semibold">{item.question_text}</p>
                        </div>
                        <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
                          AI: {Number(item.score || 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Твоя відповідь</p>
                        <p className="whitespace-pre-wrap text-slate-900">{item.answer_text || 'Відповідь не зафіксована як текст.'}</p>
                      </div>
                      {item.feedback_text && (
                        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                          {item.feedback_text}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => {
                    const answer = attempt.answers?.find((item) => item.question_id === question.id);
                    return (
                      <div key={question.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-emerald-700">Питання {index + 1}</p>
                        <p className="mt-1 font-semibold">{question.question_text}</p>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Твоя відповідь</p>
                          <p className="whitespace-pre-wrap text-slate-900">{answer?.answer_text || answer?.transcript || 'Відповідь не зафіксована як текст.'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {isReadOnly && !isAssessment && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">
            {attempt.status === 'processing'
              ? 'Сесію завершено. Обробка результатів триває, можна вийти зі сторінки й повернутися пізніше.'
              : 'Ця сесія вже завершена. Відповіді доступні тільки для перегляду.'}
          </div>
        )}

        {!isReadOnly && (
        <div className={`grid gap-6 ${isAssessment ? '' : 'lg:grid-cols-[280px_1fr]'}`}>
          {!isAssessment && (
          <GlassCard hover={false} className="h-fit">
            <h2 className="mb-4 text-lg font-bold">Навігація питань</h2>
            <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
              {questions.map((question, index) => {
                const answered = savedQuestionIds.has(question.id);
                const current = index === currentQuestionIndex;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => goToQuestion(index)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                      current
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : answered
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-green-500/70" />Збережено</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-purple-500/70" />Поточне питання</div>
            </div>
          </GlassCard>
          )}

          <div className={isVideoMode ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]' : 'space-y-6'}>
            <div className="space-y-6">
            <GlassCard hover={false}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  icon={ArrowLeft}
                  disabled={currentQuestionIndex === 0}
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                >
                  Prev
                </Button>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-500">Question {currentQuestionIndex + 1} / {questions.length}</p>
                  {savedQuestionIds.has(currentQuestion?.id) && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-sm text-green-300">
                      <Check className="w-4 h-4" />
                      Відповідь збережено
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  icon={ArrowRight}
                  disabled={currentQuestionIndex === questions.length - 1}
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                >
                  Next
                </Button>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="mb-2 text-sm font-semibold text-emerald-700">Питання</p>
                <h2 className="whitespace-pre-wrap text-2xl font-bold leading-relaxed">
                  {currentQuestion.question_text}
                </h2>
              </div>
            </GlassCard>

            <GlassCard hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Відповідь</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{attempt.template?.answer_mode}</span>
              </div>

              {isVideoMode && (
                <>
                  <VideoRecorder
                    key={currentQuestion?.id}
                    ref={videoRecorderRef}
                    onRecordingComplete={handleRecordingComplete}
                    onVideoAnalysis={handleVideoAnalysis}
                    onMetricsChange={setLiveMetrics}
                    autoStart
                    hideControls
                    disabled={!isTakingAttempt}
                    className="mb-6"
                  />
                  <VoiceRecorder
                    key={`voice-${currentQuestion?.id}`}
                    onTranscriptChange={(value) => updateCurrentAnswer({
                      ...(typeof currentAnswer === 'object' ? currentAnswer : {}),
                      text: value,
                    })}
                    autoStart
                    hideControls
                    silent
                    disabled={!isTakingAttempt}
                  />
                </>
              )}

              {!isVideoMode && (
                <>
                  <textarea
                    value={typeof currentAnswer === 'string' ? currentAnswer : currentAnswer?.text || ''}
                    onChange={(event) => updateCurrentAnswer(event.target.value)}
                    disabled={isReadOnly || isPaused}
                    className="input-field min-h-56 resize-y text-base leading-relaxed"
                    placeholder="Введи відповідь на поточне питання..."
                  />
                  <VoiceRecorder
                    onTranscriptChange={handleTranscriptChange}
                    disabled={isReadOnly || isPaused}
                    className="mt-4"
                  />
                </>
              )}

              {saveMessage && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                  {saveMessage}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
                {!isVideoMode && (
                <Button
                  variant="outline"
                  icon={Save}
                  onClick={saveCurrentAnswer}
                  loading={savingQuestionId === currentQuestion?.id}
                  disabled={isReadOnly || isPaused}
                >
                  Зберегти відповідь
                </Button>
                )}
                <Button
                  variant="gradient"
                  icon={ArrowRight}
                  onClick={() => goToQuestion(Math.min(currentQuestionIndex + 1, questions.length - 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  {isVideoMode ? 'Зберегти й далі' : 'Save & Next'}
                </Button>
              </div>
            </GlassCard>
            </div>
            {isVideoMode && (
              <VideoMetricsPanel metrics={liveMetrics} className="h-fit xl:sticky xl:top-28" />
            )}
          </div>
        </div>
        )}

        {isReadOnly && !isAssessment && (
          <div className="mt-10 space-y-6">
            <GlassCard hover={false}>
              <h2 className="text-2xl font-bold mb-4">Результат спроби</h2>
              {resultLoading ? (
                <div className="flex items-center justify-center py-6">
                  <LoadingSpinner size="md" />
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Загальний бал</p>
                      <p className="text-2xl font-bold">{Number(result.total_score).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Відповіді</p>
                      <p className="text-2xl font-bold">{result.total_answers} / {result.total_answers + result.missed_questions}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Пропущені питання</p>
                      <p className="text-2xl font-bold">{result.missed_questions}</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Середній semantic score</p>
                      <p className="text-xl font-semibold">{Number(result.average_semantic_score).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Середній keyword score</p>
                      <p className="text-xl font-semibold">{Number(result.average_keyword_score).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Слабкі місця</p>
                      {result.weak_points?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {result.weak_points.map((item) => (
                            <span key={item} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600">Немає критичних слабких місць.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Рекомендації</p>
                      {result.recommendations?.length ? (
                        <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                          {result.recommendations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-600">Немає окремих рекомендацій.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600">Обробка результатів...</p>
              )}
            </GlassCard>

            <GlassCard hover={false}>
              <h2 className="text-2xl font-bold mb-4">Деталі по питаннях</h2>
              {!result?.questions?.length ? (
                <p className="text-slate-600">Немає збережених відповідей.</p>
              ) : (
                <div className="space-y-4">
                  {result.questions.map((item, index) => (
                    <div key={item.question_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-emerald-700 mb-1">Питання {index + 1}</p>
                          <p className="font-semibold">{item.question_text}</p>
                        </div>
                        <span className="text-sm font-semibold text-green-300">
                          {Number(item.score).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 mb-1">Відповідь користувача</p>
                          <p className="whitespace-pre-wrap text-slate-800">
                            {item.answer_text || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-1">Еталонна відповідь</p>
                          <p className="whitespace-pre-wrap text-slate-800">
                            {item.reference_answer || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 mb-1">Feedback</p>
                          <p className="text-slate-800">{item.feedback_text || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-1">Відсутні поняття</p>
                          {item.missing_concepts?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {item.missing_concepts.map((concept) => (
                                <span key={concept} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                  {concept}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-600">—</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {showFinishConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <GlassCard className="max-w-lg w-full" hover={false}>
              <h2 className="text-2xl font-bold mb-3">Завершити сесію?</h2>
              <p className="text-slate-600 mb-6">
                Збережено відповідей: {answeredCount} з {questions.length}. Незбережені або порожні відповіді не потраплять у результат.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button variant="ghost" onClick={() => setShowFinishConfirm(false)}>
                  Скасувати
                </Button>
                <Button variant="danger" icon={Square} onClick={() => finishAttempt()} loading={actionLoading}>
                  Завершити
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
