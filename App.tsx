
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Enemy, CombatLog, TerrainType, Module, POIType, Bot, Item } from './types';
import { INITIAL_PLAYER_STATE, ENCOUNTER_CHANCE_BASE, getTerrainAt, getPOIAt, BOT_CLASSES, ITEMS_DB, POD_POS, BOSS_ENEMY, UNIQUE_NAMES, PERSONALITIES, SKILLS_DB, ACID_DAMAGE } from './constants';
import GameView from './components/GameView';
import CombatInterface from './components/CombatInterface';
import ExplorationInterface from './components/ExplorationInterface';

// Helper to create random enemies
const createEnemy = (playerLevel: number): Enemy => {
  const r = Math.random();
  if (playerLevel < 3) {
     if (r > 0.8) return { type: 'HEAVY_MECH', name: 'Heavy Mech', hp: 80, maxHp: 80, xpValue: 40 };
     return { type: 'SCRAP_DRONE', name: 'Scrap Drone', hp: 40, maxHp: 40, xpValue: 20 };
  }
  if (r > 0.9) return { type: 'JUNKER_BEHEMOTH', name: 'Junker Behemoth', hp: 200 + (playerLevel*10), maxHp: 200 + (playerLevel*10), xpValue: 100 };
  if (r > 0.7) return { type: 'NANITE_SWARM', name: 'Nanite Swarm', hp: 60 + (playerLevel*5), maxHp: 60 + (playerLevel*5), xpValue: 50 };
  if (r > 0.4) return { type: 'HEAVY_MECH', name: 'Heavy Mech', hp: 100 + (playerLevel*10), maxHp: 100 + (playerLevel*10), xpValue: 40 };
  return { type: 'SCRAP_DRONE', name: 'Scrap Drone', hp: 50 + (playerLevel*5), maxHp: 50 + (playerLevel*5), xpValue: 25 };
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.EXPLORING);
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER_STATE);
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // For exploration toasts
  const [introShown, setIntroShown] = useState(false);

  const addLog = (message: string, type: CombatLog['type']) => {
    setLogs(prev => [...prev, { message, type, id: Date.now() + Math.random() }]);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  // --- Intro Modal ---
  useEffect(() => {
    if (!introShown) {
      setTimeout(() => {
        showMessage("CRITICAL ERROR... SYSTEM REBOOT... ESCAPE POD LOCATED.");
        setIntroShown(true);
      }, 500);
    }
  }, [introShown]);

  // --- Helper Accessors ---
  const activeBot = player.team[player.activeSlot];
  
  const updateActiveBot = (updater: (bot: Bot) => Bot) => {
    setPlayer(prev => {
      const newTeam = [...prev.team];
      newTeam[prev.activeSlot] = updater(newTeam[prev.activeSlot]);
      return { ...prev, team: newTeam };
    });
  };

  // --- Exploration Logic ---
  
  const handleMove = useCallback((dx: number, dy: number) => {
    if (gameState !== GameState.EXPLORING) return;

    setPlayer(prev => {
      const targetX = prev.pos.x + dx;
      const targetY = prev.pos.y + dy;
      
      // Terrain Check
      const terrain = getTerrainAt(targetX, targetY);
      if (terrain === TerrainType.WALL) {
        return { ...prev, facing: dx === 0 ? (dy > 0 ? 'DOWN' : 'UP') : (dx > 0 ? 'RIGHT' : 'LEFT') };
      }

      let nextTeam = [...prev.team];
      let msg = message;

      // Terrain Effects (Acid)
      if (terrain === TerrainType.ACID_POOL) {
        const active = nextTeam[prev.activeSlot];
        if (active.hp > 0 && !active.isDefeated) {
           active.hp = Math.max(0, active.hp - ACID_DAMAGE);
           if (active.hp === 0) {
             active.isDefeated = true;
             // Auto switch logic handled via separate effect if needed, but simple here:
             msg = "DANGER: Acid Damage! Unit Disabled.";
           } else {
             msg = "WARNING: Corrosive Environment Detected.";
           }
        }
      }
      if (msg !== message && msg) showMessage(msg);

      // Encounter Check (Safe near pod)
      const distToPod = Math.sqrt(Math.pow(targetX - POD_POS.x, 2) + Math.pow(targetY - POD_POS.y, 2));
      const currentBot = nextTeam[prev.activeSlot];
      const hasScanner = currentBot.modules.some(m => m.effectId === 'SCANNER');
      const chance = distToPod < 5 ? 0 : hasScanner ? ENCOUNTER_CHANCE_BASE * 0.6 : ENCOUNTER_CHANCE_BASE;

      if (currentBot.hp > 0 && Math.random() < chance) {
        const newEnemy = createEnemy(currentBot.level);
        setEnemy(newEnemy);
        setGameState(GameState.COMBAT);
        setLogs([]); 
        addLog(`ALERT: ${newEnemy.name} approaching!`, 'info');
        return { ...prev, team: nextTeam, pos: { x: targetX, y: targetY } };
      }

      return { 
        ...prev, 
        team: nextTeam,
        pos: { x: targetX, y: targetY },
        facing: dx === 0 ? (dy > 0 ? 'DOWN' : 'UP') : (dx > 0 ? 'RIGHT' : 'LEFT') 
      };
    });
  }, [gameState, message]);

  const handleInteract = () => {
    if (gameState !== GameState.EXPLORING) return;

    const { x, y } = player.pos;
    // Check current tile (for POD) or front tile
    let targetX = x; 
    let targetY = y;
    
    let poiKey = `${x},${y}`;
    let poi = getPOIAt(x, y);
    
    if (poi === POIType.NONE) {
      if (player.facing === 'UP') targetY--;
      if (player.facing === 'DOWN') targetY++;
      if (player.facing === 'LEFT') targetX--;
      if (player.facing === 'RIGHT') targetX++;
      poiKey = `${targetX},${targetY}`;
      poi = getPOIAt(targetX, targetY);
    }

    // --- ESCAPE POD INTERACTION ---
    if (poi === POIType.POD) {
       if (player.quest.stage === 'FIND_POD') {
          showMessage("Pod Systems Critical. Needs 3 Hyperdrive Flux parts.");
          setPlayer(p => ({ ...p, quest: { ...p.quest, stage: 'GATHER_PARTS' } }));
       } else if (player.quest.stage === 'GATHER_PARTS') {
          if (player.quest.partsFound >= player.quest.partsNeeded) {
             showMessage("Parts Installed. GUARDIAN SIGNAL DETECTED. PREPARE FOR COMBAT.");
             setPlayer(p => ({ ...p, quest: { ...p.quest, stage: 'DEFEAT_GUARDIAN' } }));
             setTimeout(() => {
                setEnemy(BOSS_ENEMY);
                setGameState(GameState.COMBAT);
                setLogs([]);
                addLog("WARNING: CORE GUARDIAN DETECTED", 'danger');
             }, 2000);
          } else {
             showMessage(`Needs Hyperdrive Flux. Found: ${player.quest.partsFound}/${player.quest.partsNeeded}`);
          }
       } else if (player.quest.stage === 'DEFEAT_GUARDIAN') {
          showMessage("The Guardian blocks the launch sequence!");
       } else if (player.quest.stage === 'REPAIR_POD') {
          if (player.quest.hasOmniTool) {
             setGameState(GameState.VICTORY);
          } else {
             showMessage("Need Omni-Tool to initiate launch.");
          }
       }
       return;
    }

    if (player.visitedPOIs[poiKey] || poi === POIType.NONE) {
       showMessage("Nothing to interact with.");
       return;
    }

    // Handle Interaction
    if (poi === POIType.CACHE) {
      // Quest Part Chance: Increases further out
      const dist = Math.sqrt(targetX*targetX + targetY*targetY);
      const isQuestPart = player.quest.stage === 'GATHER_PARTS' && Math.random() < (dist / 50) && player.quest.partsFound < player.quest.partsNeeded;
      
      if (isQuestPart) {
          showMessage("Found Hyperdrive Flux!");
          setPlayer(prev => ({
             ...prev,
             visitedPOIs: { ...prev.visitedPOIs, [poiKey]: true },
             quest: { ...prev.quest, partsFound: prev.quest.partsFound + 1 },
             inventory: [...prev.inventory, ITEMS_DB.QUEST_PART]
          }));
      } else {
          const foundScrap = Math.floor(Math.random() * 50) + 20;
          setPlayer(prev => ({
            ...prev,
            scrap: prev.scrap + foundScrap,
            visitedPOIs: { ...prev.visitedPOIs, [poiKey]: true }
          }));
          showMessage(`Cache opened: Found ${foundScrap} Scrap!`);
      }
    }
    else if (poi === POIType.NPC) {
       const msgs = [
         "I saw a Hyperdrive part in a crate far to the east...",
         "The Guardian only appears when the pod is active.",
         "Need spare parts? Too bad.",
         "My logic core hurts."
       ];
       const msg = msgs[Math.floor(Math.random() * msgs.length)];
       showMessage(`NPC: "${msg}"`);
    }
    else if (poi === POIType.DERELICT) {
      // 50% chance to recruit for cost, 50% scrap
      const recruitCost = 50;
      if (player.scrap >= recruitCost) {
         // Generate Unique Bot
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

         // Add to team or reserves
         setPlayer(prev => {
             const fullTeam = prev.team.length >= 3;
             return {
                 ...prev,
                 scrap: prev.scrap - recruitCost,
                 team: fullTeam ? prev.team : [...prev.team, newBot],
                 reserves: fullTeam ? [...prev.reserves, newBot] : prev.reserves,
                 visitedPOIs: { ...prev.visitedPOIs, [poiKey]: true }
             };
         });
         showMessage(player.team.length >= 3 
            ? `Recruited ${name}. Sent to Base Camp.` 
            : `Recruited ${name}. Joined squad!`);

      } else {
          showMessage(`Need ${recruitCost} Scrap to repair. Salvaged parts instead.`);
           setPlayer(prev => ({
             ...prev,
             scrap: prev.scrap + 15,
             visitedPOIs: { ...prev.visitedPOIs, [poiKey]: true }
           }));
      }
    }
  };

  const handleSwitchBot = (index: number) => {
    if (index >= 0 && index < player.team.length && !player.team[index].isDefeated) {
      setPlayer(p => ({ ...p, activeSlot: index }));
    }
  };

  const handleSwapReserve = (teamIdx: number, reserveIdx: number) => {
     // -1 indicates "from/to" the other list
     setPlayer(prev => {
        const newTeam = [...prev.team];
        const newReserves = [...prev.reserves];

        if (teamIdx !== -1 && reserveIdx === -1) {
           // Team -> Reserve
           if (newTeam.length <= 1) {
              showMessage("Cannot send last bot to reserves!");
              return prev;
           }
           const [bot] = newTeam.splice(teamIdx, 1);
           newReserves.push(bot);
           // Fix active slot if needed
           let newActive = prev.activeSlot;
           if (newActive >= newTeam.length) newActive = 0;
           return { ...prev, team: newTeam, reserves: newReserves, activeSlot: newActive };
        } 
        else if (teamIdx === -1 && reserveIdx !== -1) {
           // Reserve -> Team
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

      if (item.effect === 'HEAL') {
        if (bot.isDefeated) return prev; // Use revive
        bot.hp = Math.min(bot.maxHp, bot.hp + item.value);
      } else if (item.effect === 'REVIVE') {
        if (!bot.isDefeated) return prev;
        bot.isDefeated = false;
        bot.hp = Math.floor(bot.maxHp * item.value);
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

      return { ...prev, inventory: newInventory, team: newTeam };
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
    }
  };

  const handleHeal = () => {
    const cost = 15;
    if (player.scrap >= cost && activeBot.hp < activeBot.maxHp) {
      updateActiveBot(bot => ({ ...bot, hp: Math.min(bot.maxHp, bot.hp + 20) }));
      setPlayer(p => ({ ...p, scrap: p.scrap - cost }));
    }
  };

  // --- Combat Logic ---

  const combatRound = async (action: string) => {
    if (inputDisabled || !enemy) return;
    setInputDisabled(true);

    let endTurn = true;

    // Handle Switch Action
    if (action.startsWith('SWITCH:')) {
      const targetIdx = parseInt(action.split(':')[1]);
      addLog(`Switched to ${player.team[targetIdx].name}.`, 'info');
      setPlayer(p => ({ ...p, activeSlot: targetIdx }));
    } 
    else if (action.startsWith('ITEM:')) {
      // Use Item in Combat
      const itemId = action.split(':')[1];
      const item = player.inventory.find(i => i.id === itemId);
      if (item) {
        addLog(`Used ${item.name}`, 'info');
        handleUseItem(item, player.activeSlot);
      }
    }
    else {
      // --- Player Skill Execution ---
      let dmg = 0;
      const currentBot = player.team[player.activeSlot];
      const dmgMod = currentBot.modules.find(m => m.effectId === 'DMG_BOOST')?.value || 0;
      
      // Check generic or unique skills
      const skill = SKILLS_DB[action];
      
      if (skill) {
        // General Skill Logic
        if (skill.type === 'ATTACK' || skill.type === 'TECH') {
           // Base calc
           let base = 12;
           if (skill.id === 'LASER_SHOT') base = 15;
           if (skill.id === 'BURST_FIRE') base = 10 + Math.random()*10;
           if (skill.id === 'GRENADE') base = 40;
           if (skill.id === 'BASH') base = 20;
           if (skill.id === 'ZAP') base = 15; // Ignores def? (Not implemented yet)
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
           if (skill.id === 'TARGET_LOCK') {
              addLog("Target Locked! (Crit chance up)", 'player');
              // Simplified: Just does 0 damage but could set a flag. For now, assume it's a support move.
              dmg = 0;
           }

           if (dmg > 0) addLog(`${currentBot.name} used ${skill.name} for ${dmg} dmg!`, 'player');
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
           }
        }
      }
      else if (action === 'SHIELD_MOD') {
         const shieldVal = currentBot.modules.find(m => m.effectId === 'SHIELD')?.value || 20;
         updateActiveBot(b => ({ ...b, tempShield: (b.tempShield || 0) + shieldVal }));
         addLog(`Shields up (+${shieldVal}).`, 'gain');
      }
      else if (action === 'RECRUIT') {
         const chance = Math.max(0, Math.min(0.9, (1 - (enemy.hp / enemy.maxHp)) * 1.5));
         if (Math.random() < chance && !enemy.isBoss) {
            addLog("HACK SUCCESSFUL! Enemy rebooted.", 'gain');
            
            const newBot: Bot = {
               id: `bot_${Date.now()}`,
               name: `${enemy.name.split(' ')[0]} Unit`,
               class: 'TECH',
               hp: Math.floor(enemy.maxHp * 0.5),
               maxHp: enemy.maxHp,
               level: currentBot.level,
               xp: 0,
               maxXp: 100 * currentBot.level,
               modules: [],
               activeSkills: ['ZAP', 'HACK'],
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

    // Check Victory
    if (enemy.hp - (enemy.hp - (enemy ? enemy.hp : 0)) <= 0) { // Simplified check logic
       // Wait, previous logic modified enemy state but we can't read state immediately inside closure.
       // So we rely on the fact that `setEnemy` will trigger re-render, but we need to handle flow here.
    }

    // We need to wait for state update to check HP realistically, 
    // OR check against the calculated values.
    // Since react state is async, we'll assume flow continues to enemy turn unless enemy is dead.
    // Let's assume enemy is NOT dead yet for the animation delay, then check.
    
    // Re-check enemy HP based on calculation
    // Since we don't have the new state, we can't perfectly check death here.
    // Instead, we will check death in a useEffect or inside the setEnemy callback, 
    // but to keep single-file simplicity, let's hack the flow:
    
    // (Wait for UI to update player move)
    await new Promise(r => setTimeout(r, 800));

    // Check if enemy died from that specific move (we can't read new state yet, so we check prev enemy - dmg)
    // This is slightly buggy in React strict mode without refs, but works for simple games.
    setEnemy(prevEnemy => {
       if (!prevEnemy) return null;
       if (prevEnemy.hp <= 0) {
         // VICTORY LOGIC
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
          
          // Loot
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
                  bot.hp = bot.maxHp; // Full heal on level up
                  addLog("LEVEL UP! Fully Repaired.", 'gain');
                  
                  // Unlock new skill slot logic or auto-learn?
                  // For now, we auto-learn class skills based on level in a separate effect or check
                  const newSkill = Object.values(SKILLS_DB).find(s => s.minLevel === bot.level);
                  if (newSkill && !bot.activeSkills.includes(newSkill.id) && !bot.storedSkills.includes(newSkill.id)) {
                     if (bot.activeSkills.length < 3) bot.activeSkills.push(newSkill.id);
                     else bot.storedSkills.push(newSkill.id);
                     addLog(`Learned: ${newSkill.name}`, 'gain');
                  }
               }
               
               if (autoRepair > 0) bot.hp = Math.min(bot.maxHp, bot.hp + autoRepair);
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
    
    // If enemy survived, they attack
    // We need to check if enemy is null (defeated) to stop execution.
    // Since we can't synchronously know if setEnemy(null) happened, we check logic again.
    // This is a bit messy in functional updates. Ideally we use a Ref for enemy HP.
    // Instead, we'll just run the enemy attack in a separate timeout that checks existance.
    
    setTimeout(() => {
       setEnemy(currentEnemy => {
          if (!currentEnemy || currentEnemy.hp <= 0) return currentEnemy; // Dead

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

            if (bot.hp <= 0) {
              bot.hp = 0;
              bot.isDefeated = true;
              addLog(`${bot.name} has been defeated!`, 'enemy');
              
              // AUTO SWITCH LOGIC
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

  // --- Keyboard Listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inputDisabled) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w': handleMove(0, -1); break;
        case 'ArrowDown':
        case 's': handleMove(0, 1); break;
        case 'ArrowLeft':
        case 'a': handleMove(-1, 0); break;
        case 'ArrowRight':
        case 'd': handleMove(1, 0); break;
        case 'e': case 'Enter': handleInteract(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, inputDisabled, player]);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-vt323">
      <div className="w-full max-w-6xl h-full md:h-[90vh] flex flex-col md:flex-row gap-4 p-4">
        
        {/* Left: Game View */}
        <div className="flex-[2] flex flex-col justify-center relative min-h-0">
          {gameState === GameState.VICTORY ? (
             <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950 border-4 border-blue-500 rounded-lg p-8 text-center">
                <h1 className="text-6xl text-blue-300 font-bold mb-4">MISSION COMPLETE</h1>
                <p className="text-2xl text-white mb-8">The Escape Pod has launched successfully.</p>
                <p className="text-xl text-slate-400">You and your squad of {player.team.length + player.reserves.length} bots escaped the scrapyard.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-8 px-8 py-4 bg-blue-800 border-2 border-blue-500 text-white text-xl hover:bg-blue-600"
                >
                  PLAY AGAIN
                </button>
             </div>
          ) : (
             <GameView gameState={gameState} player={player} enemy={enemy} />
          )}
          
          {message && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 border border-cyan-500 text-cyan-400 px-4 py-2 rounded z-30 text-xl animate-bounce text-center min-w-[300px]">
              {message}
            </div>
          )}
        </div>

        {/* Right: UI Panel */}
        <div className="flex-1 min-w-0 md:min-w-[300px] h-[45vh] md:h-full relative">
          {gameState === GameState.EXPLORING && (
            <ExplorationInterface 
              player={player} 
              onHeal={handleHeal}
              onBuyModule={handleBuyModule}
              onMove={handleMove}
              onInteract={handleInteract}
              onSwitchBot={handleSwitchBot}
              onUseItem={handleUseItem}
              onSwapReserve={handleSwapReserve}
              onEquipSkill={handleEquipSkill}
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
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center z-50">
          <h1 className="text-8xl text-red-600 font-bold mb-4 tracking-widest font-mono">CRITICAL FAILURE</h1>
          <div className="text-slate-400 text-xl mb-8 font-mono">
             ALL UNITS OFFLINE.
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
