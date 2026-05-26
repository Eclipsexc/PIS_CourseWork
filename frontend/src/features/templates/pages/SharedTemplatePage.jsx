import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Camera, Clock, FileText, Mic, Play, Share2 } from 'lucide-react';
import { getApiErrorMessage, templatesAPI } from '../../../shared/api/client';
import { Badge, Button, GlassCard, GradientText, LoadingSpinner } from '../../../shared/ui/UI';
import { useAuthStore } from '../../auth/store/authStore';
import toast from 'react-hot-toast';

export const SharedTemplatePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [templateData, setTemplateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);
  const [preflightStatus, setPreflightStatus] = useState('idle');
  const [preflightMessage, setPreflightMessage] = useState('');
  const isOwnTemplate = Boolean(user?.id && templateData?.owner_id === user.id);

  const loadSharedTemplate = async () => {
    try {
      setLoading(true);
      setError('');
      setErrorStatus(null);
      const response = await templatesAPI.getShare(token);
      setTemplateData(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не вдалося відкрити shared шаблон'));
      setErrorStatus(err.response?.status || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadSharedTemplate();
    }
  }, [token]);

  const startAttempt = async () => {
    if (!templateData?.id) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (templateData.session_type === 'assessment' && preflightStatus !== 'ready') {
      toast.error('Перед стартом оціночної сесії потрібно перевірити камеру та мікрофон.');
      return;
    }

    try {
      const response = await templatesAPI.startShareAttempt(token);
      navigate(`/attempts/${response.data.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Не вдалося стартувати спробу'));
    }
  };

  const runMediaPreflight = async () => {
    try {
      setPreflightStatus('checking');
      setPreflightMessage('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const hasCamera = mediaStream.getVideoTracks().some((track) => track.readyState === 'live');
      const hasMic = mediaStream.getAudioTracks().some((track) => track.readyState === 'live');
      mediaStream.getTracks().forEach((track) => track.stop());

      if (!hasCamera || !hasMic) {
        setPreflightStatus('failed');
        setPreflightMessage('Камера або мікрофон недоступні.');
        return;
      }

      setPreflightStatus('ready');
      setPreflightMessage('Камера і мікрофон доступні. Можна починати.');
    } catch (mediaError) {
      setPreflightStatus('failed');
      setPreflightMessage('Не вдалося отримати доступ до камери або мікрофона. Дозволь доступ у браузері.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!templateData || error) {
    return (
      <div className="min-h-screen px-4 py-8">
        <GlassCard className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-2">Шаблон недоступний</h1>
          <p className="text-gray-400 mb-6">{error || 'Share link неактивний або закінчився термін дії.'}</p>
          {errorStatus === 401 && (
            <Link to="/login">
              <Button variant="gradient">Увійти, щоб продовжити</Button>
            </Link>
          )}
          <Link to="/templates">
            <Button variant="gradient">До шаблонів</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <p className="text-sm text-gray-400 flex items-center gap-2 mb-2">
              <Share2 className="w-4 h-4" /> Shared template
            </p>
            <h1 className="text-4xl font-bold mb-2">
              <GradientText>{templateData.title}</GradientText>
            </h1>
            <p className="text-gray-400">{templateData.description || 'Опис не додано.'}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {!isAuthenticated && (
              <Link to="/login">
                <Button variant="outline">Увійти, щоб почати</Button>
              </Link>
            )}
            {!isOwnTemplate && (
              <Button
                variant="gradient"
                icon={Play}
                onClick={startAttempt}
                disabled={!isAuthenticated || templateData.status !== 'ready' || (templateData.session_type === 'assessment' && preflightStatus !== 'ready')}
              >
                Почати сесію
              </Button>
            )}
          </div>
        </div>

        {isOwnTemplate && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
            Автор шаблону не може проходити власну сесію з цього екрана.
          </div>
        )}

        {templateData.share && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
            <p>Доступ: {templateData.share.access_type === 'private' ? 'Приватний (потрібен логін)' : 'Публічний'}</p>
            {templateData.share.expires_at && (
              <p className="text-gray-400">
                Дійсний до: {new Date(templateData.share.expires_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {templateData.status !== 'ready' && (
          <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Шаблон ще не готовий до проходження.
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <GlassCard><Badge variant="info">{templateData.session_type}</Badge><p className="text-gray-400 mt-3">Тип сесії</p></GlassCard>
          <GlassCard><div className="text-2xl font-bold">{templateData.answer_mode}</div><p className="text-gray-400 mt-3">Режим відповіді</p></GlassCard>
          <GlassCard><div className="text-2xl font-bold">{templateData.duration_minutes || '—'}</div><p className="text-gray-400 mt-3">Хвилин на проходження</p></GlassCard>
        </div>

        {templateData.session_type === 'assessment' ? (
          <GlassCard>
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-6 h-6 text-purple-300" />
              <h2 className="text-2xl font-bold">Питання приховано</h2>
            </div>
            <p className="text-gray-400">
              Це оціночна сесія. Питання відкриються тільки після старту спроби.
            </p>
          </GlassCard>
        ) : (
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-purple-300" />
            <h2 className="text-2xl font-bold">Питання</h2>
          </div>
          {templateData.questions?.length ? (
            <div className="space-y-4">
              {templateData.questions.map((question, index) => (
                <div key={question.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm text-purple-100">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{question.question_text}</p>
                      {question.topic && (
                        <p className="text-xs text-gray-500 mt-2">Тема: {question.topic}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              Питання ще не додані.
            </div>
          )}
        </GlassCard>
        )}

        {templateData.session_type === 'assessment' && (
          <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-bold text-blue-100">Перевірка камери та мікрофона</h2>
                <p className="mt-1 text-sm text-blue-200/80">
                  До оціночної сесії можна приєднатись тільки після успішної перевірки.
                </p>
                {preflightMessage && <p className="mt-2 text-sm text-blue-100">{preflightMessage}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${preflightStatus === 'ready' ? 'border-green-500/40 bg-green-500/10 text-green-100' : 'border-white/10 bg-white/5 text-gray-300'}`}>
                  <Camera className="h-4 w-4" /> Камера
                </span>
                <span className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${preflightStatus === 'ready' ? 'border-green-500/40 bg-green-500/10 text-green-100' : 'border-white/10 bg-white/5 text-gray-300'}`}>
                  <Mic className="h-4 w-4" /> Мікрофон
                </span>
                <Button variant="outline" onClick={runMediaPreflight} loading={preflightStatus === 'checking'}>
                  Перевірити
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
