import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Lightbulb,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { attemptsAPI, getApiErrorMessage } from '../../../shared/api/client';
import { Badge, Button, GlassCard, GradientText, LoadingSpinner, ProgressBar } from '../../../shared/ui/UI';
import toast from 'react-hot-toast';

const getScoreColor = (score) => {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-700';
};

const getScoreBgColor = (score) => {
  if (score >= 80) return 'border-emerald-200 bg-emerald-50';
  if (score >= 50) return 'border-amber-200 bg-amber-50';
  return 'border-red-200 bg-red-50';
};

const getScoreLabel = (score) => {
  if (score >= 90) return 'Відмінно';
  if (score >= 80) return 'Добре';
  if (score >= 70) return 'Задовільно';
  if (score >= 50) return 'Потребує покращення';
  return 'Незадовільно';
};

export const AttemptResultPage = () => {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [resultResponse, attemptResponse] = await Promise.all([
          attemptsAPI.getResult(attemptId),
          attemptsAPI.getById(attemptId),
        ]);
        setAttempt(attemptResponse.data);
        if (attemptResponse.data.status === 'processing') {
          setResult(null);
        } else {
          setResult(resultResponse.data);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не вдалося завантажити результати'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [attemptId]);

  const toggleQuestion = (questionId) => {
    setExpandedQuestions((current) => ({
      ...current,
      [questionId]: !current[questionId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (attempt?.status === 'processing') {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <GlassCard className="max-w-2xl mx-auto text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-amber-600" />
          <h1 className="text-2xl font-bold mb-4">Обробка результатів...</h1>
          <p className="text-slate-600 mb-6">Локальне оцінювання ще триває. Можна повернутися до “Мої спроби” і оновити сторінку пізніше.</p>
          <Link to="/attempts">
            <Button variant="gradient">До спроб</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  if (!result || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <GlassCard className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-700" />
          <h1 className="text-2xl font-bold mb-4">Результати не знайдено</h1>
          <p className="text-slate-600 mb-6">Можливо, спроба ще не завершена або результати недоступні.</p>
          <Link to="/attempts">
            <Button variant="gradient">До спроб</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const totalScore = result.total_score || 0;
  const answeredCount = result.total_answers || 0;
  const missedCount = result.missed_questions || 0;
  const totalQuestions = answeredCount + missedCount;
  const completionRate = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8">
          <Link to="/attempts" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-950 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Назад до спроб
          </Link>
          <h1 className="text-4xl font-bold mb-2">
            <GradientText>Результати сесії</GradientText>
          </h1>
          <p className="text-slate-600">{attempt.template?.title || `Спроба #${attempt.id}`}</p>
        </div>

        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          
          <GlassCard className={`border-2 ${getScoreBgColor(totalScore)}`}>
            <div className="flex items-center justify-between mb-2">
              <Award className={`w-6 h-6 ${getScoreColor(totalScore)}`} />
              <Badge variant={totalScore >= 80 ? 'success' : totalScore >= 50 ? 'warning' : 'danger'}>
                {getScoreLabel(totalScore)}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mb-1">Загальний бал</p>
            <p className={`text-4xl font-bold ${getScoreColor(totalScore)}`}>
              {totalScore.toFixed(1)}
            </p>
            <p className="text-xs text-slate-500 mt-1">зі 100</p>
          </GlassCard>

          
          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-emerald-700" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Відповіли</p>
            <p className="text-4xl font-bold text-emerald-700">{answeredCount}</p>
            <p className="text-xs text-slate-500 mt-1">з {totalQuestions} питань</p>
          </GlassCard>

          
          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-6 h-6 text-red-700" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Пропущено</p>
            <p className="text-4xl font-bold text-red-700">{missedCount}</p>
            <p className="text-xs text-slate-500 mt-1">питань</p>
          </GlassCard>

          
          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <Target className="w-6 h-6 text-purple-700" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Завершеність</p>
            <p className="text-4xl font-bold text-purple-700">{completionRate}%</p>
            <div className="mt-2">
              <ProgressBar value={completionRate} />
            </div>
          </GlassCard>
        </div>

        
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          
          <GlassCard>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-700" />
              Детальна оцінка
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Семантична схожість</span>
                  <span className={`font-bold ${getScoreColor(result.average_semantic_score || 0)}`}>
                    {(result.average_semantic_score || 0).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={result.average_semantic_score || 0} />
                <p className="text-xs text-slate-500 mt-1">
                  Наскільки твої відповіді збігаються за змістом з еталонними
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Покриття ключових слів</span>
                  <span className={`font-bold ${getScoreColor(result.average_keyword_score || 0)}`}>
                    {(result.average_keyword_score || 0).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={result.average_keyword_score || 0} />
                <p className="text-xs text-slate-500 mt-1">
                  Скільки важливих понять ти згадав у відповідях
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Повнота</span>
                  <span className={`font-bold ${getScoreColor(result.average_completeness_score || 0)}`}>
                    {(result.average_completeness_score || 0).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={result.average_completeness_score || 0} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Структура</span>
                  <span className={`font-bold ${getScoreColor(result.average_structure_score || 0)}`}>
                    {(result.average_structure_score || 0).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={result.average_structure_score || 0} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Покриття еталону</span>
                  <span className={`font-bold ${getScoreColor(result.average_reference_coverage_score || 0)}`}>
                    {(result.average_reference_coverage_score || 0).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={result.average_reference_coverage_score || 0} />
                <p className="text-xs text-slate-500 mt-1">Перетин змістових понять між еталоном і відповіддю</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Довжина відповіді</span>
                  <span className={`font-bold ${getScoreColor(result.average_answer_length_score || 0)}`}>
                    {(result.average_answer_length_score || 0).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={result.average_answer_length_score || 0} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Покриття понять</span>
                  <span className={`font-bold ${getScoreColor(result.average_concept_coverage_score || 0)}`}>
                    {(result.average_concept_coverage_score || 0).toFixed(1)}
                  </span>
                </div>
                <ProgressBar value={result.average_concept_coverage_score || 0} />
              </div>
            </div>
          </GlassCard>

          
          <GlassCard>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-700" />
              Метод оцінювання
            </h2>
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Award className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900 mb-1">Локальне оцінювання</p>
                  <p className="text-sm text-purple-700/80">
                    Відповіді оцінені за допомогою локальної embedding-моделі
                    <span className="font-mono text-xs block mt-1 text-purple-700">
                      sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
                    </span>
                  </p>
                  <p className="text-xs text-purple-700/60 mt-2">
                    Оцінка базується на семантичній схожості, покритті ключових слів,
                    повноті та структурі відповіді.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {result.video_metrics && (
          <GlassCard className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-700" />
              Voice/video metrics summary
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Це орієнтовні технічні та поведінкові heuristics. Сире відео не зберігається.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Середнє освітлення</p>
                <p className="text-2xl font-bold">{Math.round((result.video_metrics.brightness_score || 0) * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Чіткість кадру</p>
                <p className="text-2xl font-bold">{Math.round((result.video_metrics.quality_score || 0) * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Фокусування</p>
                <p className="text-2xl font-bold">{Math.round((result.video_metrics.face_presence_ratio || 0) * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Активність мовлення</p>
                <p className="text-2xl font-bold">{Math.round((result.video_metrics.speaking_activity_ratio || 0) * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Стабільність мовлення</p>
                <p className="text-2xl font-bold">{Math.round((result.video_metrics.speaking_stability || 0) * 100)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Confidence heuristic</p>
                <p className="text-2xl font-bold">{Math.round((result.video_metrics.confidence_heuristic || 0) * 100)}%</p>
              </div>
            </div>
            {result.video_metrics.recommendations?.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {result.video_metrics.recommendations.map((item) => (
                  <div key={item} className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        
        {result.weak_points && result.weak_points.length > 0 && (
          <GlassCard className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              Слабкі місця
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {result.weak_points.map((point, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3"
                >
                  <div className="rounded-full bg-amber-50 p-1 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-sm text-amber-900">{point}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        
        {result.recommendations && result.recommendations.length > 0 && (
          <GlassCard className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-700" />
              Рекомендації
            </h2>
            <div className="space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3"
                >
                  <div className="rounded-full bg-blue-100 p-1 mt-0.5">
                    <Lightbulb className="w-4 h-4 text-blue-700" />
                  </div>
                  <p className="text-sm text-blue-900">{recommendation}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {result.overall_recommendation && (
          <GlassCard className="mb-8">
            <h2 className="text-xl font-bold mb-3">Загальна рекомендація</h2>
            <p className="text-slate-800">{result.overall_recommendation}</p>
          </GlassCard>
        )}

        
        <GlassCard>
          <h2 className="text-2xl font-bold mb-6">Детальний розбір питань</h2>
          <div className="space-y-4">
            {result.questions && result.questions.map((question, index) => {
              const isExpanded = expandedQuestions[question.question_id];
              const score = question.score || 0;
              const hasAnswer = question.answer_text && question.answer_text.trim();

              return (
                <div
                  key={question.question_id}
                  className={`rounded-2xl border transition-all ${
                    hasAnswer
                      ? `${getScoreBgColor(score)}`
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  
                  <button
                    onClick={() => toggleQuestion(question.question_id)}
                    className="w-full p-5 flex items-start justify-between gap-4 text-left hover:bg-slate-100 transition-colors rounded-2xl"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-slate-600">
                          Питання {index + 1}
                        </span>
                        {hasAnswer ? (
                          <Badge variant={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'danger'}>
                            {score.toFixed(1)} балів
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Пропущено</Badge>
                        )}
                      </div>
                      <p className="font-semibold text-slate-950 mb-1">
                        {question.question_text}
                      </p>
                      {hasAnswer && question.feedback_text && !isExpanded && (
                        <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                          {question.feedback_text}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600 flex-shrink-0" />
                    )}
                  </button>

                  
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-200 pt-4">
                      
                      {hasAnswer ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-600 mb-2">Твоя відповідь:</p>
                          <div className="rounded-xl bg-white p-4 border border-slate-200">
                            <p className="text-slate-900 whitespace-pre-wrap">{question.answer_text}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                          <p className="text-slate-600 text-center">Відповідь не надана</p>
                        </div>
                      )}

                      
                      {question.reference_answer && (
                        <div>
                          <p className="text-sm font-semibold text-slate-600 mb-2">Еталонна відповідь:</p>
                          <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200">
                            <p className="text-emerald-900 whitespace-pre-wrap">{question.reference_answer}</p>
                          </div>
                        </div>
                      )}

                      
                      {hasAnswer && (
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs text-slate-600">Semantic</p>
                            <p className="font-bold">{(question.semantic_score || 0).toFixed(1)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs text-slate-600">Keyword</p>
                            <p className="font-bold">{(question.keyword_score || 0).toFixed(1)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs text-slate-600">Completeness</p>
                            <p className="font-bold">{(question.completeness_score || 0).toFixed(1)}</p>
                          </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs text-slate-600">Structure</p>
                          <p className="font-bold">{(question.structure_score || 0).toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs text-slate-600">Reference coverage</p>
                          <p className="font-bold">{(question.reference_coverage_score || 0).toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs text-slate-600">Length</p>
                          <p className="font-bold">{(question.answer_length_score || 0).toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs text-slate-600">Concept coverage</p>
                          <p className="font-bold">{(question.concept_coverage_score || 0).toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs text-slate-600">Weighted total</p>
                          <p className="font-bold">{(question.weighted_total_score || 0).toFixed(1)}</p>
                        </div>
                      </div>
                      )}

                      
                      {hasAnswer && question.feedback_text && (
                        <div>
                          <p className="text-sm font-semibold text-slate-600 mb-2">Зворотний зв'язок:</p>
                          <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
                            <p className="text-blue-900">{question.feedback_text}</p>
                          </div>
                        </div>
                      )}

                      
                      {hasAnswer && question.missing_concepts && question.missing_concepts.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-slate-600 mb-2">Відсутні поняття:</p>
                          <div className="flex flex-wrap gap-2">
                            {question.missing_concepts.map((concept, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>

        
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/attempts">
            <Button variant="ghost" icon={ArrowLeft}>
              До списку спроб
            </Button>
          </Link>
          <Link to={`/attempts/${attemptId}`}>
            <Button variant="gradient">
              Переглянути деталі спроби
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
