
import React, { useState } from 'react';
import { Player, Module, Bot, Item } from '../types';
import { AVAILABLE_MODULES, POD_POS, SKILLS_DB } from '../constants';

interface ExplorationInterfaceProps {
  player: Player;
  onHeal: () => void;
  onBuyModule: (module: Module) => void;
  onSwitchBot: (index: number) => void;
  onUseItem: (item: Item, botIndex: number) => void;
  onSwapReserve: (teamIndex: number, reserveIndex: number) => void;
  onEquipSkill: (skillId: string, isEquipping: boolean) => void;
  onInteract: () => void;
  interactionLabel: string | null;
}

const ExplorationInterface: React.FC<ExplorationInterfaceProps> = ({ 
  player, onHeal, onBuyModule, onSwitchBot, onUseItem, onSwapReserve, onEquipSkill, onInteract, interactionLabel
}) => {
  const [tab, setTab] = useState<'STATUS' | 'TEAM' | 'FAB'>('STATUS');
  const [skillMode, setSkillMode] = useState(false); // Toggle for Skill Management

  const activeBot = player.team[player.activeSlot];
  const isAtPod = player.pos.x === POD_POS.x && player.pos.y === POD_POS.y;

  // Camp Mode (Reserves) - Only visible when at POD and selecting TEAM tab
  if (isAtPod && tab === 'TEAM') {
    return (
      <div className="h-full flex flex-col bg-slate-900 border-l-4 border-slate-700 p-4 font-mono overflow-hidden">
        <div className="mb-4 border-b-2 border-slate-700 pb-2 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-orange-500 tracking-widest">BASE CAMP</h2>
          <button onClick={() => setTab('STATUS')} className="text-xs text-slate-400 border px-2 py-1 rounded hover:bg-slate-800">CLOSE</button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar touch-pan-y">
           <div className="mb-4">
              <h3 className="text-cyan-400 font-bold mb-2 text-sm">ACTIVE SQUAD (MAX 3)</h3>
              {player.team.map((bot, idx) => (
                <div key={bot.id} className="flex justify-between items-center bg-slate-800 p-3 mb-2 rounded border border-cyan-900/50">
                   <div>
                     <div className="text-sm font-bold text-white">{bot.name}</div>
                     <div className="text-xs text-slate-400">{bot.class} LVL {bot.level}</div>
                   </div>
                   <button 
                     onClick={() => onSwapReserve(idx, -1)}
                     className="text-xs bg-slate-700 hover:bg-orange-700 text-white px-3 py-2 rounded"
                   >
                     TO RESERVE
                   </button>
                </div>
              ))}
           </div>

           <div>
              <h3 className="text-orange-400 font-bold mb-2 text-sm">RESERVES</h3>
              {player.reserves.length === 0 && <div className="text-slate-600 italic text-xs">No bots in reserve.</div>}
              {player.reserves.map((bot, idx) => (
                <div key={bot.id} className="flex justify-between items-center bg-slate-800 p-3 mb-2 rounded border border-orange-900/50">
                   <div>
                     <div className="text-sm font-bold text-white">{bot.name}</div>
                     <div className="text-xs text-slate-400">{bot.class} LVL {bot.level}</div>
                   </div>
                   <button 
                     onClick={() => onSwapReserve(-1, idx)}
                     className="text-xs bg-slate-700 hover:bg-cyan-700 text-white px-3 py-2 rounded"
                   >
                     TO SQUAD
                   </button>
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l-4 border-slate-700 p-4 font-mono overflow-hidden relative">
      
      {/* Header */}
      <div className="mb-4 border-b-2 border-slate-700 pb-2 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-200 tracking-widest">DATA PAD</h2>
          <div className="text-xs text-slate-400">
             SCRAP: <span className="text-yellow-400 text-base">{player.scrap}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500">COORDS</div>
          <div className="text-xs text-cyan-400">{player.pos.x}, {player.pos.y}</div>
        </div>
      </div>

      {/* Quest Tracker */}
      <div className="bg-slate-800/50 p-2 rounded mb-4 border border-slate-700 shrink-0">
         <div className="text-[10px] text-slate-500 uppercase mb-1">Current Objective</div>
         <div className="text-sm text-orange-300 leading-tight">
            {player.quest.stage === 'FIND_POD' && "Locate the Escape Pod signal."}
            {player.quest.stage === 'GATHER_PARTS' && `Find Hyperdrive Flux: ${player.quest.partsFound}/${player.quest.partsNeeded}`}
            {player.quest.stage === 'DEFEAT_GUARDIAN' && "Defeat the Core Guardian!"}
            {player.quest.stage === 'REPAIR_POD' && "Install Omni-Tool at Pod."}
            {player.quest.stage === 'COMPLETED' && "Launch Sequence Ready."}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 shrink-0">
        {['STATUS', 'TEAM', 'FAB'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`flex-1 py-3 text-sm font-bold rounded transition-colors touch-manipulation ${
              tab === t ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar touch-pan-y pb-16">
        
        {tab === 'STATUS' && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-3 rounded border border-slate-600">
               <div className="flex justify-between items-start">
                 <div>
                   <h3 className="text-lg text-white font-bold">{activeBot.name}</h3>
                   <span className="text-xs text-cyan-400 uppercase">{activeBot.class} CLASS</span>
                 </div>
                 <div className="text-right">
                   <div className="text-2xl font-bold text-white">{activeBot.level}</div>
                   <div className="text-[10px] text-slate-400">LEVEL</div>
                 </div>
               </div>
               
               <div className="mt-3 space-y-1">
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-400">HP</span>
                    <span className="text-slate-200">{activeBot.hp} / {activeBot.maxHp}</span>
                 </div>
                 <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{width: `${(activeBot.hp/activeBot.maxHp)*100}%`}}></div>
                 </div>

                 <div className="flex justify-between text-xs mt-2">
                    <span className="text-slate-400">XP</span>
                    <span className="text-slate-200">{activeBot.xp} / {activeBot.maxXp}</span>
                 </div>
                 <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{width: `${(activeBot.xp/activeBot.maxXp)*100}%`}}></div>
                 </div>
               </div>
               
               <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="text-xs text-slate-500 italic">"{activeBot.personality || 'System Normal.'}"</div>
               </div>
            </div>

            {/* Skill Management */}
            <div className="bg-slate-800 p-3 rounded border border-slate-600">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-cyan-300">MEMORY BANK (SKILLS)</h4>
                <button 
                   onClick={() => setSkillMode(!skillMode)} 
                   className="text-[10px] border border-slate-500 px-2 py-1 rounded hover:bg-slate-700 text-slate-300"
                >
                  {skillMode ? 'DONE' : 'EDIT'}
                </button>
              </div>

              <div className="mb-2">
                 <div className="text-[10px] text-slate-500 mb-1">ACTIVE RAM ({activeBot.activeSkills.length}/3)</div>
                 <div className="space-y-1">
                    {activeBot.activeSkills.map(skillId => (
                       <div key={skillId} className="flex justify-between items-center bg-slate-900/50 px-2 py-2 rounded border border-green-900/50">
                          <span className="text-xs text-green-400">{SKILLS_DB[skillId]?.name || skillId}</span>
                          {skillMode && (
                            <button onClick={() => onEquipSkill(skillId, false)} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1">STORE</button>
                          )}
                       </div>
                    ))}
                 </div>
              </div>

              <div>
                 <div className="text-[10px] text-slate-500 mb-1">STORAGE</div>
                 {activeBot.storedSkills.length === 0 && <div className="text-xs text-slate-600 italic">Empty</div>}
                 <div className="space-y-1">
                    {activeBot.storedSkills.map(skillId => (
                       <div key={skillId} className="flex justify-between items-center bg-slate-900/50 px-2 py-2 rounded border border-slate-700">
                          <span className="text-xs text-slate-400">{SKILLS_DB[skillId]?.name || skillId}</span>
                          {skillMode && activeBot.activeSkills.length < 3 && (
                            <button onClick={() => onEquipSkill(skillId, true)} className="text-[10px] text-cyan-400 hover:text-cyan-300 px-2 py-1">EQUIP</button>
                          )}
                       </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'TEAM' && (
          <div className="space-y-4">
            <div className="space-y-2">
               <h3 className="text-xs font-bold text-slate-500 uppercase">Squad Deployment</h3>
               {player.team.map((bot, idx) => (
                 <button
                   key={bot.id}
                   onClick={() => onSwitchBot(idx)}
                   className={`w-full text-left p-3 rounded border flex justify-between items-center transition-all active:scale-95 ${
                     idx === player.activeSlot 
                       ? 'bg-cyan-900/20 border-cyan-500' 
                       : 'bg-slate-800 border-slate-600 hover:border-slate-500'
                   }`}
                 >
                   <div>
                     <div className={`text-sm font-bold ${idx === player.activeSlot ? 'text-cyan-400' : 'text-slate-300'}`}>
                       {bot.name}
                     </div>
                     <div className="text-xs text-slate-500">HP: {bot.hp}/{bot.maxHp}</div>
                   </div>
                   {idx === player.activeSlot && <span className="text-[10px] bg-cyan-900 text-cyan-300 px-1 rounded">ACTIVE</span>}
                 </button>
               ))}
               {isAtPod && (
                  <div className="text-xs text-center text-orange-400 mt-2">
                     Camp detected. <br/> Use "Interact" on Pod to manage reserves.
                  </div>
               )}
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-700">
               <h3 className="text-xs font-bold text-slate-500 uppercase">Inventory</h3>
               {player.inventory.length === 0 && (
                 <div className="text-sm text-slate-600 italic text-center py-4">Empty</div>
               )}
               {player.inventory.map((item) => (
                  <div key={item.id} className="bg-slate-800 p-2 rounded border border-slate-600 flex justify-between items-center">
                     <div>
                        <div className="text-sm text-cyan-200">{item.name} <span className="text-slate-500 text-xs">x{item.count}</span></div>
                        <div className="text-[10px] text-slate-500">{item.description}</div>
                     </div>
                     {item.effect !== 'QUEST' && (
                        <button 
                          onClick={() => onUseItem(item, player.activeSlot)}
                          className="text-xs bg-slate-700 hover:bg-cyan-700 text-white px-3 py-2 rounded active:scale-95"
                        >
                          USE
                        </button>
                     )}
                  </div>
               ))}
            </div>
          </div>
        )}

        {tab === 'FAB' && (
          <div className="space-y-3">
            <div className="bg-slate-800 p-3 rounded border border-slate-600 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-green-400">Emergency Repairs</h4>
                <div className="text-xs text-slate-400">Heal 20 HP</div>
              </div>
              <button 
                onClick={onHeal}
                disabled={player.scrap < 15 || activeBot.hp >= activeBot.maxHp}
                className="bg-green-900/30 border border-green-600/50 text-green-400 px-4 py-2 rounded text-xs disabled:opacity-50 active:scale-95"
              >
                15 SCRAP
              </button>
            </div>

            <div className="h-px bg-slate-700 my-2"></div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Install Modules</h3>

            {AVAILABLE_MODULES.map(mod => {
              const alreadyHas = activeBot.modules.some(m => m.id === mod.id);
              return (
                <div key={mod.id} className="bg-slate-800 p-3 rounded border border-slate-600">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-slate-200">{mod.name}</span>
                    <span className="text-xs text-yellow-500">{mod.cost} SCRAP</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{mod.description}</p>
                  <button
                    onClick={() => onBuyModule(mod)}
                    disabled={alreadyHas || player.scrap < mod.cost}
                    className={`w-full py-3 rounded text-xs font-bold transition-all active:scale-95 ${
                      alreadyHas 
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : player.scrap >= mod.cost
                        ? 'bg-cyan-700 hover:bg-cyan-600 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {alreadyHas ? 'INSTALLED' : 'FABRICATE'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* INTERACT BUTTON */}
      {interactionLabel && (
        <div className="absolute bottom-4 left-4 right-4">
          <button 
            onClick={onInteract}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xl py-4 rounded-lg shadow-lg border-2 border-yellow-300 animate-bounce"
          >
            {interactionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExplorationInterface;
