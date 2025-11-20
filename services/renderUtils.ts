import { COLORS, TILE_SIZE, VIEW_WIDTH, VIEW_HEIGHT, getTerrainAt, getPOIAt, POD_POS, GUARDIAN_POS } from '../constants';
import { Player, Enemy, TerrainType, POIType, Bot, CombatEffect } from '../types';

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

        if (poi === POIType.POD) {
             drawPod(ctx, screenX, screenY, time);
        } else if (player.quest.stage === 'DEFEAT_GUARDIAN' && worldX === GUARDIAN_POS.x && worldY === GUARDIAN_POS.y) {
             // Draw Guardian Boss
             drawBossSprite(ctx, screenX + TILE_SIZE/2, screenY + TILE_SIZE/2, time);
        } else if (poi !== POIType.NONE && !visited) {
             drawPOI(ctx, screenX, screenY, poi, time);
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
  const distToPodX = POD_POS.x - player.pos.x;
  const distToPodY = POD_POS.y - player.pos.y;
  
  if (Math.abs(distToPodX) < VIEW_WIDTH/2 + 2 && Math.abs(distToPodY) < VIEW_HEIGHT/2 + 2) {
    player.reserves.forEach((bot, idx) => {
       const offsetTime = time / 1000;
       const offsetX = Math.sin(offsetTime + idx) * 1.5;
       const offsetY = Math.cos(offsetTime * 0.8 + idx) * 1.5;
       
       const botWorldX = POD_POS.x + offsetX;
       const botWorldY = POD_POS.y + offsetY;

       const screenX = (botWorldX - player.pos.x + halfW) * TILE_SIZE;
       const screenY = (botWorldY - player.pos.y + halfH) * TILE_SIZE;
       
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

const drawBossSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
   const pulse = Math.sin(time / 100) * 3;
   ctx.fillStyle = '#000';
   ctx.beginPath();
   ctx.arc(x, y, 24, 0, Math.PI*2);
   ctx.fill();

   ctx.strokeStyle = '#ef4444';
   ctx.lineWidth = 3;
   ctx.beginPath();
   ctx.arc(x, y, 20 + pulse, 0, Math.PI*2);
   ctx.stroke();

   ctx.fillStyle = '#ef4444';
   ctx.beginPath();
   ctx.arc(x, y, 10, 0, Math.PI*2);
   ctx.fill();
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

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 15, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bot Color and Shape Logic based on CLASS
  let bodyColor = COLORS.scoutBody;
  if (bot.class === 'TANK') bodyColor = COLORS.tankBody;
  if (bot.class === 'TECH') bodyColor = COLORS.techBody;
  if (bot.class === 'ASSAULT') bodyColor = '#b91c1c';

  // -- Legs / Movement --
  ctx.fillStyle = '#334155';
  if (bot.class === 'TANK') {
    ctx.fillRect(-20, -10, 10, 24);
    ctx.fillRect(10, -10, 10, 24);
  } else if (bot.class === 'TECH') {
    ctx.fillStyle = COLORS.neonBlue;
    ctx.beginPath();
    ctx.moveTo(-6, 12); ctx.lineTo(0, 20); ctx.lineTo(6, 12);
    ctx.fill();
  } else {
    ctx.fillRect(-18, -10, 8, 20);
    ctx.fillRect(10, -10, 8, 20);
  }

  // -- Main Body --
  ctx.fillStyle = bodyColor;
  if (bot.class === 'TECH') {
    ctx.beginPath();
    ctx.arc(0, -10, 18, 0, Math.PI*2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 24, 6);
    ctx.fill();
  }
  
  // -- Face / Screen --
  ctx.fillStyle = '#1e293b';
  if (bot.class === 'TECH') {
     ctx.beginPath();
     ctx.arc(0, -10, 10, 0, Math.PI*2);
     ctx.fill();
  } else {
     ctx.fillRect(-10, -20, 20, 12);
  }
  
  // -- Eyes --
  ctx.fillStyle = bot.isDefeated ? '#ef4444' : COLORS.neonBlue;
  if (bot.class === 'ASSAULT') ctx.fillStyle = COLORS.neonRed;
  
  if (bot.class === 'TECH') {
     ctx.beginPath();
     ctx.arc(0, -10, 4, 0, Math.PI*2);
     ctx.fill();
  } else {
     ctx.fillRect(-8, -18, 16, 6);
  }

  // -- Antenna / Extras --
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (bot.class === 'TANK') {
     ctx.moveTo(-10, -14); ctx.lineTo(-10, -22);
  } else {
     ctx.moveTo(8, -20); ctx.lineTo(8, -32);
  }
  ctx.stroke();
  
  ctx.fillStyle = bot.isDefeated ? '#000' : COLORS.neonRed;
  ctx.beginPath();
  if (bot.class === 'TANK') ctx.arc(-10, -22, 2, 0, Math.PI * 2);
  else ctx.arc(8, -32, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

export const drawCombatScene = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, player: Player, enemy: Enemy | null, combatEffect: CombatEffect | null) => {
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

  // Coordinates
  const pX = w * 0.25;
  const pY = h * 0.75;
  const eX = w * 0.75;
  const eY = h * 0.45;

  // -- Draw Active Bot --
  ctx.save();
  ctx.translate(pX, pY);
  ctx.scale(3.5, 3.5); 
  drawBotCombatSprite(ctx, activeBot, time);
  
  if ((activeBot.tempShield || 0) > 0) {
    ctx.strokeStyle = COLORS.neonBlue;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, -5, 22, 0, Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
  ctx.restore();

  // -- Draw Enemy --
  const float = Math.sin(time / 300) * 12;
  ctx.save();
  ctx.translate(eX, eY + float);
  const scale = enemy.isBoss ? 6 : 4;
  ctx.scale(scale, scale);
  drawEnemySprite(ctx, enemy, time);
  ctx.restore();

  // -- Combat Effects --
  if (combatEffect) {
      drawCombatEffect(ctx, combatEffect, pX, pY - 20, eX, eY + float, time);
  }
};

const drawCombatEffect = (ctx: CanvasRenderingContext2D, effect: CombatEffect, startX: number, startY: number, endX: number, endY: number, time: number) => {
    const elapsed = time - effect.startTime;
    if (elapsed > effect.duration) return;
    const progress = elapsed / effect.duration;

    const sx = effect.source === 'PLAYER' ? startX : endX;
    const sy = effect.source === 'PLAYER' ? startY : endY;
    const tx = effect.source === 'PLAYER' ? endX : startX;
    const ty = effect.source === 'PLAYER' ? endY : startY;

    if (effect.type === 'LASER') {
        ctx.strokeStyle = COLORS.neonRed;
        ctx.lineWidth = 4 * (1 - progress);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        
        // Hit flash
        if (progress > 0.5) {
           ctx.fillStyle = '#fff';
           ctx.beginPath();
           ctx.arc(tx, ty, 20 * progress, 0, Math.PI*2);
           ctx.fill();
        }
    } else if (effect.type === 'RAILGUN') {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 6 * (1-progress);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.beginPath();
        ctx.arc(tx, ty, 40 * progress, 0, Math.PI*2);
        ctx.fill();

    } else if (effect.type === 'ELECTRIC') {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        
        // Zig Zag
        const segments = 10;
        for(let i=1; i<=segments; i++) {
           const t = i / segments;
           const cx = sx + (tx - sx) * t;
           const cy = sy + (ty - sy) * t;
           const jitter = Math.random() * 40 - 20;
           ctx.lineTo(cx + jitter, cy + jitter);
        }
        ctx.stroke();

    } else if (effect.type === 'EXPLOSION') {
        const size = 100 * Math.sin(progress * Math.PI);
        ctx.fillStyle = COLORS.neonRed;
        ctx.beginPath();
        ctx.arc(tx, ty, size, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = COLORS.neonYellow;
        ctx.beginPath();
        ctx.arc(tx, ty, size * 0.7, 0, Math.PI*2);
        ctx.fill();

    } else if (effect.type === 'SHIELD') {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.beginPath();
        ctx.arc(sx, sy, 50 + Math.sin(progress*10)*5, 0, Math.PI*2);
        ctx.fill();
        
        ctx.strokeStyle = COLORS.neonBlue;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 50 + Math.sin(progress*10)*5, 0, Math.PI*2);
        ctx.stroke();

    } else if (effect.type === 'REPAIR') {
        ctx.fillStyle = COLORS.neonGreen;
        ctx.font = '20px monospace';
        ctx.fillText('+', sx, sy - (progress * 50));
        ctx.fillText('+', sx + 20, sy - (progress * 60));
        ctx.fillText('+', sx - 20, sy - (progress * 40));
    } else if (effect.type === 'MELEE') {
        // Dash effect
        const cx = sx + (tx - sx) * progress;
        const cy = sy + (ty - sy) * progress;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI*2);
        ctx.fill();
        
        if (progress > 0.8) {
           // Impact
           ctx.strokeStyle = '#fff';
           ctx.lineWidth = 3;
           ctx.beginPath();
           ctx.arc(tx, ty, 30, 0, Math.PI*2);
           ctx.stroke();
        }
    }
};

const drawBotCombatSprite = (ctx: CanvasRenderingContext2D, bot: Bot, time: number) => {
    if (bot.class === 'TANK') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(-18, 0, 10, 12); 
        ctx.fillRect(8, 0, 10, 12);   
        
        ctx.fillStyle = COLORS.tankBody;
        ctx.fillRect(-14, -16, 28, 20);
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-10, -12, 20, 12);
        
        ctx.fillStyle = COLORS.neonYellow;
        ctx.fillRect(-8, -8, 16, 4);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, -16); ctx.lineTo(8, -22);
        ctx.stroke();
        
    } else if (bot.class === 'TECH') {
        const float = Math.sin(time / 300) * 3;
        ctx.translate(0, float);
        
        ctx.fillStyle = COLORS.neonBlue;
        ctx.beginPath();
        ctx.moveTo(-6, 10); ctx.lineTo(0, 16); ctx.lineTo(6, 10);
        ctx.fill();
        
        ctx.fillStyle = COLORS.techBody;
        ctx.beginPath();
        ctx.arc(0, -5, 14, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(0, -19); ctx.lineTo(0, -26);
        ctx.stroke();
        ctx.fillStyle = COLORS.neonRed;
        ctx.beginPath();
        ctx.arc(0, -28, 2, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, -5, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = COLORS.neonGreen;
        ctx.beginPath();
        ctx.arc(0, -5, 2, 0, Math.PI*2);
        ctx.fill();

    } else if (bot.class === 'ASSAULT') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(-12, 2, 6, 10); 
        ctx.fillRect(6, 2, 6, 10);  
        
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(-10, -14);
        ctx.lineTo(10, -14);
        ctx.lineTo(8, 4);
        ctx.lineTo(-8, 4);
        ctx.fill();
        
        ctx.fillStyle = '#475569';
        ctx.fillRect(-16, -8, 6, 8); 
        ctx.fillRect(10, -8, 6, 8);  
        ctx.fillStyle = '#000';
        ctx.fillRect(-16, 0, 6, 2); 
        ctx.fillRect(10, 0, 6, 2); 
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, -10, 8, 8);
        ctx.fillStyle = COLORS.neonRed;
        ctx.fillRect(-1, -8, 2, 4);

    } else {
        // SCOUT
        ctx.fillStyle = COLORS.scoutBody;
        ctx.fillRect(-10, -10, 20, 18); 
        ctx.fillStyle = '#334155'; 
        ctx.fillRect(-14, -2, 4, 10); 
        ctx.fillRect(10, -2, 4, 10); 
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, -6, 12, 12);
        ctx.fillStyle = COLORS.neonYellow;
        ctx.fillRect(-2, -2, 4, 4); 
        
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(6, -10); ctx.lineTo(6, -18);
        ctx.stroke();
        ctx.fillStyle = COLORS.neonRed;
        ctx.beginPath();
        ctx.arc(6, -18, 2, 0, Math.PI*2);
        ctx.fill();
    }
};

const drawEnemySprite = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) => {
  ctx.fillStyle = COLORS.enemyBody;
  
  if (enemy.type === 'CORE_GUARDIAN') {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI*2);
      ctx.fill();
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI*2);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 8 + Math.sin(time/100)*2, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
  }
  else if (enemy.type === 'SCRAP_DRONE' || enemy.type === 'TESLA_DROID') {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(10, 5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = enemy.type === 'TESLA_DROID' ? COLORS.neonPurple : COLORS.neonRed;
      ctx.beginPath();
      ctx.arc(0, -2, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#aaa';
      ctx.beginPath();
      ctx.moveTo(-15, -10); ctx.lineTo(15, -10);
      ctx.stroke();

  } else if (enemy.type === 'HEAVY_MECH' || enemy.type === 'SHIELD_BREAKER') {
      ctx.fillRect(-12, -14, 24, 28);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-16, -12, 4, 10);
      ctx.fillRect(12, -12, 4, 10);
      ctx.fillStyle = enemy.type === 'SHIELD_BREAKER' ? '#f59e0b' : COLORS.neonRed;
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
};