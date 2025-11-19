
import { COLORS, TILE_SIZE, VIEW_WIDTH, VIEW_HEIGHT, getTerrainAt, getPOIAt, POD_POS } from '../constants';
import { Player, Enemy, TerrainType, POIType, Bot } from '../types';

export const drawWorld = (ctx: CanvasRenderingContext2D, player: Player, time: number) => {
  const halfW = Math.floor(VIEW_WIDTH / 2);
  const halfH = Math.floor(VIEW_HEIGHT / 2);

  // Draw Terrain
  for (let relX = -halfW; relX <= halfW; relX++) {
    for (let relY = -halfH; relY <= halfH; relY++) {
      const worldX = player.pos.x + relX;
      const worldY = player.pos.y + relY;
      
      const screenX = (relX + halfW) * TILE_SIZE;
      const screenY = (relY + halfH) * TILE_SIZE;

      const terrain = getTerrainAt(worldX, worldY);
      const seed = Math.abs((worldX * 341 + worldY * 932) % 100);

      // Base Floor
      ctx.fillStyle = COLORS.groundDark;
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = COLORS.groundLight;
      ctx.fillRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      if (terrain === TerrainType.WALL) {
        ctx.fillStyle = COLORS.wallDark;
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = COLORS.wallLight;
        ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        
        if (seed > 50) {
          ctx.strokeStyle = COLORS.neonBlue;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX + 10, screenY + 10);
          ctx.lineTo(screenX + 10, screenY + TILE_SIZE - 10);
          ctx.stroke();
        }
      } else if (terrain === TerrainType.ACID_POOL) {
        ctx.fillStyle = COLORS.acid;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(screenX + 4, screenY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.globalAlpha = 1.0;
      } else if (terrain === TerrainType.DEBRIS) {
         ctx.fillStyle = '#475569';
         ctx.beginPath();
         ctx.moveTo(screenX + 10, screenY + TILE_SIZE - 5);
         ctx.lineTo(screenX + TILE_SIZE/2, screenY + 10);
         ctx.lineTo(screenX + TILE_SIZE - 10, screenY + TILE_SIZE - 5);
         ctx.fill();
      } else {
        // POI Rendering
        const poiKey = `${worldX},${worldY}`;
        const poi = getPOIAt(worldX, worldY);
        const visited = player.visitedPOIs[poiKey];

        if (poi !== POIType.NONE) {
          // Always draw POD
          if (poi === POIType.POD) {
             drawPod(ctx, screenX, screenY, time);
          } else if (!visited) {
             drawPOI(ctx, screenX, screenY, poi, time);
          }
        } else if (seed > 90) {
            ctx.fillStyle = COLORS.rust;
            ctx.beginPath();
            ctx.arc(screenX + TILE_SIZE/2, screenY + TILE_SIZE/2, seed / 10, 0, Math.PI * 2);
            ctx.fill();
        }
      }
    }
  }

  // Draw Reserves (Base Camp)
  // If POD is visible in viewport, draw reserved bots wandering around it
  const distToPodX = POD_POS.x - player.pos.x;
  const distToPodY = POD_POS.y - player.pos.y;
  
  // Check if POD area is roughly in view
  if (Math.abs(distToPodX) < VIEW_WIDTH/2 + 2 && Math.abs(distToPodY) < VIEW_HEIGHT/2 + 2) {
    player.reserves.forEach((bot, idx) => {
       // Deterministic random wander around pod
       const offsetTime = time / 1000;
       const offsetX = Math.sin(offsetTime + idx) * 1.5;
       const offsetY = Math.cos(offsetTime * 0.8 + idx) * 1.5;
       
       const botWorldX = POD_POS.x + offsetX;
       const botWorldY = POD_POS.y + offsetY;

       const screenX = (botWorldX - player.pos.x + halfW) * TILE_SIZE;
       const screenY = (botWorldY - player.pos.y + halfH) * TILE_SIZE;
       
       // Small version of bot
       drawBotMini(ctx, screenX + TILE_SIZE/2, screenY + TILE_SIZE/2, bot, COLORS.neonGreen);
    });
  }

  // Draw Player
  const centerX = halfW * TILE_SIZE + TILE_SIZE / 2;
  const centerY = halfH * TILE_SIZE + TILE_SIZE / 2;
  const activeBot = player.team[player.activeSlot];
  drawPlayerSprite(ctx, centerX, centerY, player.facing, time, activeBot);

  // Draw Direction Arrow to Pod
  if (player.quest.stage !== 'COMPLETED') {
     drawCompass(ctx, distToPodX, distToPodY, centerX, centerY, time);
  }
};

