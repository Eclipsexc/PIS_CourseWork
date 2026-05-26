import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Plus } from 'lucide-react';
import { templatesAPI, getApiErrorMessage } from '../../../shared/api/client';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

export const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templatesAPI.getAll();
      setTemplates(response.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося завантажити шаблони'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const importPublicTemplate = async (event) => {
    event.preventDefault();
    if (!importUrl.trim()) {
      toast.error('Встав public URL шаблону.');
      return;
    }

    try {
      setImporting(true);
      const response = await templatesAPI.importPublic({ url: importUrl.trim() });
      toast.success('Публічний шаблон імпортовано');
      setImportUrl('');
      setTemplates((current) => [response.data, ...current]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося імпортувати публічний шаблон'));
    } finally {
      setImporting(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'ready':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'locked':
        return 'outline';
      case 'archived':
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
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <Skeleton className="h-32 w-full mb-8" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Мої шаблони
          </h1>
          <p className="text-muted-foreground">
            Керуй сесіями підготовки, assessment-шаблонами та поширенням шаблонів.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link to="/templates/create">
              <Plus className="w-4 h-4 mr-2" />
              Створити шаблон
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Імпорт публічного шаблону</CardTitle>
          <CardDescription>
            Шаблон буде скопійовано у твої "Мої шаблони" разом з питаннями та еталонами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={importPublicTemplate} className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="importUrl">Public URL</Label>
              <Input
                id="importUrl"
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                placeholder="https://.../shared/public-token"
              />
            </div>
            <Button type="submit" disabled={importing} variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              {importing ? 'Імпорт...' : 'Імпортувати'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Шаблонів ще немає</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Створи перший шаблон вручну або імпортуй питання з .txt.
            </p>
            <Button asChild>
              <Link to="/templates/create">
                <Plus className="w-4 h-4 mr-2" />
                Створити шаблон
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Link key={template.id} to={`/templates/${template.id}`}>
              <Card className="h-full card-interactive">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/20">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant={getStatusVariant(template.status)}>
                      {template.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description || 'Опис не додано.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-medium">{template.session_type}</span>
                    <span>{new Date(template.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
