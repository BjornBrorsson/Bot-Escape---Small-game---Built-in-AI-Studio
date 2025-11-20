export enum GameState {
  EXPLORING = 'EXPLORING',
  COMBAT = 'COMBAT',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  CAMP_MENU = 'CAMP_MENU'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  hp: number;
  maxHp: number;
  name: string;
}

export type DamageType = 'KINETIC' | 'THERMAL' | 'ELECTRIC' | 'NONE';
export type AnimationType = 'LASER' | 'EXPLOSION' | 'RAILGUN' | 'ELECTRIC' | 'SHIELD' | 'REPAIR' | 'MELEE';

export interface CombatEffect {
  type: AnimationType;
  startTime: number;
  duration: number;
  source: 'PLAYER' | 'ENEMY';
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'ATTACK' | 'SUPPORT' | 'TECH' | 'DEFENSE';
  damageType?: DamageType;
  animation: AnimationType;
  damage?: number; // Base damage or multiplier
  cost?: number; // Could be energy, currently unused
  effect?: string;
  minLevel: number;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'PASSIVE' | 'ACTIVE';
  effectId: 'DMG_BOOST' | 'AUTO_REPAIR' | 'SHIELD' | 'SCANNER' | 'HULL_PLATING';
  value: number;
}

export interface Bot extends Entity {
  id: string;
  class: 'SCOUT' | 'ASSAULT' | 'TECH' | 'TANK';
  level: number;
  xp: number;
  maxXp: number;
  modules: Module[];
  activeSkills: string[]; // IDs of skills in RAM
  storedSkills: string[]; // IDs of skills in Storage
  tempShield?: number;
  isDefeated: boolean;
  personality?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  effect: 'HEAL' | 'XP' | 'REVIVE' | 'QUEST';
  value: number;
  count: number;
}

export interface QuestState {
  stage: 'FIND_POD' | 'GATHER_PARTS' | 'DEFEAT_GUARDIAN' | 'REPAIR_POD' | 'COMPLETED';
  partsFound: number;
  partsNeeded: number;
  hasOmniTool: boolean;
}

export interface PlayerStats {
  stepsTaken: number;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  scrapsCollected: number;
  botsRecruited: number;
  botsLost: number;
  skillsUsed: Record<string, number>;
  mostUsedBotId: string;
  questsCompleted: number;
  modulesInstalled: number;
}

export interface Player {
  pos: Position;
  facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  scrap: number;
  team: Bot[];
  reserves: Bot[]; // Bots at base camp
  activeSlot: number;
  inventory: Item[];
  visitedPOIs: Record<string, boolean>;
  quest: QuestState;
  stats: PlayerStats;
}

export interface Enemy extends Entity {
  id?: string;
  type: 'SCRAP_DRONE' | 'HEAVY_MECH' | 'CORE_GUARDIAN' | 'NANITE_SWARM' | 'JUNKER_BEHEMOTH' | 'SHIELD_BREAKER' | 'TESLA_DROID' | 'SNIPER_BOT';
  class: 'SCOUT' | 'ASSAULT' | 'TECH' | 'TANK'; // For weakness calculation
  xpValue: number;
  isBoss?: boolean;
}

export interface CombatLog {
  message: string;
  type: 'info' | 'player' | 'enemy' | 'gain' | 'danger';
  id: number;
}

export enum TerrainType {
  FLOOR = 0,
  WALL = 1,
  DEBRIS = 2,
  ACID_POOL = 3
}

export enum POIType {
  NONE = 0,
  CACHE = 1,
  DERELICT = 2,
  NPC = 3,
  POD = 4,
  GUARDIAN = 5
}