import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { analyticsAPI, getApiErrorMessage } from '../../../shared/api/client';
import { useAuthStore } from '../../auth/store/authStore';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { Separator } from '../../../components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getScoreColor = (score) => {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-600';
};

const getScoreTone = (score) => {
  if (score >= 80) return 'border-emerald-200 bg-emerald-50';
  if (score >= 50) return 'border-amber-200 bg-amber-50';
  return 'border-red-200 bg-red-50';
};

const statusLabels = {
  active: 'Активна',
  paused: 'На паузі',
  processing: 'Обробка',
  completed: 'Завершена',
  under_review: 'На перевірці',
  reviewed: 'Перевірена',
  auto_submitted: 'Автозавершена',
  cancelled: 'Скасована',
  expired: 'Прострочена',
};

const trendRanges = [
  { value: 'week', label: 'Тиждень', days: 7 },
  { value: 'month', label: 'Місяць', days: 30 },
  { value: 'year', label: 'Рік', days: 365 },
  { value: 'all', label: 'Усе', days: null },
];

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const isMentor = user?.role === 'mentor';
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [mentorAnalytics, setMentorAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState('month');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const userResponse = await analyticsAPI.getUser();
        setUserAnalytics(userResponse.data);

        if (isMentor) {
          const mentorResponse = await analyticsAPI.getMentor();
          setMentorAnalytics(mentorResponse.data);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не вдалося завантажити аналітику'));
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [isMentor]);

  const selectedTrendRange = trendRanges.find((item) => item.value === trendRange) || trendRanges[1];
  const filteredTrend = useMemo(() => {
    const points = userAnalytics?.score_trend || [];
    if (!selectedTrendRange.days) return points;
    const minTime = Date.now() - selectedTrendRange.days * 24 * 60 * 60 * 1000;
    return points.filter((item) => new Date(item.date).getTime() >= minTime);
  }, [selectedTrendRange.days, userAnalytics?.score_trend]);

  const chartPoints = useMemo(() => {
    if (!filteredTrend.length) return '';
    if (filteredTrend.length === 1) {
      const y = 88 - Math.max(0, Math.min(100, filteredTrend[0].score)) * 0.8;
      return `8,${y} 94,${y}`;
    }
    return filteredTrend.map((item, index) => {
      const x = 8 + (index / Math.max(1, filteredTrend.length - 1)) * 86;
      const y = 88 - Math.max(0, Math.min(100, item.score)) * 0.8;
      return `${x},${y}`;
    }).join(' ');
  }, [filteredTrend]);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Дашборд
        </h1>
        <p className="text-muted-foreground">
          Привіт, {user?.full_name || 'Користувач'}! Ось твоя статистика.
        </p>
      </div>

      {userAnalytics && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Моя статистика
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="stat-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Всього спроб</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{userAnalytics.total_attempts}</div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Завершено</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{userAnalytics.completed_attempts}</div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Середній бал</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {userAnalytics.average_score.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">В обробці</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{userAnalytics.processing_attempts || 0}</div>
                  <div className="mt-2 progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${userAnalytics.completion_rate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {userAnalytics.score_trend && userAnalytics.score_trend.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      <CardTitle>Динаміка балів</CardTitle>
                    </div>
                    <div className="flex gap-1 p-1 bg-muted rounded-lg">
                      {trendRanges.map((range) => (
                        <Button
                          key={range.value}
                          variant={trendRange === range.value ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setTrendRange(range.value)}
                        >
                          {range.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTrend.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      За цей період ще немає оцінених спроб.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {filteredTrend.length} оцінених спроб
                            </p>
                            <p className="text-xs text-slate-500">
                              Бал за завершеними сесіями у вибраному діапазоні
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Останній бал</p>
                            <p className={`text-2xl font-bold ${getScoreColor(filteredTrend[filteredTrend.length - 1].score)}`}>
                              {filteredTrend[filteredTrend.length - 1].score.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="relative h-72 rounded-xl border border-slate-100 bg-slate-50 px-6 py-5">
                          <div className="absolute left-10 right-5 top-5 border-t border-slate-200" />
                          <div className="absolute left-10 right-5 top-1/2 border-t border-slate-200" />
                          <div className="absolute bottom-8 left-10 right-5 border-t border-slate-300" />
                          <div className="absolute left-3 top-3 text-xs font-medium text-slate-500">100</div>
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">50</div>
                          <div className="absolute bottom-6 left-5 text-xs font-medium text-slate-500">0</div>
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative z-10 h-full w-full">
                          <polyline
                            points={chartPoints}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          />
                          {filteredTrend.map((item, index) => {
                            const x = filteredTrend.length === 1 ? 51 : 8 + (index / Math.max(1, filteredTrend.length - 1)) * 86;
                            const y = 88 - Math.max(0, Math.min(100, item.score)) * 0.8;
                            return (
                              <circle
                                key={`${item.attempt_id}-${index}`}
                                cx={x}
                                cy={y}
                                r="2"
                                fill="hsl(var(--primary))"
                                vectorEffect="non-scaling-stroke"
                              />
                            );
                          })}
                        </svg>
                          <div className="absolute bottom-2 left-10 text-xs text-slate-500">
                            {formatDate(filteredTrend[0].date)}
                          </div>
                          <div className="absolute bottom-2 right-5 text-xs text-slate-500">
                            {formatDate(filteredTrend[filteredTrend.length - 1].date)}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {filteredTrend.slice(-4).map((item) => (
                          <div key={item.attempt_id} className={`rounded-xl border p-3 ${getScoreTone(item.score)}`}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-medium text-slate-600">{formatDate(item.date)}</p>
                              <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                            </div>
                            <p className={`mt-2 text-xl font-bold ${getScoreColor(item.score)}`}>
                              {item.score.toFixed(1)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <CardTitle>Останні спроби</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {userAnalytics.recent_attempts && userAnalytics.recent_attempts.length > 0 ? (
                    <div className="space-y-3">
                      {userAnalytics.recent_attempts.map((attempt) => (
                        <Link
                          key={attempt.id}
                          to={`/attempts/${attempt.id}`}
                          className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="font-medium text-sm line-clamp-1">
                              {attempt.template_title || `Спроба #${attempt.id}`}
                            </p>
                            <Badge variant={attempt.status === 'completed' ? 'default' : 'secondary'}>
                              {statusLabels[attempt.status] || attempt.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDate(attempt.started_at)}</span>
                            {attempt.final_score !== null && (
                              <span className={`font-bold ${getScoreColor(attempt.final_score)}`}>
                                {attempt.final_score.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Немає спроб</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    <CardTitle>Слабкі поняття</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {userAnalytics.weak_concepts && userAnalytics.weak_concepts.length > 0 ? (
                    <div className="space-y-2">
                      {userAnalytics.weak_concepts.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between border rounded-lg p-3 bg-red-50 dark:bg-red-950/20"
                        >
                          <span className="text-sm">{item.concept}</span>
                          <Badge variant="destructive">{item.count}×</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Немає даних</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {userAnalytics.weak_topics && userAnalytics.weak_topics.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <CardTitle>Теми для покращення</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userAnalytics.weak_topics.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.topic}</span>
                          <span className={`font-bold ${getScoreColor(item.average_score)}`}>
                            {item.average_score.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${item.average_score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {isMentor && mentorAnalytics && (
        <>
          <Separator className="my-8" />
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Award className="h-5 w-5" />
              Статистика ментора
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Створено шаблонів</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mentorAnalytics.total_templates}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Всього спроб</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mentorAnalytics.total_attempts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Очікують перевірки</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mentorAnalytics.attempts_under_review}</div>
                </CardContent>
              </Card>
            </div>

            {mentorAnalytics.templates && mentorAnalytics.templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Мої шаблони</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Назва</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead className="text-center">Спроб</TableHead>
                        <TableHead className="text-center">Середній бал</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mentorAnalytics.templates.map((template) => (
                        <TableRow key={template.template_id}>
                          <TableCell>
                            <Link
                              to={`/templates/${template.template_id}`}
                              className="hover:underline"
                            >
                              {template.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={template.session_type === 'assessment' ? 'default' : 'secondary'}>
                              {template.session_type === 'assessment' ? 'Оцінка' : 'Практика'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{template.total_attempts}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${getScoreColor(template.average_score)}`}>
                              {template.average_score.toFixed(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {mentorAnalytics.hardest_questions && mentorAnalytics.hardest_questions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    <CardTitle>Найскладніші питання</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mentorAnalytics.hardest_questions.map((question, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm line-clamp-2">{question.question_text}</p>
                          <span className={`text-sm font-bold ${getScoreColor(question.average_score)}`}>
                            {question.average_score.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{question.template_title}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <div className="mt-8 flex justify-center gap-4">
        <Button asChild>
          <Link to="/templates">Переглянути шаблони</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/attempts">Мої спроби</Link>
        </Button>
      </div>
    </div>
  );
};
