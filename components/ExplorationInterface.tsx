
import React, { useState } from 'react';
import { Player, Module, Bot, Item } from '../types';
import { AVAILABLE_MODULES, POD_POS, SKILLS_DB } from '../constants';

interface ExplorationInterfaceProps {
  player: Player;
  onHeal: () => void;
  onBuyModule: (module: Module) => void;
  onMove: (dx: number, dy: number) => void;
  onInteract: () => void;
  onSwitchBot: (index: number) => void;
  onUseItem: (item: Item, botIndex: number) => void;
  onSwapReserve: (teamIndex: number, reserveIndex: number) => void;
  onEquipSkill: (skillId: string, isEquipping: boolean) => void;
}

const ExplorationInterface: React.FC<ExplorationInterfaceProps> = ({ 
  player, onHeal, onBuyModule, onMove, onInteract, onSwitchBot, onUseItem, onSwapReserve, onEquipSkill
}) => {
  const [tab, setTab] = useState<'STATUS' | 'TEAM' | 'FAB'>('STATUS');
  const [campMode, setCampMode] = useState(false);

  const activeBot = player.team[player.activeSlot];
  const canHeal = player.scrap >= 15 && activeBot.hp < activeBot.maxHp;
  const hasModule = (id: string) => activeBot.modules.some(m => m.id === id);

  // Check if near pod to enable camp UI
  const nearPod = player.pos.x === POD_POS.x && player.pos.y === POD_POS.y;

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l-4 border-slate-800 font-mono overflow-hidden">
      
      {/* Top Bar: Quest Info */}
      <div className="bg-orange-900/20 p-2 border-b border-orange-900/50">
        <div className="flex justify-between items-center mb-1">
           <span className="text-orange-500 font-bold text-xs tracking-widest">OBJECTIVE</span>
           <span className="text-orange-400 text-xs">
              {player.quest.stage === 'FIND_POD' && "LOCATE ESCAPE POD"}
              {player.quest.stage === 'GATHER_PARTS' && `FIND PARTS (${player.quest.partsFound}/${player.quest.partsNeeded})`}
              {player.quest.stage === 'DEFEAT_GUARDIAN' && "DEFEAT GUARDIAN"}
              {player.quest.stage === 'REPAIR_POD' && "REPAIR POD"}
           </span>
        </div>
        <div className="h-1 bg-slate-800 rounded overflow-hidden">
           <div className="h-full bg-orange-500" style={{ 
             width: player.quest.stage === 'COMPLETED' ? '100%' : 
                    player.quest.stage === 'DEFEAT_GUARDIAN' ? '75%' :
                    player.quest.stage === 'GATHER_PARTS' ? `${(player.quest.partsFound/player.quest.partsNeeded)*50 + 25}%` : '10%' 
           }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-950">
        <button onClick={() => { setTab('STATUS'); setCampMode(false); }} className={`flex-1 py-2 text-sm font-bold ${tab === 'STATUS' && !campMode ? 'text-cyan-400 bg-slate-900 border-t-2 border-cyan-500' : 'text-slate-500 hover:text-slate-300'}`}>STATUS</button>
        <button onClick={() => { setTab('TEAM'); setCampMode(false); }} className={`flex-1 py-2 text-sm font-bold ${tab === 'TEAM' && !campMode ? 'text-cyan-400 bg-slate-900 border-t-2 border-cyan-500' : 'text-slate-500 hover:text-slate-300'}`}>TEAM</button>
        
        {nearPod ? (
           <button onClick={() => setCampMode(true)} className={`flex-1 py-2 text-sm font-bold ${campMode ? 'text-green-400 bg-slate-900 border-t-2 border-green-500' : 'text-green-700 hover:text-green-500'}`}>CAMP</button>
        ) : (
           <button onClick={() => setTab('FAB')} className={`flex-1 py-2 text-sm font-bold ${tab === 'FAB' ? 'text-cyan-400 bg-slate-900 border-t-2 border-cyan-500' : 'text-slate-500 hover:text-slate-300'}`}>FAB</button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* CAMP MODE */}
        {campMode && (
           <div className="space-y-4">
             <div className="text-green-400 text-sm font-bold text-center">BASE CAMP MANAGEMENT</div>
             <p className="text-xs text-slate-500 text-center mb-2">Swap active bots with reserves.</p>
             
             <div className="space-y-2">
               <div className="text-xs text-cyan-500 font-bold">ACTIVE SQUAD (MAX 3)</div>
               {player.team.map((bot, idx) => (
                 <div key={bot.id} className="p-2 border border-cyan-900 bg-cyan-950/20 rounded flex justify-between items-center">
                    <span className="text-sm text-cyan-200">{bot.name}</span>
                    {player.team.length > 1 && (
                       <button 
                        onClick={() => onSwapReserve(idx, -1)} // -1 means push to reserve
                        className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-red-900"
                       >TO RESERVE</button>
                    )}
                 </div>
               ))}
             </div>

             <div className="space-y-2 border-t border-slate-800 pt-2">
               <div className="text-xs text-green-500 font-bold">RESERVES</div>
               {player.reserves.length === 0 && <p className="text-xs text-slate-600 italic">No bots in reserve.</p>}
               {player.reserves.map((bot, idx) => (
                 <div key={bot.id} className="p-2 border border-green-900 bg-green-950/20 rounded flex justify-between items-center">
                    <div>
                      <div className="text-sm text-green-200">{bot.name}</div>
                      <div className="text-[10px] text-slate-500">{bot.class} | LVL {bot.level}</div>
                    </div>
                    {player.team.length < 3 ? (
                       <button 
                        onClick={() => onSwapReserve(-1, idx)} // -1 means take from reserve
                        className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-cyan-900"
                       >JOIN SQUAD</button>
                    ) : (
                       <span className="text-[10px] text-red-900">SQUAD FULL</span>
                    )}
                 </div>
               ))}
             </div>
           </div>
        )}

        {/* Status Tab */}
        {!campMode && tab === 'STATUS' && (
          <>
            <div className="bg-slate-950 p-4 rounded border border-slate-700 mb-4">
              <h2 className="text-cyan-500 text-lg font-bold mb-1">{activeBot.name}</h2>
              <p className="text-xs text-slate-500 mb-4 uppercase">CLASS: {activeBot.class}</p>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1 text-slate-300">
                  <span>HULL</span>
                  <span>{activeBot.hp}/{activeBot.maxHp}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-green-500" style={{ width: `${(activeBot.hp / activeBot.maxHp) * 100}%` }} />
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1 text-slate-300">
                  <span>XP (LVL {activeBot.level})</span>
                  <span>{activeBot.xp}/{activeBot.maxXp}</span>
                </div>
                <div className="h-1 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${(activeBot.xp / activeBot.maxXp) * 100}%` }} />
                </div>
              </div>

               <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl border-t border-slate-800 pt-2 mt-2">
                <span>SCRAP:</span>
                <span>{player.scrap}</span>
              </div>
            </div>

            {/* SKILL MANAGEMENT UI */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 mb-2 flex justify-between">
                <span>MEMORY BANK (RAM)</span>
                <span>{activeBot.activeSkills.length} / 3</span>
              </h3>
              
              <div className="space-y-1 mb-3">
                 {activeBot.activeSkills.map(skillId => {
                   const skill = SKILLS_DB[skillId];
                   return (
                     <div key={skillId} className="flex justify-between items-center p-2 bg-cyan-950/30 border border-cyan-800 rounded">
                       <div>
                          <div className="text-xs font-bold text-cyan-400">{skill.name}</div>
                          <div className="text-[10px] text-slate-500">{skill.type}</div>
                       </div>
                       <button 
                        onClick={() => onEquipSkill(skillId, false)}
                        className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700"
                       >UNLOAD</button>
                     </div>
                   )
                 })}
                 {activeBot.activeSkills.length === 0 && <div className="text-[10px] text-slate-600 italic">No active skills.</div>}
              </div>

              <h3 className="text-xs font-bold text-slate-400 mb-2">STORAGE</h3>
              <div className="space-y-1">
                 {activeBot.storedSkills.length === 0 && <div className="text-[10px] text-slate-600 italic">Storage empty.</div>}
                 {activeBot.storedSkills.map(skillId => {
                    const skill = SKILLS_DB[skillId];
                    return (
                      <div key={skillId} className="flex justify-between items-center p-2 bg-slate-900 border border-slate-800 rounded opacity-80">
                        <div>
                            <div className="text-xs font-bold text-slate-400">{skill.name}</div>
                            <div className="text-[10px] text-slate-600">{skill.type}</div>
                        </div>
                        {activeBot.activeSkills.length < 3 ? (
                          <button 
                            onClick={() => onEquipSkill(skillId, true)}
                            className="text-[10px] bg-slate-800 text-green-400 px-2 py-1 rounded hover:bg-slate-700"
                          >LOAD</button>
                        ) : (
                          <span className="text-[10px] text-red-900">RAM FULL</span>
                        )}
                      </div>
                    )
                 })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 mb-2">INVENTORY</h3>
              {player.inventory.length === 0 && <p className="text-xs text-slate-600 italic">Empty</p>}
              {player.inventory.map(item => (
                 <button 
                    key={item.id}
                    onClick={() => item.effect !== 'QUEST' && onUseItem(item, player.activeSlot)}
                    className={`w-full mb-2 p-2 bg-slate-800 border border-slate-700 rounded flex justify-between items-center ${item.effect === 'QUEST' ? 'border-orange-500/50' : 'hover:border-cyan-500'}`}
                 >
                    <div className="text-left">
                      <div className={`text-sm font-bold ${item.effect === 'QUEST' ? 'text-orange-300' : 'text-cyan-200'}`}>{item.name} x{item.count}</div>
                      <div className="text-[10px] text-slate-400">{item.description}</div>
                    </div>
                    {item.effect !== 'QUEST' && <span className="text-xs text-cyan-600">USE</span>}
                 </button>
              ))}
            </div>
          </>
        )}

        {/* Team Tab */}
        {!campMode && tab === 'TEAM' && (
           <div className="space-y-3">
             {player.team.map((bot, idx) => (
               <div key={bot.id} className={`p-3 rounded border ${idx === player.activeSlot ? 'bg-cyan-900/20 border-cyan-500' : 'bg-slate-800 border-slate-700'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className={`font-bold ${bot.isDefeated ? 'text-red-500' : 'text-cyan-400'}`}>
                        {bot.name} {bot.isDefeated && '(DESTROYED)'}
                      </div>
                      <div className="text-xs text-slate-500 uppercase">{bot.class} | LVL {bot.level}</div>
                      {bot.personality && <div className="text-[10px] text-slate-500 italic">"{bot.personality}"</div>}
                    </div>
                    {idx !== player.activeSlot && !bot.isDefeated && (
                      <button 
                        onClick={() => onSwitchBot(idx)}
                        className="text-[10px] bg-slate-700 hover:bg-cyan-700 text-white px-2 py-1 rounded"
                      >
                        MAKE ACTIVE
                      </button>
                    )}
                    {idx === player.activeSlot && <span className="text-[10px] bg-cyan-800 text-cyan-100 px-2 py-1 rounded">ACTIVE</span>}
                  </div>
                  
                  <div className="h-1 bg-slate-900 rounded overflow-hidden mb-1">
                     <div className={`h-full ${bot.isDefeated ? 'bg-red-900' : 'bg-green-500'}`} style={{ width: `${(bot.hp / bot.maxHp) * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-right text-slate-400">{bot.hp}/{bot.maxHp}</div>
               </div>
             ))}
           </div>
        )}

        {/* Fabricator Tab */}
        {!campMode && tab === 'FAB' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-4">
              SCRAP AVAILABLE: {player.scrap}
            </div>

            <button 
              onClick={onHeal}
              disabled={!canHeal}
              className={`w-full text-left p-2 rounded border transition-all flex justify-between items-center group ${
                canHeal 
                ? 'bg-slate-800 border-green-900 hover:border-green-500 hover:bg-slate-700' 
                : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="text-green-400 font-bold text-sm group-hover:text-green-300">QUICK REPAIR</div>
                <div className="text-slate-500 text-xs">Repair Active Bot</div>
              </div>
              <div className="text-yellow-600 font-bold text-sm">15</div>
            </button>

            <div className="h-px bg-slate-700 my-2"></div>
            <div className="text-xs text-slate-500 mb-2 uppercase">Install Modules on {activeBot.name}</div>

            {AVAILABLE_MODULES.map(mod => {
              const owned = hasModule(mod.id);
              const canBuy = !owned && player.scrap >= mod.cost;

              return (
                <button 
                  key={mod.id}
                  onClick={() => onBuyModule(mod)}
                  disabled={!canBuy}
                  className={`w-full text-left p-2 rounded border transition-all flex justify-between items-start group ${
                    owned 
                    ? 'bg-slate-800 border-cyan-900 opacity-70' 
                    : canBuy
                      ? 'bg-slate-800 border-slate-600 hover:border-cyan-400 hover:bg-slate-750'
                      : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className={`font-bold text-sm ${owned ? 'text-cyan-600' : 'text-cyan-400'} group-hover:text-cyan-300`}>
                      {mod.name} {owned && '(INSTALLED)'}
                    </div>
                    <div className="text-slate-500 text-[10px] leading-tight mt-1">{mod.description}</div>
                  </div>
                  {!owned && <div className="text-yellow-600 font-bold text-sm">{mod.cost}</div>}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* Controls */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 shrink-0 select-none relative">
        
        {/* D-Pad */}
        <div className="grid grid-cols-3 gap-2 max-w-[160px] mx-auto relative z-10">
          <div />
          <button 
            className="bg-slate-800 hover:bg-cyan-900 active:bg-cyan-600 h-12 rounded-t-lg border-b-4 border-slate-900 active:border-b-0 active:mt-1 transition-all flex items-center justify-center text-cyan-400"
            onClick={() => onMove(0, -1)}
          >▲</button>
          <div />
          
          <button 
            className="bg-slate-800 hover:bg-cyan-900 active:bg-cyan-600 h-12 rounded-l-lg border-b-4 border-slate-900 active:border-b-0 active:mt-1 transition-all flex items-center justify-center text-cyan-400"
            onClick={() => onMove(-1, 0)}
          >◀</button>
          <div className="bg-slate-900 rounded flex items-center justify-center">
             <div className="w-2 h-2 rounded-full bg-cyan-500/20"></div>
          </div>
          <button 
            className="bg-slate-800 hover:bg-cyan-900 active:bg-cyan-600 h-12 rounded-r-lg border-b-4 border-slate-900 active:border-b-0 active:mt-1 transition-all flex items-center justify-center text-cyan-400"
            onClick={() => onMove(1, 0)}
          >▶</button>

          <div />
          <button 
            className="bg-slate-800 hover:bg-cyan-900 active:bg-cyan-600 h-12 rounded-b-lg border-b-4 border-slate-900 active:border-b-0 active:mt-1 transition-all flex items-center justify-center text-cyan-400"
            onClick={() => onMove(0, 1)}
          >▼</button>
          <div />
        </div>

        {/* Action Button */}
        <button 
          onClick={onInteract}
          className={`absolute right-6 bottom-16 w-16 h-16 rounded-full border-4 active:scale-95 flex items-center justify-center shadow-lg ${
             nearPod 
             ? 'bg-green-700 border-green-900 active:bg-green-600 animate-pulse' 
             : 'bg-yellow-700 border-yellow-900 active:bg-yellow-600'
          }`}
        >
          <span className="font-bold text-yellow-100 text-xs">{nearPod ? 'POD' : 'ACT'}</span>
        </button>

      </div>
    </div>
  );
};

export default ExplorationInterface;
