import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallAppButtonProps = {
  accentColor?: string;
};

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const isAppleTouchDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const InstallAppButton = ({ accentColor = '#ffffff' }: InstallAppButtonProps) => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAppleHint, setShowAppleHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    setShowAppleHint(isAppleTouchDevice());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowAppleHint(false);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (installed) {
    return null;
  }

  const handleInstall = async () => {
    if (!installPrompt) {
      window.alert(
        showAppleHint
          ? 'No iPhone ou iPad, toque em Compartilhar e depois em Adicionar a Tela de Inicio.'
          : 'Se o navegador nao abrir a instalacao automaticamente, use o menu do navegador e escolha Instalar app ou Adicionar a tela inicial.'
      );
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome !== 'dismissed') {
      setInstallPrompt(null);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-white/10"
      title="Instalar aplicativo"
      aria-label="Instalar aplicativo"
      style={{ boxShadow: `0 0 18px ${accentColor}18` }}
    >
      <Download size={16} style={{ color: accentColor }} />
      <span className="hidden lg:inline">Instalar</span>
    </button>
  );
};

export default InstallAppButton;
