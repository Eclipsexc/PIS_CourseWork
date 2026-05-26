import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Inbox, Play, UserCheck } from 'lucide-react';
import { getApiErrorMessage, mentorAPI } from '../../../shared/api/client';
import { useAuthStore } from '../../auth/store/authStore';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export const MentorPage = () => {
  const { user } = useAuthStore();
  const isMentor = String(user?.role || '').toLowerCase() === 'mentor';
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [myResults, setMyResults] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [completedReviews, setCompletedReviews] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const inviteResponse = await mentorAPI.getInvitations();
      const resultsResponse = await mentorAPI.getMyResults();
      setInvitations(inviteResponse.data);
      setMyResults(resultsResponse.data);

      if (isMentor) {
        const [reviewResponse, mentorResultsResponse] = await Promise.all([
          mentorAPI.getAssessments(),
          mentorAPI.getReviewResults(),
        ]);
        setReviews(reviewResponse.data);
        setCompletedReviews(mentorResultsResponse.data);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося завантажити менторський розділ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isMentor]);

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

  const newInviteCount = invitations.length;
  const reviewCount = reviews.length;
  const formatScore = (value) => (value === null || value === undefined || value === '' ? '—' : `${Number(value).toFixed(2)}%`);

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Ментор
            </h1>
            <p className="text-muted-foreground">
              Запрошення і твої assessment-результати. Перевірка учнів показується тільки акаунтам з роллю ментора.
            </p>
            {(newInviteCount > 0 || reviewCount > 0) && (
              <p className="mt-2 text-sm font-medium text-primary">
                {newInviteCount > 0 ? `+${newInviteCount} нове запрошення` : ''}
                {newInviteCount > 0 && reviewCount > 0 ? ' • ' : ''}
                {reviewCount > 0 ? `+${reviewCount} спроба на перевірку` : ''}
              </p>
            )}
          </div>
        </div>

        <div className={`grid gap-6 ${isMentor ? 'lg:grid-cols-2' : ''}`}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Inbox className="h-6 w-6" />
                  <CardTitle>Запрошення</CardTitle>
                </div>
                {newInviteCount > 0 && <Badge>+{newInviteCount}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-muted-foreground text-sm">Нових приватних запрошень немає.</p>
              ) : (
                <div className="space-y-3">
                  {invitations.map((invite) => (
                    <Card key={invite.id} className="card-interactive">
                      <CardContent className="pt-6">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{invite.template.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Від: {invite.template.owner_name || 'ментор'} • {invite.template.session_type}
                            </p>
                          </div>
                          <Badge variant={invite.template.status === 'ready' ? 'default' : 'secondary'}>
                            {invite.template.status}
                          </Badge>
                        </div>
                        <Button asChild size="sm">
                          <Link to={`/shared/${invite.token}`}>
                            <Play className="w-4 h-4 mr-2" />
                            Відкрити
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isMentor && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-6 w-6" />
                    <CardTitle>Перевірка учнів</CardTitle>
                  </div>
                  {reviewCount > 0 && <Badge variant="secondary">+{reviewCount}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Спроб на перевірку зараз немає.</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((attempt) => (
                      <Link key={attempt.id} to={`/mentor/attempts/${attempt.id}`}>
                        <Card className="transition-colors hover:bg-accent">
                          <CardContent className="pt-6">
                            <h3 className="font-semibold">{attempt.template?.title || `Attempt #${attempt.id}`}</h3>
                            <p className="text-sm text-muted-foreground">
                              Учень #{attempt.user_id} • {new Date(attempt.created_at).toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCheck className="h-6 w-6" />
              <CardTitle>Мої результати від ментора</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {myResults.length === 0 ? (
              <p className="text-muted-foreground text-sm">Поки немає assessment-результатів від ментора.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myResults.map((attempt) => (
                  <Card key={attempt.id} className="card-interactive">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{attempt.template?.title || `Attempt #${attempt.id}`}</h3>
                            <p className="text-sm text-muted-foreground">
                              Статус: {attempt.status === 'reviewed' ? 'перевірено' : 'очікує ментора'}
                            </p>
                          </div>
                          <Badge variant={attempt.status === 'reviewed' ? 'default' : 'secondary'}>
                            {attempt.status === 'reviewed' ? 'Перевірено' : 'Очікує'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border-2 bg-primary/5 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">AI</p>
                            <p className="mt-1 text-2xl font-bold text-primary">{formatScore(attempt.ai_score ?? attempt.total_score)}</p>
                          </div>
                          <div className="rounded-xl border-2 bg-primary/5 p-4">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Ментор</p>
                            <p className="mt-1 text-2xl font-bold text-primary">{formatScore(attempt.mentor_score)}</p>
                          </div>
                        </div>

                        {attempt.mentor_feedback?.comment && (
                          <p className="rounded-lg border-2 bg-muted p-3 text-sm">
                            {attempt.mentor_feedback.comment}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isMentor && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <UserCheck className="h-6 w-6" />
                <CardTitle>Результати учнів</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {completedReviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">Ще немає результатів за твоїми assessment-шаблонами.</p>
              ) : (
                <div className="space-y-3">
                  {completedReviews.map((attempt) => (
                    <Card key={attempt.id}>
                      <CardContent className="pt-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold">{attempt.template?.title || `Attempt #${attempt.id}`}</h3>
                            <p className="text-sm text-muted-foreground">
                              Учень #{attempt.user_id} • статус: {attempt.status}
                            </p>
                          </div>
                          <span className="rounded-lg border bg-muted px-4 py-2 text-lg font-semibold">
                            {formatScore(attempt.final_score ?? attempt.ai_score ?? attempt.total_score ?? 0)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
