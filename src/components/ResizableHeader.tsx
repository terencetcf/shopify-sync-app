import { useState, useCallback, useEffect } from 'react';

interface ResizableHeaderProps {
  children: React.ReactNode;
  width: number;
  minWidth?: number;
  onResize?: (width: number) => void;
  className?: string;
  resizable?: boolean;
}

export function ResizableHeader({
  children,
  width,
  minWidth = 50,
  onResize,
  className = '',
  resizable = true,
}: ResizableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      setStartX(e.pageX);
      setStartWidth(width);
    },
    [width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const diff = e.pageX - startX;
      const newWidth = Math.max(minWidth, startWidth + diff);
      if (onResize) {
        onResize(newWidth);
      }
    },
    [isResizing, startX, startWidth, minWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <th
      className={`relative select-none group ${className}`}
      style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
    >
      <div className="flex items-center overflow-hidden">
        <div className="truncate">{children}</div>
        {!resizable && (
          <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
        )}
      </div>
      {resizable && (
        <div
          className={`absolute top-0 right-0 h-full w-2 cursor-col-resize 
            bg-gradient-to-r from-transparent via-gray-500/0 to-gray-500/10
            group-hover:to-gray-500/30 hover:to-blue-500/50 active:to-blue-500/70
            ${
              isResizing
                ? '!bg-gradient-to-r !from-transparent !via-blue-500/30 !to-blue-500/70'
                : ''
            }`}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30 group-hover:bg-blue-400" />
        </div>
      )}
    </th>
  );
}
