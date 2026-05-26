import React from 'react';
import { Activity, Camera, Eye, Lightbulb, Mic, Monitor, Radio, Zap } from 'lucide-react';
import { ProgressBar } from '../ui/UI';

const pct = (value) => `${Math.round((value || 0) * 100)}%`;

const qualityLabel = (value) => {
  if (value == null) return 'немає даних';
  if (value >= 0.75) return 'добра';
  if (value >= 0.45) return 'середня';
  return 'низька';
};

const MetricRow = ({ label, value, icon: Icon, hint }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
        {Icon && <Icon className="h-4 w-4 text-emerald-600" />}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

const MetricBar = ({ label, value, icon: Icon, hint }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
        {Icon && <Icon className="h-4 w-4 text-emerald-600" />}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-950">{pct(value)}</span>
    </div>
    <ProgressBar value={Math.round((value || 0) * 100)} />
    {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const VideoMetricsPanel = ({ metrics, className = '' }) => {
  const recommendations = metrics?.recommendations?.length
    ? metrics.recommendations
    : ['Метрики є орієнтовними. Короткі паузи під час відповіді — це нормально.'];

  return (
    <aside className={`rounded-2xl border border-slate-200 bg-white p-4 text-slate-950 shadow-sm ${className}`}>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Live metrics</h2>
        <p className="mt-1 text-xs text-slate-500">
          Орієнтовні технічні та поведінкові heuristics, не обʼєктивна діагностика.
        </p>
      </div>

      <div className="mb-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Camera / technical</p>
        <MetricRow icon={Camera} label="Камера" value={metrics?.cameraActive ? 'активна' : 'недоступна'} />
        <MetricRow icon={Mic} label="Мікрофон" value={metrics?.microphoneActive ? 'активний' : 'недоступний'} />
        <MetricRow icon={Monitor} label="Роздільність" value={metrics?.resolution || '—'} />
        <MetricRow icon={Radio} label="FPS" value={metrics?.fps ? `${Math.round(metrics.fps)}` : '—'} />
        <MetricBar icon={Lightbulb} label="Освітлення" value={metrics?.brightness} hint={`Якість освітлення: ${qualityLabel(metrics?.brightness)}`} />
        <MetricBar icon={Zap} label="Чіткість кадру" value={metrics?.clarity} hint={`Розмиття: ${qualityLabel(1 - (metrics?.blur || 0))}`} />
      </div>

      <div className="mb-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Behavioral heuristics</p>
        <MetricBar icon={Eye} label="Час фокусування" value={metrics?.focusRatio} hint="Оцінка базується на стабільності кадру та технічній якості." />
        <MetricRow icon={Eye} label="Погляд поза камерою" value={metrics?.offscreenRatio == null ? 'очікуємо кадр' : pct(metrics.offscreenRatio)} hint="Орієнтовно за положенням обличчя в кадрі." />
        <MetricRow icon={Activity} label="Моргання" value={metrics?.blinkRate == null ? 'очікуємо кадр' : `${Math.round(metrics.blinkRate)}/хв`} hint="Heuristic, не медична метрика." />
        <MetricBar icon={Mic} label="Активність мовлення" value={metrics?.speakingActivity} />
        <MetricBar icon={Activity} label="Впевненість" value={metrics?.confidenceHeuristic} hint="Heuristic score: технічна якість + стабільність мовлення, не психологічна оцінка." />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Recommendations</p>
        {recommendations.map((item) => (
          <div key={item} className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-900">
            {item}
          </div>
        ))}
      </div>
    </aside>
  );
};
