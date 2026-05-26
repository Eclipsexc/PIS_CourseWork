import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { getApiErrorMessage, mentorAPI } from '../../../shared/api/client';
import { Button, GlassCard, GradientText, LoadingSpinner } from '../../../shared/ui/UI';
import toast from 'react-hot-toast';

export const MentorReviewPage = () => {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalScore, setFinalScore] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        setLoading(true);
        const response = await mentorAPI.getAttempt(attemptId);
        setAttempt(response.data);
        setFinalScore(response.data.ai_score ?? response.data.total_score ?? '');
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не вдалося завантажити спробу'));
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [attemptId]);

  const submitReview = async () => {
    try {
      setSaving(true);
      await mentorAPI.submitReview(attemptId, {
        final_score: Number(finalScore),
        comment: comment.trim() || null,
      });
      toast.success('Оцінку збережено');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося зберегти оцінку'));
    } finally {
      setSaving(false);
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
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <GlassCard className="max-w-xl mx-auto text-center">
          <p className="mb-4 text-slate-600">Спробу не знайдено.</p>
          <Link to="/mentor"><Button variant="gradient">До ментора</Button></Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="max-w-5xl mx-auto">
        <Link to="/mentor">
          <Button variant="ghost" icon={ArrowLeft} className="mb-6">Назад</Button>
        </Link>

        <GlassCard hover={false} className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            <GradientText>{attempt.template?.title || `Attempt #${attempt.id}`}</GradientText>
          </h1>
          <p className="text-slate-600">Учень #{attempt.user_id} • AI score: {attempt.ai_score == null ? '—' : `${Number(attempt.ai_score).toFixed(2)}%`}</p>
        </GlassCard>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <GlassCard hover={false}>
            <h2 className="mb-5 text-2xl font-bold">Відповіді</h2>
            <div className="space-y-4">
              {attempt.questions?.map((question, index) => {
                const answer = attempt.answers?.find((item) => item.question_id === question.id);
                return (
                  <div key={question.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-sm text-indigo-700">Питання {index + 1}</p>
                    <p className="font-semibold">{question.question_text}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                      {answer?.answer_text || answer?.transcript || 'Відповідь не збережена'}
                    </p>
                    {answer?.ai_evaluation && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                        <p className="font-semibold text-amber-800">AI: {Number(answer.ai_evaluation.total_score).toFixed(2)}%</p>
                        <p className="mt-1 text-slate-700">{answer.ai_evaluation.feedback_text || 'AI-коментар відсутній.'}</p>
                      </div>
                    )}
                    {answer?.video_url && (
                      <a className="mt-3 inline-block text-sm text-blue-300 hover:text-blue-200" href={answer.video_url} target="_blank" rel="noreferrer">
                        Відкрити відео
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard hover={false} className="h-fit">
            <h2 className="mb-4 text-xl font-bold">Оцінка ментора</h2>
            <label className="mb-2 block text-sm text-slate-600">Фінальний бал, %</label>
            <input
              type="number"
              min="0"
              max="100"
              className="input-field"
              value={finalScore}
              onChange={(event) => setFinalScore(event.target.value)}
            />
            <label className="mb-2 mt-4 block text-sm text-slate-600">Коментар</label>
            <textarea
              className="input-field min-h-32"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <Button variant="gradient" icon={Save} loading={saving} onClick={submitReview} className="mt-4 w-full">
              Зберегти
            </Button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
