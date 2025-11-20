import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Enemy, CombatLog, TerrainType, Module, POIType, Bot, Item, Position, CombatEffect, PlayerStats } from './types';
import { INITIAL_PLAYER_STATE, ENCOUNTER_CHANCE_BASE, getTerrainAt, getPOIAt, BOT_CLASSES, ITEMS_DB, POD_POS, GUARDIAN_POS, BOSS_ENEMY, UNIQUE_NAMES, PERSONALITIES, SKILLS_DB, ACID_DAMAGE, DAMAGE_TYPE_CHART, NPC_TUTORIALS, SCORE_WEIGHTS } from './constants';
import GameView from './components/GameView';
import CombatInterface from './components/CombatInterface';
import ExplorationInterface from './components/ExplorationInterface';

const createEnemy = (playerLevel: number): Enemy => {
  const r = Math.random();
  if (playerLevel < 2) {
     if (r > 0.7) return { type: 'HEAVY_MECH', class: 'TANK', name: 'Heavy Mech', hp: 80, maxHp: 80, xpValue: 40 };
     return { type: 'SCRAP_DRONE', class: 'SCOUT', name: 'Scrap Drone', hp: 40, maxHp: 40, xpValue: 20 };
  }
  if (r > 0.9) return { type: 'JUNKER_BEHEMOTH', class: 'TANK', name: 'Junker Behemoth', hp: 200 + (playerLevel*10), maxHp: 200 + (playerLevel*10), xpValue: 100 };
  if (r > 0.8) return { type: 'SHIELD_BREAKER', class: 'ASSAULT', name: 'Shield Breaker', hp: 100 + (playerLevel*10), maxHp: 100 + (playerLevel*10), xpValue: 60 };
  if (r > 0.7) return { type: 'TESLA_DROID', class: 'TECH', name: 'Tesla Droid', hp: 70 + (playerLevel*8), maxHp: 70 + (playerLevel*8), xpValue: 50 };
  if (r > 0.6) return { type: 'SNIPER_BOT', class: 'SCOUT', name: 'Sniper Bot', hp: 50 + (playerLevel*5), maxHp: 50 + (playerLevel*5), xpValue: 45 };
  if (r > 0.3) return { type: 'NANITE_SWARM', class: 'TECH', name: 'Nanite Swarm', hp: 60 + (playerLevel*5), maxHp: 60 + (playerLevel*5), xpValue: 35 };
  return { type: 'SCRAP_DRONE', class: 'SCOUT', name: 'Scrap Drone', hp: 50 + (playerLevel*5), maxHp: 50 + (playerLevel*5), xpValue: 25 };
};

