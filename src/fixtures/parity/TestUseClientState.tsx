/**
 * Test fixture for useClientState hook
 * useClientState is for client-only state that doesn't sync to server
 * Used for UI-only state like hover effects, local animations, etc.
 */

import { useClientState } from '@minimact/core';

export function TestUseClientState() {
  // Client-only state - doesn't trigger server re-render
  const [isHovered, setIsHovered] = useClientState(false);
  const [localPosition, setLocalPosition] = useClientState({ x: 0, y: 0 });
  const [animationFrame, setAnimationFrame] = useClientState(0);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    setLocalPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={isHovered ? 'card hovered' : 'card'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <h2>Client State Test</h2>
      <p>Position: {localPosition.x}, {localPosition.y}</p>
      <p>Animation Frame: {animationFrame}</p>
      {isHovered && <span className="tooltip">Hovering!</span>}
    </div>
  );
}
