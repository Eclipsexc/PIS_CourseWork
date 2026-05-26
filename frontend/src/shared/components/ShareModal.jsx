import React, { useState } from 'react';
import { Copy, Check, X, Calendar, Lock, Globe } from 'lucide-react';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';

export const ShareModal = ({ isOpen, onClose, onShare, loading }) => {
  const [accessType, setAccessType] = useState('public');
  const [expiresAt, setExpiresAt] = useState('');
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const data = {
      access_type: accessType,
      expires_at: expiresAt || null,
    };

    const result = await onShare(data);
    if (result) {
      const fullLink = `${window.location.origin}/shared/${result.token}`;
      setShareLink(fullLink);
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Посилання скопійовано!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setAccessType('public');
    setExpiresAt('');
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-2xl">
        
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        
        <h2 className="text-2xl font-bold mb-6">Поширити шаблон</h2>

        {!shareLink ? (
          <div className="space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Тип доступу
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAccessType('public')}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                    accessType === 'public'
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Публічний</p>
                    <p className="text-xs opacity-80">Доступний всім</p>
                  </div>
                </button>
                <button
                  onClick={() => setAccessType('private')}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                    accessType === 'private'
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-semibold">Приватний</p>
                    <p className="text-xs opacity-80">Потрібен вхід</p>
                  </div>
                </button>
              </div>
            </div>

            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Термін дії (необов'язково)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Залиш порожнім для необмеженого терміну дії
              </p>
            </div>

            
            <Button
              variant="gradient"
              onClick={handleShare}
              loading={loading}
              className="w-full"
            >
              Створити посилання
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-200">Посилання створено!</p>
                  <p className="text-sm text-green-300/80 mt-1">
                    Тепер ти можеш поділитися цим посиланням з іншими.
                  </p>
                </div>
              </div>
            </div>

            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Посилання для поширення
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white font-mono text-sm"
                />
                <Button
                  variant={copied ? 'success' : 'ghost'}
                  icon={copied ? Check : Copy}
                  onClick={copyToClipboard}
                >
                  {copied ? 'Скопійовано' : 'Копіювати'}
                </Button>
              </div>
            </div>

            
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  {accessType === 'public' ? (
                    <Globe className="w-4 h-4 text-blue-300" />
                  ) : (
                    <Lock className="w-4 h-4 text-blue-300" />
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-blue-200 mb-1">
                    {accessType === 'public' ? 'Публічний доступ' : 'Приватний доступ'}
                  </p>
                  <p className="text-blue-300/80">
                    {accessType === 'public'
                      ? 'Будь-хто з посиланням може переглянути та пройти цей шаблон.'
                      : 'Тільки авторизовані користувачі можуть переглянути та пройти цей шаблон.'}
                  </p>
                  {expiresAt && (
                    <p className="text-blue-300/80 mt-2">
                      Термін дії: {new Date(expiresAt).toLocaleString('uk-UA')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            
            <Button variant="ghost" onClick={handleClose} className="w-full">
              Закрити
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
