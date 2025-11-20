import React, { useRef, useEffect } from 'react';
import { VIEW_WIDTH, VIEW_HEIGHT, TILE_SIZE } from '../constants';
import { drawWorld, drawCombatScene } from '../services/renderUtils';
import { GameState, Player, Enemy, CombatEffect } from '../types';

interface GameViewProps {
  gameState: GameState;
  player: Player;
  enemy: Enemy | null;
  combatEffect: CombatEffect | null;
  onNavigate: (targetX: number, targetY: number) => void;
  onInteract: () => void;
}

const GameView: React.FC<GameViewProps> = ({ gameState, player, enemy, combatEffect, onNavigate, onInteract }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = VIEW_WIDTH * TILE_SIZE;
    const height = VIEW_HEIGHT * TILE_SIZE;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%'; 
    canvas.style.height = 'auto'; 
    
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      if (gameState === GameState.COMBAT) {
        drawCombatScene(ctx, VIEW_WIDTH, VIEW_HEIGHT, time, player, enemy, combatEffect);
      } else {
        drawWorld(ctx, player, time);
      }
      
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, player, enemy, combatEffect]);

  // Input Handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState !== GameState.EXPLORING) return;
    e.preventDefault(); 
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const tileScreenX = (clickX / rect.width) * VIEW_WIDTH;
    const tileScreenY = (clickY / rect.height) * VIEW_HEIGHT;
    
    const offsetX = Math.floor(tileScreenX) - Math.floor(VIEW_WIDTH / 2);
    const offsetY = Math.floor(tileScreenY) - Math.floor(VIEW_HEIGHT / 2);
    
    const targetX = player.pos.x + offsetX;
    const targetY = player.pos.y + offsetY;

    if (offsetX === 0 && offsetY === 0) {
       onInteract();
    } else {
       onNavigate(targetX, targetY);
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] border-4 border-slate-700 bg-black rounded-lg shadow-2xl overflow-hidden touch-none">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full cursor-pointer"
        onPointerDown={handlePointerDown}
      />
      
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WWCAAAAE0lEQVQIW2NkYGD4z8DAwMgAAQAAYgcDAP4n76gAAAAASUVORK5CYII=')] opacity-10 mix-blend-overlay z-10"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black/20 z-10"></div>
      
      {gameState === GameState.EXPLORING && (
         <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] text-white/30 uppercase tracking-widest">
            Tap Tile to Move
         </div>
      )}
    </div>
  );
};

export default GameView;