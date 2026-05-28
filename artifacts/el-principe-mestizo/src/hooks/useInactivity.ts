import { useEffect, useRef, useCallback, useState } from "react";

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const WARNING_BEFORE = 60 * 1000; // 1 minuto antes de cerrar sesión

export function useInactivity(
  onTimeout: () => void,
  timeout: number = DEFAULT_TIMEOUT,
) {
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    setShowWarning(false);

    // Mostrar advertencia 1 minuto antes
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, timeout - WARNING_BEFORE);

    // Cerrar sesión
    timerRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  }, [onTimeout, timeout]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

    resetTimer();

    const handleEvent = () => resetTimer();

    events.forEach((event) => window.addEventListener(event, handleEvent));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleEvent));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  return { showWarning, dismissWarning };
}
