import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Target } from 'lucide-react';
import { attemptsAPI, getApiErrorMessage } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export const AttemptsPage = () => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAttempts = async () => {
    try {
      setLoading(true);
      const response = await attemptsAPI.getAll();
      setAttempts(response.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося завантажити спроби'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
      case 'reviewed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'in_progress':
        return 'outline';
      case 'under_review':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const readyResultsCount = attempts.filter((attempt) => (
    ['completed', 'reviewed', 'under_review'].includes(attempt.status)
    && (attempt.final_score !== null || attempt.ai_score !== null || attempt.total_score !== null)
  )).length;
  const practiceAttempts = attempts.filter((attempt) => attempt.template?.session_type !== 'assessment');
  const assessmentAttempts = attempts.filter((attempt) => attempt.template?.session_type === 'assessment');

  const renderAttemptList = (items) => (
    <div className="space-y-3">
      {items.map((attempt) => (
        <Link key={attempt.id} to={`/attempts/${attempt.id}`}>
          <Card className="card-interactive">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {attempt.template?.title || `Attempt #${attempt.id}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {attempt.template?.session_type || 'practice'} • {new Date(attempt.started_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {attempt.status === 'processing' && (
                    <span className="text-sm text-muted-foreground">Обробка результатів...</span>
                  )}
                  {attempt.template?.session_type === 'assessment' && attempt.status === 'reviewed' && (
                    <span className="text-sm text-muted-foreground">Фідбек у розділі "Ментор"</span>
                  )}
                  {attempt.final_score !== null && (
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Award className="w-4 h-4" />
                      {attempt.final_score.toFixed(1)}%
                    </span>
                  )}
                  <Badge variant={getStatusVariant(attempt.status)}>
                    {attempt.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Мої спроби
          </h1>
          <p className="text-muted-foreground">
            Переглядай активні, завершені та assessment-спроби.
          </p>
          {readyResultsCount > 0 && (
            <p className="mt-2 text-sm font-medium">
              +{readyResultsCount} новий результат
            </p>
          )}
        </div>
      </div>

      {attempts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="w-12 h-12 mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Спроб ще немає</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Відкрий готовий шаблон і стартуй перше проходження.
            </p>
            <Button asChild>
              <Link to="/templates">До шаблонів</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Тренувальні сесії</CardTitle>
            </CardHeader>
            <CardContent>
              {practiceAttempts.length ? (
                renderAttemptList(practiceAttempts)
              ) : (
                <p className="text-muted-foreground text-sm">Тренувальних спроб немає.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Оціночні сесії</CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentAttempts.length ? (
                renderAttemptList(assessmentAttempts)
              ) : (
                <p className="text-muted-foreground text-sm">Оціночних спроб немає.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
