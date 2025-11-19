import React, { useState } from 'react';
import { Player, Enemy } from '../types';
import { SKILLS_DB } from '../constants';

interface CombatInterfaceProps {
  player: Player;
  enemy: Enemy | null;
  onAction: (action: string) => void;
  logs: any[];
}

const CombatInterface: React.FC<CombatInterfaceProps> = ({ player, enemy, onAction, logs }) => {
  const [menuState, setMenuState] = useState<'MAIN' | 'SWITCH' | 'ITEMS'>('MAIN');

  if (!enemy) return null;

  const activeBot = player.team[player.activeSlot];
  const hasShieldMod = activeBot.modules.some(m => m.effectId === 'SHIELD');
  
  // Hack Chance
  const hackChance = enemy.isBoss ? 0 : Math.max(0, Math.min(0.9, (1 - (enemy.hp / enemy.maxHp)) * 1.5));
  const hackLabel = hackChance > 0.7 ? 'HIGH' : hackChance > 0.3 ? 'MED' : 'LOW';
  const hackColor = hackChance > 0.5 ? 'text-green-400' : 'text-red-400';

  const handleSwitch = (index: number) => {
    onAction(`SWITCH:${index}`);
    setMenuState('MAIN');
  };

  const handleUseItem = (itemId: string) => {
    onAction(`ITEM:${itemId}`);
    setMenuState('MAIN');
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l-4 border-red-900/30 p-4 font-mono overflow-hidden">
      
      <div className="mb-4 border-b-2 border-red-900/50 pb-2 flex justify-between items-center">
        <h1 className="text-xl font-bold text-red-500 tracking-widest">COMBAT MODE</h1>
        <span className="text-xs text-red-400">TURN: PLAYER</span>
      </div>

      {/* Enemy Stats */}
      <div className="bg-red-950/20 border border-red-900/50 p-3 rounded mb-4 relative">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className={`text-lg font-bold uppercase ${enemy.isBoss ? 'text-orange-500 animate-pulse' : 'text-red-400'}`}>{enemy.name}</h3>
          <span className="text-xs text-red-300/50">{enemy.isBoss ? 'GUARDIAN CLASS' : 'HOSTILE'}</span>
        </div>
        <div className="w-full bg-slate-900 h-3 rounded-sm border border-red-900/30 overflow-hidden">
          <div 
            className="bg-red-600 h-full transition-all duration-300" 
            style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
          ></div>
        </div>
        <p className="text-right text-xs mt-1 text-red-400/60">{enemy.hp} / {enemy.maxHp}</p>
        
        {/* Hack Overlay Info */}
        {!enemy.isBoss && (
          <div className="absolute top-2 right-2 opacity-50 text-[10px]">
             RECRUIT CHANCE: <span className={hackColor}>{hackLabel}</span>
          </div>
        )}
      </div>

      {/* Active Bot Status */}
      <div className="bg-cyan-950/20 border border-cyan-900/50 p-3 rounded mb-4">
         <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-sm text-cyan-400 font-bold">{activeBot.name} (LVL {activeBot.level})</h3>
          <span className="text-xs text-cyan-300/50">HP {activeBot.hp}/{activeBot.maxHp}</span>
        </div>
         <div className="w-full bg-slate-900 h-2 rounded-sm border border-cyan-900/30 overflow-hidden mb-2">
          <div 
            className="bg-cyan-500 h-full transition-all duration-300" 
            style={{ width: `${(activeBot.hp / activeBot.maxHp) * 100}%` }}
          ></div>
        </div>
         {activeBot.tempShield && activeBot.tempShield > 0 ? (
           <div className="text-xs text-cyan-300 mb-1">SHIELD ACTIVE: {activeBot.tempShield}</div>
         ) : null}
      </div>

      {/* Action Grid */}
      <div className="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar">
        
        {menuState === 'MAIN' && (
          <div className="grid grid-cols-1 gap-2">
            {/* Active RAM Skills */}
            {activeBot.activeSkills.map(skillId => {
               const skill = SKILLS_DB[skillId];
               if (!skill) return null;
               return (
                <button
                  key={skill.id}
                  onClick={() => onAction(skill.id)}
                  className={`
                    relative group border py-2 px-3 rounded text-left transition-all active:scale-95
                    ${skill.type === 'ATTACK' ? 'bg-red-900/20 border-red-500/50 text-red-400 hover:bg-red-900/40' : 
                      skill.type === 'TECH' ? 'bg-purple-900/20 border-purple-500/50 text-purple-400 hover:bg-purple-900/40' :
                      skill.type === 'DEFENSE' ? 'bg-blue-900/20 border-blue-500/50 text-blue-400 hover:bg-blue-900/40' :
                      'bg-green-900/20 border-green-500/50 text-green-400 hover:bg-green-900/40'}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase tracking-wider text-sm">{skill.name}</span>
                  </div>
                  <div className="text-xs opacity-70 mt-1 leading-tight">
                    {skill.description}
                  </div>
                </button>
               )
            })}
            
            {!enemy.isBoss && (
               <button 
                  onClick={() => onAction('RECRUIT')}
                  className={`bg-yellow-900/20 border border-yellow-500/50 hover:bg-yellow-900/40 text-yellow-400 py-2 px-3 rounded text-left transition-all active:scale-95`}
                >
                  <span className="font-bold uppercase tracking-wider text-sm block">ATTEMPT RECRUIT</span>
                  <div className="text-xs opacity-70 mt-1 leading-tight">
                    Hack logic. Success depends on low HP.
                  </div>
                </button>
            )}

            {hasShieldMod && (
              <button 
                onClick={() => onAction('SHIELD_MOD')}
                className="bg-cyan-900/20 border border-cyan-500/50 hover:bg-cyan-900/40 text-cyan-400 py-2 px-3 rounded text-left transition-all active:scale-95"
              >
                <span className="font-bold uppercase tracking-wider text-sm block">Shield Gen (Module)</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 mt-1">
                <button 
                  onClick={() => setMenuState('ITEMS')}
                  className="bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 py-2 px-3 rounded text-left transition-all active:scale-95"
                >
                  <span className="font-bold uppercase tracking-wider text-sm block">ITEMS</span>
                </button>
                
                <button 
                  onClick={() => setMenuState('SWITCH')}
                  className="bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 py-2 px-3 rounded text-left transition-all active:scale-95"
                >
                  <span className="font-bold uppercase tracking-wider text-sm block">SWITCH BOT</span>
                </button>
            </div>
          </div>
        )}

        {menuState === 'SWITCH' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-2">SELECT UNIT TO DEPLOY (COSTS 1 TURN):</div>
            {player.team.map((bot, idx) => (
              <button
                key={bot.id}
                disabled={bot.isDefeated || idx === player.activeSlot}
                onClick={() => handleSwitch(idx)}
                className={`w-full text-left p-2 border rounded flex justify-between items-center ${
                  bot.isDefeated 
                    ? 'border-red-900 bg-red-950/20 opacity-50 cursor-not-allowed' 
                    : idx === player.activeSlot
                    ? 'border-cyan-500 bg-cyan-900/20 cursor-default'
                    : 'border-slate-600 bg-slate-800 hover:border-cyan-400'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-cyan-400">{bot.name}</div>
                  <div className="text-xs text-slate-400">{bot.class} - HP {bot.hp}/{bot.maxHp}</div>
                </div>
                {idx === player.activeSlot && <span className="text-[10px] bg-cyan-900 text-cyan-300 px-1 rounded">ACTIVE</span>}
                {bot.isDefeated && <span className="text-[10px] bg-red-900 text-red-300 px-1 rounded">DOWN</span>}
              </button>
            ))}
            <button 
              onClick={() => setMenuState('MAIN')}
              className="w-full mt-2 py-2 text-center text-xs text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700 rounded"
            >
              CANCEL
            </button>
          </div>
        )}

        {menuState === 'ITEMS' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-2">SELECT ITEM (COSTS 1 TURN):</div>
            {player.inventory.filter(i => i.effect !== 'QUEST').length === 0 && (
              <div className="text-slate-600 text-sm text-center italic p-4">Inventory Empty</div>
            )}
            {player.inventory.filter(i => i.effect !== 'QUEST').map((item, idx) => (
               <button
                key={item.id}
                onClick={() => handleUseItem(item.id)}
                className="w-full text-left p-2 border border-slate-600 bg-slate-800 hover:border-cyan-400 rounded flex justify-between items-center"
               >
                  <div>
                    <div className="font-bold text-sm text-cyan-200">{item.name} x{item.count}</div>
                    <div className="text-[10px] text-slate-400">{item.description}</div>
                  </div>
                  <span className="text-xs text-cyan-600">USE</span>
               </button>
            ))}
             <button 
              onClick={() => setMenuState('MAIN')}
              className="w-full mt-2 py-2 text-center text-xs text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700 rounded"
            >
              CANCEL
            </button>
          </div>
        )}

      </div>

      {/* Logs */}
      <div className="h-32 bg-black border border-slate-800 p-2 rounded overflow-y-auto text-xs font-mono shadow-inner shrink-0 custom-scrollbar">
          {logs.slice().reverse().map((log) => (
            <div key={log.id} className={`animate-log-entry mb-1 pl-2 border-l-2 ${
              log.type === 'enemy' ? 'border-red-500/50 bg-red-950/10 text-red-400' : 
              log.type === 'player' ? 'border-cyan-500/50 bg-cyan-950/10 text-cyan-300' : 
              log.type === 'gain' ? 'border-yellow-500/50 bg-yellow-950/10 text-yellow-400' : 'border-slate-700 bg-slate-900/30 text-slate-500'
            } py-1`}>
              <span className="opacity-50 mr-1">{'>'}</span>{log.message}
            </div>
          ))}
      </div>

    </div>
  );
};

export default CombatInterface;