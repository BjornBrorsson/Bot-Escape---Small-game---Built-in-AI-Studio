
import { Module, TerrainType, POIType, Bot, Item, Enemy, Skill } from './types';

export const TILE_SIZE = 48;
export const VIEW_WIDTH = 15; 
export const VIEW_HEIGHT = 11;

export const POD_POS = { x: 0, y: 0 };

export const ACID_DAMAGE = 10;

export const COLORS = {
  gridLines: '#1e293b',
  groundDark: '#0f172a',
  groundLight: '#1e293b',
  wallDark: '#020617',
  wallLight: '#334155',
  neonBlue: '#06b6d4',
  neonRed: '#ef4444',
  neonGreen: '#22c55e',
  neonPurple: '#a855f7',
  neonYellow: '#facc15',
  rust: '#7c2d12',
  acid: '#4ade80',
  scoutBody: '#3b82f6',
  tankBody: '#15803d',
  techBody: '#7e22ce',
  enemyBody: '#b91c1c',
  pod: '#f97316',
};

export const ENCOUNTER_CHANCE_BASE = 0.08; 

// Skill Database
export const SKILLS_DB: Record<string, Skill> = {
  // Scout Skills
  LASER_SHOT: { id: 'LASER_SHOT', name: 'Laser Shot', description: 'Fast, reliable thermal damage.', type: 'ATTACK', minLevel: 1 },
  TARGET_LOCK: { id: 'TARGET_LOCK', name: 'Target Lock', description: 'Next attack deals double damage.', type: 'SUPPORT', minLevel: 3 },
  QUICK_DASH: { id: 'QUICK_DASH', name: 'Quick Dash', description: 'Avoid next attack + Small Dmg.', type: 'DEFENSE', minLevel: 5 },
  
  // Assault Skills
  BURST_FIRE: { id: 'BURST_FIRE', name: 'Burst Fire', description: 'Fire 3 shots. Low accuracy.', type: 'ATTACK', minLevel: 1 },
  GRENADE: { id: 'GRENADE', name: 'Plasma Grenade', description: 'High damage explosive.', type: 'ATTACK', minLevel: 3 },
  OVERCLOCK: { id: 'OVERCLOCK', name: 'Overclock', description: 'Take 10 dmg, gain massive Attack.', type: 'SUPPORT', minLevel: 5 },

  // Tank Skills
  BASH: { id: 'BASH', name: 'Piston Bash', description: 'Melee hit. Stuns weak foes.', type: 'ATTACK', minLevel: 1 },
  REINFORCE: { id: 'REINFORCE', name: 'Reinforce', description: 'Gain 40 Temp Shield.', type: 'DEFENSE', minLevel: 3 },
  TAUNT: { id: 'TAUNT', name: 'Aggro Shout', description: 'Enemy deals less dmg next turn.', type: 'DEFENSE', minLevel: 5 },

  // Tech Skills
  ZAP: { id: 'ZAP', name: 'Arc Zap', description: 'Bypasses shields/armor.', type: 'TECH', minLevel: 1 },
  QUICK_FIX: { id: 'QUICK_FIX', name: 'Quick Fix', description: 'Restore 30 HP.', type: 'SUPPORT', minLevel: 3 },
  VIRUS: { id: 'VIRUS', name: 'System Virus', description: 'Massive Dmg over 3 turns.', type: 'TECH', minLevel: 5 },
  
  // Universal / Special
  HACK: { id: 'HACK', name: 'System Hack', description: 'Risky. High Dmg or Fail.', type: 'TECH', minLevel: 1 },
};

export const BOT_CLASSES = {
  SCOUT: { name: 'Scout', hp: 80, class: 'SCOUT', startingSkills: ['LASER_SHOT', 'HACK'] },
  ASSAULT: { name: 'Assault', hp: 120, class: 'ASSAULT', startingSkills: ['BURST_FIRE', 'HACK'] },
  TANK: { name: 'Tank', hp: 150, class: 'TANK', startingSkills: ['BASH', 'HACK'] },
  TECH: { name: 'Tech', hp: 70, class: 'TECH', startingSkills: ['ZAP', 'HACK'] }
};

export const UNIQUE_NAMES = [
  "Rusty", "Sparky", "Bolt", "Gearhead", "Circuit", "Omega", "Unit-734", "Glitch", "Prime", "Echo", "Vortex", "Ironclad"
];

export const PERSONALITIES = [
  "Cheerful beep.", "Grumpy hum.", "Stoic silence.", "Manic clicking.", "Philosophical whir."
];

