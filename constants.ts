import { Module, TerrainType, POIType, Bot, Item, Enemy, Skill, Player, DamageType } from './types';

export const TILE_SIZE = 48;
export const VIEW_WIDTH = 15; 
export const VIEW_HEIGHT = 11;

// Randomize Pod Position between -100 and 100
export const POD_POS = { 
  x: Math.floor(Math.random() * 201) - 100, 
  y: Math.floor(Math.random() * 201) - 100 
};

export const GUARDIAN_POS = { x: POD_POS.x + 2, y: POD_POS.y };

export const ACID_DAMAGE = 10;

export const SCORE_WEIGHTS = {
  WIN_BONUS: 5000,
  SCRAP: 10,
  RECRUIT: 200,
  DAMAGE_DEALT: 1,
  HEAL: 2,
  MODULE: 150,
  QUEST_STEP: 500,
  BOT_LOST: -500,
  STEP: -1,
  DEFEAT: -1000
};

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

// Type Matchups: [Attacker Type][Defender Class] = Multiplier
// Kinetic > Assault, Thermal > Tech, Electric > Tank
export const DAMAGE_TYPE_CHART: Record<DamageType, Record<string, number>> = {
  KINETIC: { SCOUT: 1.0, ASSAULT: 1.5, TANK: 0.5, TECH: 1.0 },
  THERMAL: { SCOUT: 1.0, ASSAULT: 0.5, TANK: 1.0, TECH: 1.5 },
  ELECTRIC: { SCOUT: 1.0, ASSAULT: 1.0, TANK: 1.5, TECH: 0.5 },
  NONE: { SCOUT: 1, ASSAULT: 1, TANK: 1, TECH: 1 }
};

// Skill Database
export const SKILLS_DB: Record<string, Skill> = {
  // Scout Skills (Balanced / Utility)
  LASER_SHOT: { id: 'LASER_SHOT', name: 'Laser Shot', description: 'Thermal damage. Good vs Tech.', type: 'ATTACK', damageType: 'THERMAL', animation: 'LASER', minLevel: 1 },
  TARGET_LOCK: { id: 'TARGET_LOCK', name: 'Target Lock', description: 'Next attack deals double damage.', type: 'SUPPORT', animation: 'SHIELD', minLevel: 3 },
  QUICK_DASH: { id: 'QUICK_DASH', name: 'Quick Dash', description: 'Avoid next attack + Small Kinetic Dmg.', type: 'DEFENSE', damageType: 'KINETIC', animation: 'MELEE', minLevel: 5 },
  SNIPE: { id: 'SNIPE', name: 'Precision Bolt', description: 'High Kinetic damage, low accuracy.', type: 'ATTACK', damageType: 'KINETIC', animation: 'RAILGUN', minLevel: 6 },

  // Assault Skills (Kinetic / Aggro)
  BURST_FIRE: { id: 'BURST_FIRE', name: 'Burst Fire', description: 'Kinetic. Good vs Assault.', type: 'ATTACK', damageType: 'KINETIC', animation: 'RAILGUN', minLevel: 1 },
  GRENADE: { id: 'GRENADE', name: 'Plasma Grenade', description: 'Thermal Area Damage.', type: 'ATTACK', damageType: 'THERMAL', animation: 'EXPLOSION', minLevel: 3 },
  OVERCLOCK: { id: 'OVERCLOCK', name: 'Overclock', description: 'Take 10 dmg, gain massive Attack.', type: 'SUPPORT', animation: 'ELECTRIC', minLevel: 5 },
  FLAMETHROWER: { id: 'FLAMETHROWER', name: 'Flamethrower', description: 'Massive Thermal damage.', type: 'ATTACK', damageType: 'THERMAL', animation: 'EXPLOSION', minLevel: 7 },

  // Tank Skills (Physical / Defense)
  BASH: { id: 'BASH', name: 'Piston Bash', description: 'Melee Kinetic. Good vs Assault.', type: 'ATTACK', damageType: 'KINETIC', animation: 'MELEE', minLevel: 1 },
  REINFORCE: { id: 'REINFORCE', name: 'Reinforce', description: 'Gain 40 Temp Shield.', type: 'DEFENSE', animation: 'SHIELD', minLevel: 3 },
  TAUNT: { id: 'TAUNT', name: 'Aggro Shout', description: 'Enemy deals less dmg next turn.', type: 'DEFENSE', animation: 'SHIELD', minLevel: 5 },
  EARTHQUAKE: { id: 'EARTHQUAKE', name: 'Ground Slam', description: 'Heavy Kinetic Dmg.', type: 'ATTACK', damageType: 'KINETIC', animation: 'EXPLOSION', minLevel: 7 },

  // Tech Skills (Electric / Hacking)
  ZAP: { id: 'ZAP', name: 'Arc Zap', description: 'Electric. Good vs Tanks.', type: 'TECH', damageType: 'ELECTRIC', animation: 'ELECTRIC', minLevel: 1 },
  QUICK_FIX: { id: 'QUICK_FIX', name: 'Quick Fix', description: 'Restore 30 HP.', type: 'SUPPORT', animation: 'REPAIR', minLevel: 3 },
  VIRUS: { id: 'VIRUS', name: 'System Virus', description: 'Massive Dmg over 3 turns.', type: 'TECH', damageType: 'ELECTRIC', animation: 'ELECTRIC', minLevel: 5 },
  EMP: { id: 'EMP', name: 'EMP Blast', description: 'Huge Electric damage.', type: 'TECH', damageType: 'ELECTRIC', animation: 'ELECTRIC', minLevel: 7 },
  
  // Universal / Special
  HACK: { id: 'HACK', name: 'System Hack', description: 'Risky. Electric Dmg or Fail.', type: 'TECH', damageType: 'ELECTRIC', animation: 'ELECTRIC', minLevel: 1 },
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
  "Cheerful beep.", "Grumpy hum.", "Stoic silence.", "Manic clicking.", "Philosophical whir.", "Calculating..."
];