const findPath = (start: Position, end: Position): Position[] | null => {
  const queue: { pos: Position, path: Position[] }[] = [{ pos: start, path: [] }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  let iterations = 0;
  const MAX_ITERATIONS = 1000; 

  while (queue.length > 0) {
    iterations++;
    if (iterations > MAX_ITERATIONS) return null;

    const { pos, path } = queue.shift()!;

    if (pos.x === end.x && pos.y === end.y) {
      return path;
    }

    const neighbors = [
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
    ];

    for (const n of neighbors) {
      const key = `${n.x},${n.y}`;
      if (!visited.has(key)) {
        const t = getTerrainAt(n.x, n.y);
        if (t !== TerrainType.WALL) {
          visited.add(key);
          queue.push({ pos: n, path: [...path, n] });
        }
      }
    }
  }
  return null;
};

const calculateScore = (stats: PlayerStats, isVictory: boolean) => {
  let score = 0;
  score += isVictory ? SCORE_WEIGHTS.WIN_BONUS : SCORE_WEIGHTS.DEFEAT;
  score += stats.scrapsCollected * SCORE_WEIGHTS.SCRAP;
  score += stats.botsRecruited * SCORE_WEIGHTS.RECRUIT;
  score += Math.floor(stats.damageDealt * SCORE_WEIGHTS.DAMAGE_DEALT);
  score += Math.floor(stats.healingDone * SCORE_WEIGHTS.HEAL);
  score += stats.modulesInstalled * SCORE_WEIGHTS.MODULE;
  score += stats.questsCompleted * SCORE_WEIGHTS.QUEST_STEP;
  score += stats.botsLost * SCORE_WEIGHTS.BOT_LOST;
  score += stats.stepsTaken * SCORE_WEIGHTS.STEP;
  return Math.max(0, score);
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.EXPLORING);
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER_STATE);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null); 
  const [introShown, setIntroShown] = useState(false);
  const [interactionLabel, setInteractionLabel] = useState<string | null>(null);
  const [combatEffect, setCombatEffect] = useState<CombatEffect | null>(null);

  const movementPathRef = useRef<Position[]>([]);
  const movementTimerRef = useRef<number | null>(null);

  const addLog = (message: string, type: CombatLog['type']) => {
    setLogs(prev => [...prev, { message, type, id: Date.now() + Math.random() }]);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  // Update Stats Helper
  const updateStats = (updater: (stats: PlayerStats) => Partial<PlayerStats>) => {
    setPlayer(prev => ({
       ...prev,
       stats: { ...prev.stats, ...updater(prev.stats) }
    }));
  };

  useEffect(() => {
    if (!introShown) {
      setTimeout(() => {
        showMessage("CRITICAL ERROR... SYSTEM REBOOT... ESCAPE POD LOCATED.");
        setIntroShown(true);
      }, 500);
    }
  }, [introShown]);

  const activeBot = player.team[player.activeSlot];
  
  const updateActiveBot = (updater: (bot: Bot) => Bot) => {
    setPlayer(prev => {
      const newTeam = [...prev.team];
      newTeam[prev.activeSlot] = updater(newTeam[prev.activeSlot]);
      return { ...prev, team: newTeam };
    });
  };

  // Interaction Check Loop
  useEffect(() => {
     if (gameState !== GameState.EXPLORING) {
        setInteractionLabel(null);
        return;
     }

     const { x, y } = player.pos;
     const poi = getPOIAt(x, y);
     
     if (poi === POIType.POD) {
        setInteractionLabel("ACCESS POD");
        return;
     }
     
     // Check Guardian
     if (player.quest.stage === 'DEFEAT_GUARDIAN') {
       const distG = Math.abs(x - GUARDIAN_POS.x) + Math.abs(y - GUARDIAN_POS.y);
       if (distG <= 1) {
         setInteractionLabel("FIGHT GUARDIAN");
         return;
       }
     }

     const neighbors = [
       { x, y: y - 1 }, { x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }
     ];
     
     for(const n of neighbors) {
        const nPoi = getPOIAt(n.x, n.y);
        const key = `${n.x},${n.y}`;
        if (player.visitedPOIs[key]) continue;

        if (nPoi === POIType.CACHE) {
            setInteractionLabel("OPEN CACHE");
            return;
        }
        if (nPoi === POIType.NPC) {
            setInteractionLabel("TALK");
            return;
        }
        if (nPoi === POIType.DERELICT) {
            setInteractionLabel("SALVAGE / REPAIR");
            return;
        }
     }
     setInteractionLabel(null);

  }, [player.pos, player.visitedPOIs, gameState, player.quest.stage]);

  const stopMovement = () => {
     if (movementTimerRef.current) {
        window.clearInterval(movementTimerRef.current);
        movementTimerRef.current = null;
     }
     movementPathRef.current = [];
  };

  const executeMoveStep = useCallback((targetPos: Position) => {
      setPlayer(prev => {
          const dx = targetPos.x - prev.pos.x;
          const dy = targetPos.y - prev.pos.y;
          let facing = prev.facing;
          if (dx > 0) facing = 'RIGHT';
          else if (dx < 0) facing = 'LEFT';
          else if (dy > 0) facing = 'DOWN';
          else if (dy < 0) facing = 'UP';

          const terrain = getTerrainAt(targetPos.x, targetPos.y);
          if (terrain === TerrainType.WALL) {
            stopMovement();
            return { ...prev, facing };
          }

          let nextTeam = [...prev.team];
          
          if (terrain === TerrainType.ACID_POOL) {
            const active = nextTeam[prev.activeSlot];
            if (active.hp > 0 && !active.isDefeated) {
               active.hp = Math.max(0, active.hp - ACID_DAMAGE);
               if (active.hp === 0) {
                 active.isDefeated = true;
                 showMessage("DANGER: Acid Damage! Unit Disabled.");
                 stopMovement(); 
               } else {
                 showMessage("WARNING: Corrosive Environment.");
               }
            }
          }

          const distToPod = Math.sqrt(Math.pow(targetPos.x - POD_POS.x, 2) + Math.pow(targetPos.y - POD_POS.y, 2));
          const currentBot = nextTeam[prev.activeSlot];
          const hasScanner = currentBot.modules.some(m => m.effectId === 'SCANNER');
          const chance = distToPod < 5 ? 0 : hasScanner ? ENCOUNTER_CHANCE_BASE * 0.6 : ENCOUNTER_CHANCE_BASE;

          if (currentBot.hp > 0 && Math.random() < chance) {
            stopMovement();
            const newEnemy = createEnemy(currentBot.level);
            setEnemy(newEnemy);
            setGameState(GameState.COMBAT);
            setLogs([]); 
            addLog(`ALERT: ${newEnemy.name} approaching!`, 'info');
            return { ...prev, team: nextTeam, pos: targetPos, facing, stats: { ...prev.stats, stepsTaken: prev.stats.stepsTaken + 1 } };
          }

          return { ...prev, team: nextTeam, pos: targetPos, facing, stats: { ...prev.stats, stepsTaken: prev.stats.stepsTaken + 1 } };
      });
  }, []);

  const handleNavigate = (targetX: number, targetY: number) => {
      if (gameState !== GameState.EXPLORING) return;
      const path = findPath(player.pos, { x: targetX, y: targetY });
      if (path && path.length > 0) {
          movementPathRef.current = path;
          if (movementTimerRef.current) clearInterval(movementTimerRef.current);
          movementTimerRef.current = window.setInterval(() => {
              if (movementPathRef.current.length === 0) {
                  stopMovement();
                  return;
              }
              const nextPos = movementPathRef.current.shift()!;
              executeMoveStep(nextPos);
          }, 200); 
      } else {
          showMessage("Path blocked.");
      }
  };

  const handleInteract = () => {
    if (gameState !== GameState.EXPLORING) return;
    stopMovement(); 

    const { x, y } = player.pos;
    
    // --- BOSS INTERACTION ---
    if (player.quest.stage === 'DEFEAT_GUARDIAN') {
       if (Math.abs(x - GUARDIAN_POS.x) + Math.abs(y - GUARDIAN_POS.y) <= 1) {
          setEnemy(BOSS_ENEMY);
          setGameState(GameState.COMBAT);
          setLogs([]);
          addLog("WARNING: CORE GUARDIAN ENGAGED", 'danger');
          return;
       }
    }

    // --- POD ---
    if (x === POD_POS.x && y === POD_POS.y) {
       if (player.quest.stage === 'FIND_POD') {
          showMessage("Pod Systems Critical. Needs 3 Hyperdrive Flux parts.");
          setPlayer(p => ({ ...p, quest: { ...p.quest, stage: 'GATHER_PARTS' } }));
          updateStats(s => ({ questsCompleted: s.questsCompleted + 1 }));
       } else if (player.quest.stage === 'GATHER_PARTS') {
          if (player.quest.partsFound >= player.quest.partsNeeded) {
             showMessage("Parts Installed. GUARDIAN SIGNAL DETECTED NEARBY.");
             setPlayer(p => ({ ...p, quest: { ...p.quest, stage: 'DEFEAT_GUARDIAN' } }));
             updateStats(s => ({ questsCompleted: s.questsCompleted + 1 }));
          } else {
             showMessage(`Needs Hyperdrive Flux. Found: ${player.quest.partsFound}/${player.quest.partsNeeded}`);
          }
       } else if (player.quest.stage === 'DEFEAT_GUARDIAN') {
          showMessage("The Guardian blocks the launch sequence! It is waiting outside.");
       } else if (player.quest.stage === 'REPAIR_POD') {
          if (player.quest.hasOmniTool) {
             setGameState(GameState.VICTORY);
             setPlayer(p => ({ ...p, quest: { ...p.quest, stage: 'COMPLETED' } }));
             updateStats(s => ({ questsCompleted: s.questsCompleted + 1 }));
          } else {
             showMessage("Need Omni-Tool to initiate launch.");
          }
       }
       return;
    }

    let targetPOI = getPOIAt(x, y); 
    let targetKey = `${x},${y}`;

    if (targetPOI === POIType.NONE || player.visitedPOIs[targetKey]) {
        const neighbors = [
           { x, y: y - 1 }, { x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }
        ];
        for(const n of neighbors) {
            const p = getPOIAt(n.x, n.y);
            const k = `${n.x},${n.y}`;
            if (p !== POIType.NONE && !player.visitedPOIs[k]) {
                targetPOI = p;
                targetKey = k;
                break;
            }
        }
    }

    if (player.visitedPOIs[targetKey] || targetPOI === POIType.NONE) {
       showMessage("Nothing to interact with.");
       return;
    }

    if (targetPOI === POIType.CACHE) {
      const dist = Math.sqrt(x*x + y*y); 
      const isQuestPart = player.quest.stage === 'GATHER_PARTS' && Math.random() < (dist / 50) && player.quest.partsFound < player.quest.partsNeeded;
      
      if (isQuestPart) {
          showMessage("Found Hyperdrive Flux!");
          setPlayer(prev => ({
             ...prev,
             visitedPOIs: { ...prev.visitedPOIs, [targetKey]: true },
             quest: { ...prev.quest, partsFound: prev.quest.partsFound + 1 },
             inventory: [...prev.inventory, ITEMS_DB.QUEST_PART]
          }));
          updateStats(s => ({ scrapsCollected: s.scrapsCollected + 10 })); // Bonus stats
      } else {
          const foundScrap = Math.floor(Math.random() * 50) + 20;
          setPlayer(prev => ({
            ...prev,
            scrap: prev.scrap + foundScrap,
            visitedPOIs: { ...prev.visitedPOIs, [targetKey]: true }
          }));
          showMessage(`Cache opened: Found ${foundScrap} Scrap!`);
          updateStats(s => ({ scrapsCollected: s.scrapsCollected + foundScrap }));
      }
    }
    else if (targetPOI === POIType.NPC) {
       const msg = NPC_TUTORIALS[Math.floor(Math.random() * NPC_TUTORIALS.length)];
       showMessage(`NPC: "${msg}"`);
    }
    else if (targetPOI === POIType.DERELICT) {
      const recruitCost = 50;
      if (player.scrap >= recruitCost) {
         const classes = ['ASSAULT', 'TANK', 'TECH'];
         const rndClass = classes[Math.floor(Math.random() * classes.length)];
         const template = BOT_CLASSES[rndClass as keyof typeof BOT_CLASSES];
         const name = `${UNIQUE_NAMES[Math.floor(Math.random() * UNIQUE_NAMES.length)]}`;
         const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
         
         const newBot: Bot = {
             id: `bot_${Date.now()}`,
             name: name,
             class: rndClass as any,
             hp: template.hp,
             maxHp: template.hp,
             level: 1,
             xp: 0,
             maxXp: 100,
             modules: [],
             activeSkills: [...template.startingSkills],
             storedSkills: [],
             isDefeated: false,
             personality
         };

         setPlayer(prev => {
             const fullTeam = prev.team.length >= 3;
             return {
                 ...prev,
                 scrap: prev.scrap - recruitCost,
                 team: fullTeam ? prev.team : [...prev.team, newBot],
                 reserves: fullTeam ? [...prev.reserves, newBot] : prev.reserves,
                 visitedPOIs: { ...prev.visitedPOIs, [targetKey]: true }
             };
         });
         showMessage(`Recruited ${name}.`);
         updateStats(s => ({ botsRecruited: s.botsRecruited + 1 }));
      } else {
          showMessage(`Need ${recruitCost} Scrap to repair. Salvaged parts instead.`);
           setPlayer(prev => ({
             ...prev,
             scrap: prev.scrap + 15,
             visitedPOIs: { ...prev.visitedPOIs, [targetKey]: true }
           }));
           updateStats(s => ({ scrapsCollected: s.scrapsCollected + 15 }));
      }
    }
  };

  const handleSwitchBot = (index: number) => {
    if (index >= 0 && index < player.team.length && !player.team[index].isDefeated) {
      setPlayer(p => ({ ...p, activeSlot: index }));
    }
  };

  const handleSwapReserve = (teamIdx: number, reserveIdx: number) => {
     setPlayer(prev => {
        const newTeam = [...prev.team];
        const newReserves = [...prev.reserves];

        if (teamIdx !== -1 && reserveIdx === -1) {
           if (newTeam.length <= 1) {
              showMessage("Cannot send last bot to reserves!");
              return prev;
           }
           const [bot] = newTeam.splice(teamIdx, 1);
           newReserves.push(bot);
           let newActive = prev.activeSlot;
           if (newActive >= newTeam.length) newActive = 0;
           return { ...prev, team: newTeam, reserves: newReserves, activeSlot: newActive };
        } 
        else if (teamIdx === -1 && reserveIdx !== -1) {
           if (newTeam.length >= 3) {
              showMessage("Squad full (Max 3).");
              return prev;
           }
           const [bot] = newReserves.splice(reserveIdx, 1);
           newTeam.push(bot);
           return { ...prev, team: newTeam, reserves: newReserves };
        }
        return prev;
     });
  };

  const handleEquipSkill = (skillId: string, isEquipping: boolean) => {
     setPlayer(prev => {
       const newTeam = [...prev.team];
       const bot = newTeam[prev.activeSlot];
       if (isEquipping) {
          if (bot.activeSkills.length >= 3) return prev;
          bot.storedSkills = bot.storedSkills.filter(id => id !== skillId);
          bot.activeSkills.push(skillId);
       } else {
          bot.activeSkills = bot.activeSkills.filter(id => id !== skillId);
          bot.storedSkills.push(skillId);
       }
       return { ...prev, team: newTeam };
     });
  };

  const handleUseItem = (item: Item, botIndex: number) => {
    setPlayer(prev => {
      const newInventory = prev.inventory.map(i => i.id === item.id ? { ...i, count: i.count - 1 } : i).filter(i => i.count > 0);
      const newTeam = [...prev.team];
      const bot = newTeam[botIndex];
      let healed = 0;

      if (item.effect === 'HEAL') {
        if (bot.isDefeated) return prev; 
        healed = Math.min(50, bot.maxHp - bot.hp);
        bot.hp = Math.min(bot.maxHp, bot.hp + item.value);
      } else if (item.effect === 'REVIVE') {
        if (!bot.isDefeated) return prev;
        bot.isDefeated = false;
        bot.hp = Math.floor(bot.maxHp * item.value);
        healed = bot.hp;
      } else if (item.effect === 'XP') {
        bot.xp += item.value;
        if (bot.xp >= bot.maxXp) {
          bot.level++;
          bot.xp -= bot.maxXp;
          bot.maxXp = Math.floor(bot.maxXp * 1.5);
          bot.maxHp += 10;
          bot.hp = bot.maxHp;
        }
      }

      return { 
          ...prev, 
          inventory: newInventory, 
          team: newTeam,
          stats: { ...prev.stats, healingDone: prev.stats.healingDone + healed }
      };
    });
  };

  const handleBuyModule = (module: Module) => {
    if (player.scrap >= module.cost) {
      updateActiveBot(bot => {
        let newMaxHp = bot.maxHp;
        if (module.effectId === 'HULL_PLATING') {
          newMaxHp += module.value;
        }
        return {
          ...bot,
          modules: [...bot.modules, module],
          maxHp: newMaxHp,
          hp: bot.hp 
        };
      });
      setPlayer(p => ({ ...p, scrap: p.scrap - module.cost }));
      updateStats(s => ({ modulesInstalled: s.modulesInstalled + 1 }));
    }
  };

  const handleHeal = () => {
    const cost = 15;
    if (player.scrap >= cost && activeBot.hp < activeBot.maxHp) {
      updateActiveBot(bot => ({ ...bot, hp: Math.min(bot.maxHp, bot.hp + 20) }));
      setPlayer(p => ({ ...p, scrap: p.scrap - cost }));
      updateStats(s => ({ healingDone: s.healingDone + 20 }));
    }
  };

  const combatRound = async (action: string) => {
    if (inputDisabled || !enemy) return;
    setInputDisabled(true);

    // Handle Switch Action
    if (action.startsWith('SWITCH:')) {
      const targetIdx = parseInt(action.split(':')[1]);
      addLog(`Switched to ${player.team[targetIdx].name}.`, 'info');
      setPlayer(p => ({ ...p, activeSlot: targetIdx }));
    } 
    else if (action.startsWith('ITEM:')) {
      const itemId = action.split(':')[1];
      const item = player.inventory.find(i => i.id === itemId);
      if (item) {
        addLog(`Used ${item.name}`, 'info');
        handleUseItem(item, player.activeSlot);
      }
    }
    else {
      let dmg = 0;
      const currentBot = player.team[player.activeSlot];
      const dmgMod = currentBot.modules.find(m => m.effectId === 'DMG_BOOST')?.value || 0;
      const skill = SKILLS_DB[action];
      
      if (skill) {
        // Trigger Animation
        setCombatEffect({ type: skill.animation, startTime: performance.now(), duration: 600, source: 'PLAYER' });

        // Update Stats
        updateStats(s => ({
            skillsUsed: { ...s.skillsUsed, [skill.name]: (s.skillsUsed[skill.name] || 0) + 1 },
            mostUsedBotId: currentBot.id // Approximate tracking
        }));

        if (skill.type === 'ATTACK' || skill.type === 'TECH') {
           let base = 12;
           if (skill.id === 'LASER_SHOT') base = 15;
           if (skill.id === 'BURST_FIRE') base = 10 + Math.random()*10;
           if (skill.id === 'GRENADE') base = 40;
           if (skill.id === 'BASH') base = 20;
           if (skill.id === 'ZAP') base = 15; 
           if (skill.id === 'HACK') {
               if (Math.random() > 0.4) {
                 base = 30;
                 addLog("Hack successful!", 'player');
               } else {
                 base = 0;
                 addLog("Hack failed!", 'player');
               }
           }

           dmg = Math.floor(base + (currentBot.level * 3) + dmgMod);

           // Type Matchups
           const typeMod = DAMAGE_TYPE_CHART[skill.damageType || 'NONE'][enemy.class];
           dmg = Math.floor(dmg * typeMod);

           if (skill.id === 'TARGET_LOCK') {
              addLog("Target Locked! (Crit chance up)", 'player');
              dmg = 0;
           }

           if (dmg > 0) {
               addLog(`${currentBot.name} used ${skill.name} for ${dmg} dmg!`, 'player');
               if (typeMod > 1) addLog("It's super effective!", 'gain');
               if (typeMod < 1) addLog("It's not very effective...", 'danger');
               updateStats(s => ({ damageDealt: s.damageDealt + dmg }));
           }
        }
        else if (skill.type === 'DEFENSE') {
           if (skill.id === 'REINFORCE' || skill.id === 'SHIELD_MOD') {
             const val = 30 + (currentBot.level * 5);
             updateActiveBot(b => ({ ...b, tempShield: (b.tempShield || 0) + val }));
             addLog(`Shields raised (+${val}).`, 'gain');
           }
        }
        else if (skill.type === 'SUPPORT') {
           if (skill.id === 'QUICK_FIX') {
             updateActiveBot(b => ({ ...b, hp: Math.min(b.maxHp, b.hp + 30) }));
             addLog("Emergency repairs complete (+30 HP).", 'gain');
             updateStats(s => ({ healingDone: s.healingDone + 30 }));
           }
        }
      }
      else if (action === 'SHIELD_MOD') {
         setCombatEffect({ type: 'SHIELD', startTime: performance.now(), duration: 500, source: 'PLAYER' });
         const shieldVal = currentBot.modules.find(m => m.effectId === 'SHIELD')?.value || 20;
         updateActiveBot(b => ({ ...b, tempShield: (b.tempShield || 0) + shieldVal }));
         addLog(`Shields up (+${shieldVal}).`, 'gain');
      }
      else if (action === 'RECRUIT') {
         setCombatEffect({ type: 'ELECTRIC', startTime: performance.now(), duration: 800, source: 'PLAYER' });
         const chance = Math.max(0, Math.min(0.9, (1 - (enemy.hp / enemy.maxHp)) * 1.5));
         if (Math.random() < chance && !enemy.isBoss) {
            addLog("HACK SUCCESSFUL! Enemy rebooted.", 'gain');
            
            let recruitClass: Bot['class'] = enemy.class;
            const template = BOT_CLASSES[recruitClass];

            const newBot: Bot = {
               id: `bot_${Date.now()}`,
               name: `${enemy.name.split(' ')[0]} Unit`,
               class: recruitClass,
               hp: Math.floor(enemy.maxHp * 0.5),
               maxHp: enemy.maxHp,
               level: currentBot.level,
               xp: 0,
               maxXp: 100 * currentBot.level,
               modules: [],
               activeSkills: [...template.startingSkills],
               storedSkills: [],
               isDefeated: false,
               personality: "Reformatted. Awaiting orders."
            };
            
            setTimeout(() => {
               setPlayer(p => {
                  const fullTeam = p.team.length >= 3;
                  return {
                     ...p,
                     team: fullTeam ? p.team : [...p.team, newBot],
                     reserves: fullTeam ? [...p.reserves, newBot] : p.reserves
                  };
               });
               addLog(player.team.length >= 3 ? "Sent to Base Camp." : "Joined Squad!", 'gain');
               updateStats(s => ({ botsRecruited: s.botsRecruited + 1 }));
               setEnemy(null);
               setGameState(GameState.EXPLORING);
               setInputDisabled(false);
            }, 1000);
            return;
         } else {
            addLog("Recruit Failed! Firewall too strong.", 'danger');
         }
      }

      if (dmg > 0) {
        setEnemy(prev => prev ? { ...prev, hp: prev.hp - dmg } : null);
      }
    }

    await new Promise(r => setTimeout(r, 800));

    setEnemy(prevEnemy => {
       if (!prevEnemy) return null;
       if (prevEnemy.hp <= 0) {
        if (prevEnemy.isBoss) {
             addLog("GUARDIAN DEFEATED! OMNI-TOOL ACQUIRED.", 'gain');
             setTimeout(() => {
                setPlayer(p => ({
                   ...p,
                   quest: { ...p.quest, stage: 'REPAIR_POD', hasOmniTool: true },
                   inventory: [...p.inventory, ITEMS_DB.OMNI_TOOL]
                }));
             }, 1000);
        }

        const scrapGain = Math.floor(prevEnemy.maxHp / 2) + 10;
        const xpGain = prevEnemy.xpValue;
        const autoRepair = player.team[player.activeSlot].modules.find(m => m.effectId === 'AUTO_REPAIR')?.value || 0;

        setTimeout(() => {
          addLog(`Victory! +${scrapGain} Scrap, +${xpGain} XP.`, 'gain');
          updateStats(s => ({ scrapsCollected: s.scrapsCollected + scrapGain }));
          
          if (Math.random() > 0.7) {
            const drops = Object.values(ITEMS_DB).filter(i => i.effect !== 'QUEST');
            const drop = drops[Math.floor(Math.random() * drops.length)];
            addLog(`Found item: ${drop.name}`, 'gain');
            setPlayer(p => {
               const existing = p.inventory.find(i => i.id === drop.id);
               if (existing) {
                 return { ...p, inventory: p.inventory.map(i => i.id === drop.id ? { ...i, count: i.count + 1 } : i) };
               }
               return { ...p, inventory: [...p.inventory, drop] };
            });
          }

          setTimeout(() => {
            setPlayer(p => {
               const newTeam = [...p.team];
               const bot = newTeam[p.activeSlot];
               
               bot.xp += xpGain;
               if (bot.xp >= bot.maxXp) {
                  bot.level++;
                  bot.xp -= bot.maxXp;
                  bot.maxXp = Math.floor(bot.maxXp * 1.5);
                  bot.maxHp += 15;
                  bot.hp = bot.maxHp;
                  addLog("LEVEL UP! Fully Repaired.", 'gain');
                  
                  const newSkill = Object.values(SKILLS_DB).find(s => s.minLevel === bot.level);
                  if (newSkill && !bot.activeSkills.includes(newSkill.id) && !bot.storedSkills.includes(newSkill.id)) {
                     if (bot.activeSkills.length < 3) bot.activeSkills.push(newSkill.id);
                     else bot.storedSkills.push(newSkill.id);
                     addLog(`Learned: ${newSkill.name}`, 'gain');
                  }
               }
               
               if (autoRepair > 0) {
                   const healed = Math.min(bot.maxHp - bot.hp, autoRepair);
                   bot.hp += healed;
                   updateStats(s => ({ healingDone: s.healingDone + healed }));
               }
               bot.tempShield = 0;

               return { ...p, scrap: p.scrap + scrapGain, team: newTeam };
            });
            setEnemy(null);
            setGameState(GameState.EXPLORING);
            setInputDisabled(false);
          }, 1500);
        }, 500);
        return null;
       }
       return prevEnemy;
    });
    
    setTimeout(() => {
       setEnemy(currentEnemy => {
          if (!currentEnemy || currentEnemy.hp <= 0) return currentEnemy;

          // Enemy Attack Logic
          setCombatEffect({ type: 'LASER', startTime: performance.now(), duration: 500, source: 'ENEMY' });
          const enemyDmg = Math.floor(8 + (player.team[player.activeSlot].level * 1.5));
          addLog(`${currentEnemy.name} attacks for ${enemyDmg} dmg.`, 'enemy');

          setPlayer(prev => {
            const newTeam = [...prev.team];
            const bot = newTeam[prev.activeSlot];
            
            let taken = enemyDmg;
            let currentShield = bot.tempShield || 0;
            
            if (currentShield > 0) {
              if (currentShield >= taken) {
                currentShield -= taken;
                taken = 0;
              } else {
                taken -= currentShield;
                currentShield = 0;
              }
            }

            bot.tempShield = currentShield;
            bot.hp -= taken;
            updateStats(s => ({ damageTaken: s.damageTaken + taken }));

            if (bot.hp <= 0) {
              bot.hp = 0;
              bot.isDefeated = true;
              updateStats(s => ({ botsLost: s.botsLost + 1 }));
              addLog(`${bot.name} has been defeated!`, 'enemy');
              
              const nextAlive = newTeam.findIndex(b => !b.isDefeated);
              if (nextAlive !== -1) {
                 addLog(`WARNING: Unit Down. Switching to ${newTeam[nextAlive].name}...`, 'danger');
                 return { ...prev, team: newTeam, activeSlot: nextAlive };
              } else {
                 setTimeout(() => setGameState(GameState.GAME_OVER), 1000);
              }
            }

            return { ...prev, team: newTeam };
          });
          
          setInputDisabled(false);
          return currentEnemy;
       });
    }, 1000);
  };

  const finalScore = calculateScore(player.stats, gameState === GameState.VICTORY);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden font-vt323">
      <div className="w-full max-w-6xl h-full flex flex-col md:flex-row md:h-[90vh] gap-4 p-4">
        
        {/* Left: Game View */}
        <div className="w-full md:flex-[2] md:w-auto flex flex-col justify-center relative min-h-0 shrink-0 aspect-[4/3] md:aspect-auto">
          {gameState === GameState.VICTORY ? (
             <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950 border-4 border-blue-500 rounded-lg p-8 text-center overflow-y-auto custom-scrollbar">
                <h1 className="text-6xl text-blue-300 font-bold mb-4">MISSION COMPLETE</h1>
                <div className="text-2xl text-white mb-8">SCORE: {finalScore}</div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left text-slate-300 text-sm mb-8 font-mono">
                    <div>Scrap Collected:</div><div className="text-right">{player.stats.scrapsCollected}</div>
                    <div>Bots Recruited:</div><div className="text-right">{player.stats.botsRecruited}</div>
                    <div>Damage Dealt:</div><div className="text-right">{player.stats.damageDealt}</div>
                    <div>Healing Done:</div><div className="text-right">{player.stats.healingDone}</div>
                    <div>Quests Completed:</div><div className="text-right">{player.stats.questsCompleted}</div>
                    <div>Units Lost:</div><div className="text-right text-red-400">{player.stats.botsLost}</div>
                </div>

                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-8 py-4 bg-blue-800 border-2 border-blue-500 text-white text-xl hover:bg-blue-600"
                >
                  PLAY AGAIN
                </button>
             </div>
          ) : (
             <GameView 
                gameState={gameState} 
                player={player} 
                enemy={enemy} 
                combatEffect={combatEffect}
                onNavigate={handleNavigate} 
                onInteract={handleInteract}
             />
          )}
          
          {message && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 border border-cyan-500 text-cyan-400 px-4 py-2 rounded z-30 text-xl animate-bounce text-center min-w-[300px]">
              {message}
            </div>
          )}
        </div>

        {/* Right: UI Panel */}
        <div className="w-full md:flex-1 md:w-auto min-h-0 flex-1 relative overflow-hidden">
          {gameState === GameState.EXPLORING && (
            <ExplorationInterface 
              player={player} 
              onHeal={handleHeal}
              onBuyModule={handleBuyModule}
              onSwitchBot={handleSwitchBot}
              onUseItem={handleUseItem}
              onSwapReserve={handleSwapReserve}
              onEquipSkill={handleEquipSkill}
              onInteract={handleInteract}
              interactionLabel={interactionLabel}
            />
          )}

          {gameState === GameState.COMBAT && (
            <CombatInterface 
              player={player}
              enemy={enemy}
              logs={logs}
              onAction={combatRound}
            />
          )}
        </div>

      </div>

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center z-50 p-8 overflow-y-auto">
          <h1 className="text-8xl text-red-600 font-bold mb-4 tracking-widest font-mono">CRITICAL FAILURE</h1>
          <div className="text-white text-3xl mb-8 font-mono">FINAL SCORE: {finalScore}</div>
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-left text-slate-400 text-lg mb-8 font-mono max-w-lg w-full">
                <div>Bots Lost:</div><div className="text-right text-red-500">{player.stats.botsLost}</div>
                <div>Steps Taken:</div><div className="text-right">{player.stats.stepsTaken}</div>
                <div>Damage Taken:</div><div className="text-right">{player.stats.damageTaken}</div>
                <div>Scrap Found:</div><div className="text-right">{player.stats.scrapsCollected}</div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-red-800 border-2 border-red-500 text-white text-xl hover:bg-red-600 font-bold tracking-widest transition-all hover:scale-105 font-mono"
          >
            SYSTEM REBOOT
          </button>
        </div>
      )}
    </div>
  );
};

export default App;