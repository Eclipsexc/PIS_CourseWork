import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckSquare, ChevronDown, ChevronUp, FileUp, Square } from 'lucide-react';
import toast from 'react-hot-toast';

import { templatesAPI, getApiErrorMessage } from '../../../shared/api/client';
import { useAuthStore } from '../../auth/store/authStore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Alert, AlertDescription } from '../../../components/ui/alert';

const answerModeOptions = [
  { value: 'text', label: 'Текстовий режим' },
  { value: 'voice_video', label: 'Відео-відповідь' },
];

export const TemplateCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isMentor = user?.role === 'mentor';
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [error, setError] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [enabledQuestionIndexes, setEnabledQuestionIndexes] = useState(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_type: 'practice',
    answer_mode: 'text',
    duration_minutes: 30,
  });

  const sessionTypeOptions = isMentor
    ? [
        { value: 'practice', label: 'Тренувальна сесія' },
        { value: 'assessment', label: 'Оціночна сесія' },
      ]
    : [{ value: 'practice', label: 'Тренувальна сесія' }];

  const updateField = (event) => {
    setError('');
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'session_type' && value === 'assessment' ? { answer_mode: 'voice_video' } : {}),
    }));
  };

  const handleFileChange = async (event) => {
    setError('');
    setParsedQuestions([]);
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.txt') && !lowerName.endsWith('.pdf')) {
      setError('Підтримуються тільки .txt та .pdf файли.');
      return;
    }

    try {
      setParsingFile(true);
      const response = await templatesAPI.parseFile(file);
      const questions = response.data.questions || [];
      setParsedQuestions(questions);
      setEnabledQuestionIndexes(new Set(questions.map((_, index) => index)));
      toast.success(`Імпортовано питань: ${questions.length}`);
    } catch (fileError) {
      setError(getApiErrorMessage(fileError, 'Не вдалося обробити файл'));
    } finally {
      setParsingFile(false);
    }
  };

  const toggleQuestionEnabled = (index) => {
    setEnabledQuestionIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const buildBasePayload = () => ({
    title: formData.title.trim(),
    description: formData.description.trim() || null,
    session_type: isMentor ? formData.session_type : 'practice',
    answer_mode: formData.session_type === 'assessment' ? 'voice_video' : formData.answer_mode,
    duration_minutes: Number(formData.duration_minutes),
    allow_pause: formData.session_type !== 'assessment',
    max_attempts: formData.session_type === 'assessment' ? 1 : null,
    strict_timer: formData.session_type === 'assessment',
    camera_required: formData.session_type === 'assessment',
    voice_required: formData.session_type === 'assessment' || formData.answer_mode !== 'text',
    randomized_questions: formData.session_type === 'assessment',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...buildBasePayload(),
        questions: parsedQuestions
          .filter((_, index) => enabledQuestionIndexes.has(index))
          .map((item, index) => ({
            question_text: item.question,
            question_type: 'text_question',
            order_index: index,
            reference_answer: item.answer,
            keywords: [],
            evaluation_criteria: {
              key_points: ['чіткість', 'повнота', 'структура'],
              scale: '0-100',
            },
          })),
      };

      if (!payload.title) {
        throw new Error('Назва шаблону обовʼязкова.');
      }
      if (payload.duration_minutes < 5 || payload.duration_minutes > 60) {
        throw new Error('Тривалість має бути від 5 до 60 хвилин.');
      }
      if (!payload.questions.length) {
        throw new Error('Імпортуй файл і залиш увімкненим хоча б одне питання.');
      }

      const response = await templatesAPI.create(payload);
      toast.success('Шаблон створено');
      navigate(`/templates/${response.data.id}`);
    } catch (submitError) {
      setError(submitError.response
        ? getApiErrorMessage(submitError, 'Не вдалося створити шаблон')
        : submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-950">
            Створити шаблон з файлу
          </h1>
          <p className="text-slate-600">
            Імпортуй .txt або .pdf з питаннями та еталонними відповідями. Еталонні відповіді потрібні для оцінювання.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileUp className="h-7 w-7 text-primary" />
              <div>
                <CardTitle>Імпорт шаблону</CardTitle>
                <CardDescription>Формат: Q1. питання, A1. еталонна відповідь. Підтримуються багаторядкові блоки.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Назва шаблону</Label>
                <Input id="title" name="title" value={formData.title} onChange={updateField} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Опис</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={updateField}
                  placeholder="Коротко поясни призначення шаблону"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session_type">Тип сесії</Label>
                  <select
                    id="session_type"
                    name="session_type"
                    value={isMentor ? formData.session_type : 'practice'}
                    onChange={updateField}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-950 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {sessionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {!isMentor && <p className="text-xs text-slate-500">Учасник може створювати тільки тренувальні сесії.</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="answer_mode">Формат відповіді</Label>
                  <select
                    id="answer_mode"
                    name="answer_mode"
                    value={formData.session_type === 'assessment' ? 'voice_video' : formData.answer_mode}
                    onChange={updateField}
                    disabled={formData.session_type === 'assessment'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-950 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {answerModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {formData.session_type === 'assessment' && (
                    <p className="text-xs text-slate-500">Для оціночної сесії автоматично використовується відео-відповідь.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Тривалість</Label>
                  <span className="text-sm font-medium text-slate-800">{formData.duration_minutes} хв</span>
                </div>
                <input
                  type="range"
                  name="duration_minutes"
                  min="5"
                  max="60"
                  step="5"
                  value={formData.duration_minutes}
                  onChange={updateField}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Файл з питаннями</Label>
                <input
                  id="file"
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf"
                  onChange={handleFileChange}
                  className="flex min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-950 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-slate-500">
                  Після імпорту можна вимкнути зайві питання і створити шаблон лише з потрібних.
                </p>
              </div>

              {parsingFile && <p className="text-sm text-slate-600">Обробляємо файл...</p>}

              {parsedQuestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Обрано питань: {enabledQuestionIndexes.size} з {parsedQuestions.length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {parsedQuestions.map((item, index) => {
                      const expanded = expandedAnswers[index];
                      const enabled = enabledQuestionIndexes.has(index);
                      return (
                        <div
                          key={`${item.question}-${index}`}
                          className={`rounded-lg border p-3 ${enabled ? 'bg-white' : 'bg-slate-100 opacity-65'}`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleQuestionEnabled(index)}
                              className="mt-0.5 rounded p-1 text-slate-900 hover:bg-slate-100"
                              aria-label={enabled ? 'Відключити питання' : 'Увімкнути питання'}
                            >
                              {enabled ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedAnswers((current) => ({ ...current, [index]: !expanded }))}
                              className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left text-slate-950"
                            >
                              <span className="font-medium">{index + 1}. {item.question}</span>
                              {expanded ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
                            </button>
                          </div>
                          {expanded && (
                            <p className="mt-3 whitespace-pre-wrap pl-9 text-sm text-slate-600">{item.answer}</p>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading || parsingFile} className="w-full">
                {loading ? 'Завантаження...' : 'Створити шаблон'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
