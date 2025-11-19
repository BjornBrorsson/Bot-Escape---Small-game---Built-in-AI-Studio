
import React, { useRef, useEffect } from 'react';
import { VIEW_WIDTH, VIEW_HEIGHT, TILE_SIZE } from '../constants';
import { drawWorld, drawCombatScene } from '../services/renderUtils';
import { GameState, Player, Enemy } from '../types';

interface GameViewProps {
  gameState: GameState;
  player: Player;
  enemy: Enemy | null;
}

const GameView: React.FC<GameViewProps> = ({ gameState, player, enemy }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

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
        drawCombatScene(ctx, VIEW_WIDTH, VIEW_HEIGHT, time, player, enemy);
      } else {
        drawWorld(ctx, player, time);
      }
      
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, player, enemy]);

  return (
    <div className="relative w-full aspect-[4/3] border-4 border-slate-700 bg-black rounded-lg shadow-2xl overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WWCAAAAE0lEQVQIW2NkYGD4z8DAwMgAAQAAYgcDAP4n76gAAAAASUVORK5CYII=')] opacity-10 mix-blend-overlay z-10"></div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black/20 z-10"></div>
      
      <div className="absolute inset-0 pointer-events-none bg-white opacity-[0.02] z-20"></div>
    </div>
  );
};

export default GameView;
