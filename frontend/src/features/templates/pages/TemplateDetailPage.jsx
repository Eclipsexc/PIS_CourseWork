import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Clock, Copy, FileText, Play, Share2, Trash2 } from 'lucide-react';
import { attemptsAPI, getApiErrorMessage, templatesAPI } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../auth/store/authStore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const TemplateDetailPage = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isMentor = String(user?.role || '').toLowerCase() === 'mentor';
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState({ access_type: 'public', recipient_email: '', expires_at: '' });
  const [shareLink, setShareLink] = useState(null);
  const [shareError, setShareError] = useState('');
  const [expandedReferenceAnswers, setExpandedReferenceAnswers] = useState({});

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await templatesAPI.getById(templateId);
      setTemplate(response.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося завантажити шаблон'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const startAttempt = async () => {
    try {
      setActionLoading(true);
      const response = await attemptsAPI.create({ template_id: Number(templateId) });
      navigate(`/attempts/${response.data.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося стартувати спробу'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    try {
      setShareError('');
      setActionLoading(true);
      const payload = {
        access_type: shareData.access_type,
        recipient_email: shareData.recipient_email.trim() || null,
        expires_at: shareData.expires_at
          ? new Date(shareData.expires_at).toISOString()
          : null,
      };
      if (payload.access_type === 'private' && !payload.recipient_email) {
        setShareError('Для приватного доступу вкажи логін/email користувача.');
        return;
      }
      const response = await templatesAPI.createShareLink(templateId, payload);
      setShareLink(response.data);
      toast.success('Share link створено');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Не вдалося створити share link');
      setShareError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink?.token) return;
    const shareUrl = `${window.location.origin}/shared/${shareLink.token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Посилання скопійовано');
    } catch (error) {
      toast.error('Не вдалося скопіювати посилання');
    }
  };

  const deleteTemplate = async () => {
    if (!window.confirm('Видалити цей шаблон? Разом із ним зникнуть його питання, share links і повʼязані дані.')) return;

    try {
      setActionLoading(true);
      await templatesAPI.delete(templateId);
      toast.success('Шаблон видалено');
      navigate('/templates');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося видалити шаблон'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-semibold mb-4">Шаблон не знайдено</h1>
            <Button asChild>
              <Link to="/templates">До шаблонів</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              {template.title}
            </h1>
            <p className="text-muted-foreground">{template.description || 'Опис не додано.'}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setShareOpen(true)}
              disabled={template.session_type === 'assessment' && !isMentor}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Поширити
            </Button>
            {!isMentor && template.session_type !== 'assessment' && (
              <Button onClick={startAttempt} disabled={actionLoading}>
                <Play className="w-4 h-4 mr-2" />
                {actionLoading ? 'Завантаження...' : 'Start Attempt'}
              </Button>
            )}
            <Button variant="destructive" onClick={deleteTemplate} disabled={actionLoading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Видалити
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <Badge variant={template.status === 'ready' ? 'default' : 'secondary'}>
                {template.status}
              </Badge>
              <p className="text-muted-foreground text-sm mt-3">Статус шаблону</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{template.session_type}</div>
              <p className="text-muted-foreground text-sm mt-3">Тип сесії</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-semibold">{template.duration_minutes || '—'}</div>
              <p className="text-muted-foreground text-sm mt-3">Хвилин на проходження</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <CardTitle>Питання</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {template.questions?.length ? (
              <div className="space-y-4">
                {template.questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{question.question_text}</p>
                          {question.reference_answer && isMentor && (
                            <div className="mt-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedReferenceAnswers((current) => ({ ...current, [question.id]: !current[question.id] }))}
                              >
                                {expandedReferenceAnswers[question.id] ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Сховати еталон
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Показати еталон
                                  </>
                                )}
                              </Button>
                              {expandedReferenceAnswers[question.id] && (
                                <div className="mt-3 rounded-lg border bg-muted p-3 text-sm">
                                  <p className="whitespace-pre-wrap">{question.reference_answer}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Питання ще не додані.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Поширити шаблон</CardTitle>
              <CardDescription>
                Створи share link і надішли його іншому користувачу. Для assessment доступне лише для менторів.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access_type">Доступ</Label>
                <select
                  id="access_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={shareData.access_type}
                  onChange={(event) => setShareData((current) => ({ ...current, access_type: event.target.value }))}
                >
                  <option value="public">Публічний (будь-хто з лінком)</option>
                  <option value="private">Приватний (потрібен логін)</option>
                </select>
              </div>

              {shareData.access_type === 'private' && (
                <div className="space-y-2">
                  <Label htmlFor="recipient_email">Логін/email учасника</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={shareData.recipient_email}
                    onChange={(event) => setShareData((current) => ({ ...current, recipient_email: event.target.value }))}
                    placeholder="student@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Зараз логін користувача збігається з email для входу.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expires_at">Термін дії (опційно)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={shareData.expires_at}
                  onChange={(event) => setShareData((current) => ({ ...current, expires_at: event.target.value }))}
                />
              </div>

              {shareError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{shareError}</AlertDescription>
                </Alert>
              )}

              {shareLink?.token && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="font-medium mb-2">Share link</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm text-muted-foreground">
                        {`${window.location.origin}/shared/${shareLink.token}`}
                      </span>
                      <Button variant="ghost" size="sm" onClick={handleCopyShareLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4">
                <Button variant="outline" onClick={() => setShareOpen(false)}>
                  Закрити
                </Button>
                <Button onClick={handleCreateShareLink} disabled={actionLoading}>
                  <Share2 className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Завантаження...' : 'Створити лінк'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
