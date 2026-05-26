import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Target, Users, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../auth/store/authStore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';

export const LandingPage = () => {
  const { isAuthenticated } = useAuthStore();

  const features = [
    {
      icon: Brain,
      title: 'AI-оцінювання',
      description: 'Отримуй швидкий аналіз відповідей, сильні сторони та конкретні поради для покращення.',
    },
    {
      icon: Target,
      title: 'Тренувальні сесії',
      description: 'Створюй підготовчі сесії, проходь спроби та відстежуй прогрес у зручному форматі.',
    },
    {
      icon: Users,
      title: 'Перевірка ментором',
      description: 'Для assessment-сесій ментор може переглянути відповідь, виставити фінальний бал і коментар.',
    },
    {
      icon: TrendingUp,
      title: 'Аналітика прогресу',
      description: 'Бач, скільки шаблонів, спроб і оцінок уже накопичено у твоєму робочому просторі.',
    },
  ];

  const benefits = [
    'Генерація питань під тему, рівень складності та контекст',
    'Підтримка текстових, голосових і відео відповідей',
    'AI-аналіз відповідей з балами та рекомендаціями',
    'Окремі режими practice та assessment',
    'Історія спроб і контроль готовності шаблонів',
    'Менторська перевірка для фінального оцінювання',
  ];

  return (
    <div className="flex flex-col">
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6 text-foreground">
            Готуйся до співбесід з <span className="text-primary">PrepAI</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Платформа для підготовки до співбесід, іспитів і публічних виступів з AI-генерацією питань та оцінюванням відповідей.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Button size="lg" asChild>
                  <Link to="/dashboard">
                    Панель керування
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/templates">Шаблони</Link>
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/register">
                    Почати роботу
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Увійти</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="section-divider container" />

      <section className="container py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Основні можливості
            </h2>
            <p className="text-muted-foreground">
              Усе потрібне для структурованої підготовки та оцінювання
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="card-interactive">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border-2 border-primary/20">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider container" />

      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Чому PrepAI зручно використовувати
            </h2>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="section-divider container" />

      <section className="container py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            {isAuthenticated ? 'Продовжити роботу' : 'Готовий почати?'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isAuthenticated
              ? 'Перейди до панелі керування або створи новий шаблон підготовки.'
              : 'Створи акаунт, додай шаблон і спробуй AI-оцінювання відповідей.'}
          </p>
          {isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/dashboard">Панель керування</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/templates/create">Створити шаблон</Link>
              </Button>
            </div>
          ) : (
            <Button size="lg" asChild>
              <Link to="/register">Зареєструватися</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};
