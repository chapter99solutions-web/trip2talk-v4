import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  onChange: (base64: string | null) => void;
  width?: number;
  height?: number;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onChange, width, height = 200 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getPoint = useCallback((e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    lastPointRef.current = null;
    onChange(null);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    clear,
    isEmpty: () => !hasStrokes,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = width ?? (Math.floor(rect.width) || 400);
      const h = height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startDraw = (x: number, y: number) => {
      drawingRef.current = true;
      lastPointRef.current = { x, y };
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const drewRef = { current: false };

    const draw = (x: number, y: number) => {
      if (!drawingRef.current || !lastPointRef.current) return;
      const midX = (lastPointRef.current.x + x) / 2;
      const midY = (lastPointRef.current.y + y) / 2;
      ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
      ctx.stroke();
      lastPointRef.current = { x, y };
      drewRef.current = true;
      setHasStrokes(true);
    };

    const endDraw = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      lastPointRef.current = null;
      ctx.closePath();
      if (drewRef.current) {
        setHasStrokes(true);
        emitChange();
      }
      drewRef.current = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const p = getPoint(e, canvas);
      startDraw(p.x, p.y);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const p = getPoint(e, canvas);
      draw(p.x, p.y);
    };

    const onMouseUp = () => endDraw();

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length < 1) return;
      const p = getPoint(e.touches[0], canvas);
      startDraw(p.x, p.y);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!drawingRef.current || e.touches.length < 1) return;
      const p = getPoint(e.touches[0], canvas);
      draw(p.x, p.y);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endDraw();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [emitChange, getPoint]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl bg-neutral-900 border border-amber-500/30 touch-none"
      style={{ height }}
      aria-label="Signature pad"
    />
  );
});

export default SignaturePad;