export const NPC_TUTORIALS = [
  "I heard Tank bots are heavily armored, but a good electrical shock fries their circuits!",
  "Assault units have kinetic shielding. Try melting them with Thermal weapons!",
  "Tech bots are shielded against electricity, but they can't handle Thermal heat.",
  "Scout bots are fast, but fragile. Anything hits them hard.",
  "The Core Guardian only appears if you have the parts to summon it...",
  "Camp at the Pod allows you to swap damaged bots for fresh ones."
];

export const INITIAL_PLAYER_STATE: Player = {
  pos: { x: 0, y: 0 }, 
  facing: 'DOWN',
  scrap: 0,
  activeSlot: 0,
  inventory: [
    { id: 'repair_kit', name: 'Repair Kit', description: 'Heals 50 HP', effect: 'HEAL', value: 50, count: 2 }
  ],
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
  ],
  reserves: [],
  quest: {
    stage: 'FIND_POD',
    partsFound: 0,
    partsNeeded: 3,
    hasOmniTool: false
  },
  stats: {
    stepsTaken: 0,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    scrapsCollected: 0,
    botsRecruited: 0,
    botsLost: 0,
    skillsUsed: {},
    mostUsedBotId: 'starter_bot',
    questsCompleted: 0,
    modulesInstalled: 0
  }
};

export const getTerrainAt = (x: number, y: number): TerrainType => {
  if (Math.abs(x) <= 2 && Math.abs(y) <= 2) return TerrainType.FLOOR;
  if (Math.abs(x - POD_POS.x) <= 4 && Math.abs(y - POD_POS.y) <= 4) return TerrainType.FLOOR;

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
  if (Math.abs(x - POD_POS.x) < 2 && Math.abs(y - POD_POS.y) < 2) return POIType.NONE; // Keep Immediate Pod area clear

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
  hp: 800,
  maxHp: 800,
  xpValue: 2000,
  class: 'ASSAULT', // Weak to Kinetic
  isBoss: true
};

export const ITEMS_DB: Record<string, Item> = {
  REPAIR_KIT: { id: 'repair_kit', name: 'Repair Kit', description: 'Heal 50 HP', effect: 'HEAL', value: 50, count: 1 },
  XP_CHIP: { id: 'xp_chip', name: 'Data Chip', description: 'Grant 50 XP', effect: 'XP', value: 50, count: 1 },
  BATTERY: { id: 'battery', name: 'Power Cell', description: 'Revive Bot (25% HP)', effect: 'REVIVE', value: 0.25, count: 1 },
  QUEST_PART: { id: 'hyperdrive_part', name: 'Hyperdrive Flux', description: 'Required to repair the Pod.', effect: 'QUEST', value: 1, count: 1 },
  OMNI_TOOL: { id: 'omni_tool', name: 'The Omni-Tool', description: 'The master key to the Escape Pod.', effect: 'QUEST', value: 1, count: 1 }
};