export const INITIAL_PLAYER_STATE = {
  pos: { x: 2, y: 2 }, // Start slightly away from pod
  facing: 'DOWN' as const,
  scrap: 0,
  activeSlot: 0,
  inventory: [
    { id: 'repair_kit', name: 'Repair Kit', description: 'Heals 50 HP', effect: 'HEAL', value: 50, count: 2 }
  ] as Item[],
  visitedPOIs: {},
  team: [
    {
      id: 'starter_bot',
      name: 'Scout-01',
      class: 'SCOUT',
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      maxXp: 100,
      modules: [],
      activeSkills: ['LASER_SHOT', 'HACK'],
      storedSkills: [],
      isDefeated: false,
      personality: "Ready for duty."
    }
  ] as Bot[],
  reserves: [],
  quest: {
    stage: 'FIND_POD',
    partsFound: 0,
    partsNeeded: 3,
    hasOmniTool: false
  }
};

// Deterministic pseudo-random terrain generation
export const getTerrainAt = (x: number, y: number): TerrainType => {
  // Safe zone around Pod
  if (Math.abs(x) <= 2 && Math.abs(y) <= 2) return TerrainType.FLOOR;

  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const hash = n - Math.floor(n);
  
  if (hash > 0.85) return TerrainType.WALL;
  if (hash > 0.80) return TerrainType.DEBRIS;
  if (hash < 0.03) return TerrainType.ACID_POOL;
  
  return TerrainType.FLOOR;
};

// Deterministic POI generation
export const getPOIAt = (x: number, y: number): POIType => {
  if (x === POD_POS.x && y === POD_POS.y) return POIType.POD;
  
  const terrain = getTerrainAt(x, y);
  if (terrain !== TerrainType.FLOOR) return POIType.NONE;
  if (Math.abs(x) < 5 && Math.abs(y) < 5) return POIType.NONE; // Keep spawn clear

  // Different seed for POIs
  const n = Math.cos(x * 43.234 + y * 12.123) * 91238.123;
  const hash = n - Math.floor(n);

  if (hash > 0.985) return POIType.CACHE;
  if (hash > 0.975) return POIType.DERELICT;
  if (hash > 0.970) return POIType.NPC;

  return POIType.NONE;
};

export const AVAILABLE_MODULES: Module[] = [
  {
    id: 'hull_plating',
    name: 'Titanium Plating',
    description: 'Increases Max HP by 50.',
    cost: 100,
    type: 'PASSIVE',
    effectId: 'HULL_PLATING',
    value: 50
  },
  {
    id: 'targeting_chip',
    name: 'Combat CPU',
    description: 'Increases Attack damage by 10.',
    cost: 150,
    type: 'PASSIVE',
    effectId: 'DMG_BOOST',
    value: 10
  },
  {
    id: 'shield_gen',
    name: 'Shield Generator',
    description: 'Active Skill: Gain 30 Temporary Shield.',
    cost: 250,
    type: 'ACTIVE',
    effectId: 'SHIELD',
    value: 30
  },
  {
    id: 'auto_repair',
    name: 'Nanite Hive',
    description: 'Heal 10 HP after every battle.',
    cost: 300,
    type: 'PASSIVE',
    effectId: 'AUTO_REPAIR',
    value: 10
  }
];

export const BOSS_ENEMY: Enemy = {
  type: 'CORE_GUARDIAN',
  name: 'THE WARDEN',
  hp: 500,
  maxHp: 500,
  xpValue: 1000,
  isBoss: true
};

export const ITEMS_DB: Record<string, Item> = {
  REPAIR_KIT: { id: 'repair_kit', name: 'Repair Kit', description: 'Heal 50 HP', effect: 'HEAL', value: 50, count: 1 },
  XP_CHIP: { id: 'xp_chip', name: 'Data Chip', description: 'Grant 50 XP', effect: 'XP', value: 50, count: 1 },
  BATTERY: { id: 'battery', name: 'Power Cell', description: 'Revive Bot (25% HP)', effect: 'REVIVE', value: 0.25, count: 1 },
  QUEST_PART: { id: 'hyperdrive_part', name: 'Hyperdrive Flux', description: 'Required to repair the Pod.', effect: 'QUEST', value: 1, count: 1 },
  OMNI_TOOL: { id: 'omni_tool', name: 'The Omni-Tool', description: 'The master key to the Escape Pod.', effect: 'QUEST', value: 1, count: 1 }
};
