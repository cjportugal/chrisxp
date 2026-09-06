import { useEffect, useEffectEvent } from 'react';

interface Windows95LoadingScreenProps {
  onComplete: () => void;
}

export default function Windows95LoadingScreen({ onComplete }: Windows95LoadingScreenProps) {
  const complete = useEffectEvent(onComplete);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      complete();
    };
    let timeout = window.setTimeout(finish, preference.matches ? 600 : 6400);
    const handlePreference = () => {
      if (preference.matches) {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(finish, 600);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        finish();
      }
    };
    preference.addEventListener('change', handlePreference);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timeout);
      preference.removeEventListener('change', handlePreference);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="win95-loading" role="status" aria-label="Windows 95 is starting">
      <div className="win95-loading__screen" aria-hidden="true">
        <img
          className="win95-loading__artwork"
          src={`${import.meta.env.BASE_URL}windows95-boot.png`}
          alt=""
          width={2032}
          height={1532}
          fetchPriority="high"
          draggable={false}
        />
        <div className="win95-loading__track"><div className="win95-loading__progress" /></div>
      </div>
    </div>
  );
}