const drawCompass = (ctx: CanvasRenderingContext2D, dx: number, dy: number, cx: number, cy: number, time: number) => {
   const dist = Math.sqrt(dx*dx + dy*dy);
   if (dist < 2) return; // Don't show if close

   const angle = Math.atan2(dy, dx);
   const radius = 120; // Distance from center of screen
   
   const arrowX = cx + Math.cos(angle) * radius;
   const arrowY = cy + Math.sin(angle) * radius;

   ctx.save();
   ctx.translate(arrowX, arrowY);
   ctx.rotate(angle);
   
   ctx.fillStyle = COLORS.pod;
   ctx.shadowBlur = 5;
   ctx.shadowColor = COLORS.pod;
   
   ctx.beginPath();
   ctx.moveTo(10, 0);
   ctx.lineTo(-10, -7);
   ctx.lineTo(-10, 7);
   ctx.fill();

   ctx.restore();
};

const drawPod = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  // The Base
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(x + 24, y + 35, 20, 8, 0, 0, Math.PI*2);
  ctx.fill();

  // The Pod
  ctx.fillStyle = COLORS.pod;
  ctx.beginPath();
  ctx.moveTo(x + 24, y + 5);
  ctx.bezierCurveTo(x + 48, y + 15, x + 48, y + 40, x + 24, y + 45);
  ctx.bezierCurveTo(x + 0, y + 40, x + 0, y + 15, x + 24, y + 5);
  ctx.fill();

  // Window
  ctx.fillStyle = '#bae6fd';
  ctx.beginPath();
  ctx.arc(x + 24, y + 20, 8, 0, Math.PI*2);
  ctx.fill();
  
  // Smoke/Steam if damaged
  const steam = Math.sin(time / 200);
  if (steam > 0) {
    ctx.fillStyle = 'rgba(200,200,200,0.3)';
    ctx.beginPath();
    ctx.arc(x + 24 + steam * 5, y + 5 - steam * 10, 5, 0, Math.PI*2);
    ctx.fill();
  }
};

const drawBotMini = (ctx: CanvasRenderingContext2D, x: number, y: number, bot: Bot, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.fillRect(x-2, y-2, 4, 2);
};

const drawPOI = (ctx: CanvasRenderingContext2D, x: number, y: number, type: POIType, time: number) => {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  if (type === POIType.CACHE) {
    const glow = Math.sin(time / 200) * 5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.neonYellow;
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(x + 12, y + 12, 24, 24);
    ctx.fillStyle = COLORS.neonYellow;
    ctx.fillRect(x + 14, y + 18 + glow/5, 20, 2);
    ctx.shadowBlur = 0;
  } else if (type === POIType.NPC) {
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 8, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillRect(cx - 3, cy - 4, 2, 2);
    ctx.fillRect(cx + 1, cy - 4, 2, 2);
    if (Math.floor(time / 500) % 2 === 0) {
      ctx.fillStyle = 'white';
      ctx.fillText('?', cx + 6, cy - 10);
    }
  } else if (type === POIType.DERELICT) {
    ctx.fillStyle = '#4b5563';
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.4);
    ctx.fillRect(-10, -8, 20, 16);
    ctx.restore();
    if (Math.random() > 0.95) {
      ctx.fillStyle = COLORS.neonYellow;
      ctx.fillRect(cx, cy, 2, 2);
    }
  }
};

const drawPlayerSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: string, time: number, bot: Bot) => {
  const bob = Math.sin(time / 200) * 2;
  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 15, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  let bodyColor = COLORS.scoutBody;
  if (bot.class === 'TANK') bodyColor = COLORS.tankBody;
  if (bot.class === 'TECH') bodyColor = COLORS.techBody;
  if (bot.class === 'ASSAULT') bodyColor = '#b91c1c';

  ctx.fillStyle = '#334155';
  if (bot.class === 'TANK') {
    ctx.fillRect(-20, -10, 10, 24);
    ctx.fillRect(10, -10, 10, 24);
  } else {
    ctx.fillRect(-18, -10, 8, 20);
    ctx.fillRect(10, -10, 8, 20);
  }

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-14, -14, 28, 24, 6);
  ctx.fill();
  
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-10, -20, 20, 12);
  
  ctx.fillStyle = bot.isDefeated ? '#ef4444' : COLORS.neonBlue;
  ctx.fillRect(-8, -18, 16, 6);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, -20);
  ctx.lineTo(8, -32);
  ctx.stroke();
  
  ctx.fillStyle = bot.isDefeated ? '#000' : COLORS.neonRed;
  ctx.beginPath();
  ctx.arc(8, -32, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

export const drawCombatScene = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, player: Player, enemy: Enemy | null) => {
  if (!enemy) return;

  const w = width * TILE_SIZE;
  const h = height * TILE_SIZE;

  // Background
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, h);
  
  // Grid Floor
  ctx.strokeStyle = COLORS.neonPurple;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  for(let i = 0; i < 20; i++) {
      let y = h/2 + Math.pow(i, 1.5) * 2; 
      if (y > h) break;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
  }
  for(let i = -10; i < 20; i++) {
      ctx.moveTo(w/2 + (i-5)*50, h/2);
      ctx.lineTo(w/2 + (i-5)*400, h);
  }
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  const activeBot = player.team[player.activeSlot];

  // -- Draw Active Bot --
  const pX = w * 0.25;
  const pY = h * 0.75;
  
  ctx.save();
  ctx.translate(pX, pY);
  ctx.scale(3.5, 3.5); 
  
  if ((activeBot.tempShield || 0) > 0) {
    ctx.strokeStyle = COLORS.neonBlue;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, -5, 22, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  let bodyColor = COLORS.scoutBody;
  if (activeBot.class === 'TANK') bodyColor = COLORS.tankBody;
  if (activeBot.class === 'TECH') bodyColor = COLORS.techBody;
  if (activeBot.class === 'ASSAULT') bodyColor = '#b91c1c';

  ctx.fillStyle = bodyColor;
  ctx.fillRect(-10, -10, 20, 18); 
  ctx.fillStyle = '#334155'; 
  ctx.fillRect(-14, -2, 4, 10); 
  ctx.fillRect(10, -2, 4, 10); 
  
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = COLORS.neonYellow;
  ctx.fillRect(-2, -2, 4, 4); 

  ctx.restore();

  // -- Draw Enemy --
  const eX = w * 0.75;
  const eY = h * 0.45;
  const float = Math.sin(time / 300) * 12;

  ctx.save();
  ctx.translate(eX, eY + float);
  // Bosses are bigger
  const scale = enemy.isBoss ? 6 : 4;
  ctx.scale(scale, scale);
  drawEnemySprite(ctx, enemy, time);
  ctx.restore();
};

const drawEnemySprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) => {
  ctx.fillStyle = COLORS.enemyBody;
  
  if (enemy.type === 'CORE_GUARDIAN') {
      // BOSS SPRITE
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI*2);
      ctx.fill();
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI*2);
      ctx.stroke();

      // Red Eye
      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 8 + Math.sin(time/100)*2, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
  }
  else if (enemy.type === 'SCRAP_DRONE') {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(10, 5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.neonRed;
      ctx.beginPath();
      ctx.arc(0, -2, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#aaa';
      ctx.beginPath();
      ctx.moveTo(-15, -10); ctx.lineTo(15, -10);
      ctx.stroke();

  } else if (enemy.type === 'HEAVY_MECH') {
      ctx.fillRect(-12, -14, 24, 28);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-16, -12, 4, 10);
      ctx.fillRect(12, -12, 4, 10);
      ctx.fillStyle = COLORS.neonRed;
      ctx.fillRect(-10, -8, 20, 6);
      ctx.fillStyle = '#333';
      ctx.fillRect(-8, 14, 6, 10);
      ctx.fillRect(2, 14, 6, 10);

  } else if (enemy.type === 'NANITE_SWARM') {
      ctx.fillStyle = '#a855f7';
      for(let i=0; i<5; i++) {
        const ox = Math.sin(time/100 + i) * 8;
        const oy = Math.cos(time/120 + i) * 8;
        ctx.beginPath();
        ctx.arc(ox, oy, 4, 0, Math.PI*2);
        ctx.fill();
      }

  } else if (enemy.type === 'JUNKER_BEHEMOTH') {
     ctx.fillStyle = '#3f3f46';
     ctx.beginPath();
     ctx.arc(0, 0, 18, 0, Math.PI*2, false); 
     ctx.fill();
     ctx.fillStyle = '#18181b';
     ctx.fillRect(-22, 5, 44, 10);
     ctx.fillStyle = '#b91c1c';
     ctx.fillRect(-8, -15, 16, 10);
     ctx.strokeStyle = COLORS.neonYellow;
     ctx.lineWidth = 2;
     ctx.beginPath();
     ctx.moveTo(0, -15); ctx.lineTo(0, -25);
     ctx.stroke();

  } else {
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(0,0, 12, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = COLORS.neonGreen;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-15, 0); ctx.lineTo(15, 0);
      ctx.moveTo(0, -15); ctx.lineTo(0, 15);
      ctx.stroke();
  }
}
