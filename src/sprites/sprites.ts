// =============================================================================
// Super Mario Bros - Complete Pixel Art Sprite System
// NES-accurate sprites drawn programmatically via Canvas 2D API
// =============================================================================

// NES-Accurate Color Palette
const C = {
  SKY: '#5C94FC',
  GROUND_DARK: '#C84C0C',
  GROUND_LIGHT: '#FC9838',
  BRICK_DARK: '#A44400',
  BRICK_LIGHT: '#DC7E00',
  Q_DARK: '#C84C0C',
  Q_LIGHT: '#FCA044',
  Q_SHINE: '#FCFCFC',
  PIPE_DARK: '#00A800',
  PIPE_MID: '#80D010',
  PIPE_HI: '#B8F818',
  M_RED: '#B81810',
  M_SKIN: '#FC9838',
  M_BROWN: '#AC7C00',
  M_GREEN: '#00A800',     // Luigi/Fire flower
  M_WHITE: '#FCFCFC',
  M_FIRE_W: '#FCFCFC',    // Fire mario white
  M_FIRE_R: '#B81810',    // Fire mario red
  G_BROWN: '#C84C0C',
  G_DARK: '#6C4400',
  G_TAN: '#FC9838',
  K_GREEN: '#00A800',
  K_LIGHT: '#80D010',
  K_YELLOW: '#FCA044',
  MR_RED: '#B81810',
  MR_WHITE: '#FCFCFC',
  STAR_Y: '#FCA044',
  STAR_BROWN: '#AC7C00',
  COIN_ORANGE: '#FC9838',
  COIN_DARK: '#C84C0C',
  W: '#FCFCFC',
  B: '#000000',
  T: '',  // transparent
  BLUE_DARK: '#0000A8',
  BLUE_LIGHT: '#3C38FC',
  CASTLE_GRAY: '#A4A4A4',
  CASTLE_DARK: '#585858',
  CLOUD_W: '#FCFCFC',
  CLOUD_LIGHT: '#ACCCFC',
  HILL_DARK: '#00A800',
  HILL_LIGHT: '#80D010',
  BUSH_DARK: '#00A800',
  BUSH_LIGHT: '#80D010',
  FIRE_ORANGE: '#FC9838',
  FIRE_RED: '#B81810',
  FIRE_YELLOW: '#FCA044',
};

// Shorthand aliases for building pixel maps
const T = C.T;

type SpriteEntry = {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  width: number;
  height: number;
};

// Helper: create a canvas and draw pixels from a color map
function createSprite(
  width: number,
  height: number,
  pixels: string[]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = pixels[y * width + x];
      if (color && color !== '') {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

// Expand shorthand row: each char maps to a color
function row(template: string, colorMap: Record<string, string>): string[] {
  return template.split('').map(ch => colorMap[ch] || T);
}

// Build full pixel array from row strings
function buildPixels(
  rows: string[],
  colorMap: Record<string, string>
): string[] {
  const result: string[] = [];
  for (const r of rows) {
    result.push(...row(r, colorMap));
  }
  return result;
}

// ============================================================================
// MARIO SMALL SPRITES (16x16)
// ============================================================================

const SMALL_MARIO_COLORS: Record<string, string> = {
  '.': T,
  'R': C.M_RED,
  'S': C.M_SKIN,
  'B': C.M_BROWN,
  'b': C.B,
  'O': C.BLUE_DARK,  // overalls
  'Y': C.M_SKIN,     // same as skin for hands
};

function marioSmallIdle(): string[] {
  return [
    '....RRRRR.......',
    '...RRRRRRRRR....',
    '...BBBSSSbS.....',
    '..BSBSSSSBS.....',
    '..BSBSSSSBSS....',
    '..BBSSSSBBBB....',
    '....SSSSSS......',
    '...RROORRR......',
    '..RRROORRRR.....',
    '..RRROORRRRR....',
    '..SSORRSRRS.....',
    '..SSRRRRRSS.....',
    '..SSRRRRRS......',
    '...OOOOO........',
    '...BBBB.........',
    '..BBBBBB........',
  ];
}

function marioSmallWalk1(): string[] {
  return [
    '....RRRRR.......',
    '...RRRRRRRRR....',
    '...BBBSSSbS.....',
    '..BSBSSSSBS.....',
    '..BSBSSSSBSS....',
    '..BBSSSSBBBB....',
    '....SSSSSS......',
    '....RRROOR......',
    '...RRRROORRRS...',
    '...RRRROOSS.....',
    '...RRSRRSSS.....',
    '....SSRRRS......',
    '....SRRRRS......',
    '...BB.OOO.......',
    '...BBB.BB.......',
    '...BBBBB........',
  ];
}

function marioSmallWalk2(): string[] {
  return [
    '................',
    '....RRRRR.......',
    '...RRRRRRRRR....',
    '...BBBSSSbS.....',
    '..BSBSSSSBS.....',
    '..BSBSSSSBSS....',
    '..BBSSSSBBBB....',
    '....SSSSSS......',
    '...RROORRRR.....',
    '..RRRROORRRRS...',
    '..SSRROORSSS....',
    '..SSSRRSSSB.....',
    '..SS.RRR.BB.....',
    '......OOO.B.....',
    '......BBB.......',
    '......BBB.......',
  ];
}

function marioSmallWalk3(): string[] {
  return [
    '................',
    '....RRRRR.......',
    '...RRRRRRRRR....',
    '...BBBSSSbS.....',
    '..BSBSSSSBS.....',
    '..BSBSSSSBSS....',
    '..BBSSSSBBBB....',
    '....SSSSSSS.....',
    '...RROORR.......',
    '..RRRROORRR.....',
    '..RRRROORSSS....',
    '..RRSRRSSS......',
    '....SSRRRS......',
    '....SRRRR.......',
    '...BBB.OOO......',
    '..BBBB.BBB......',
  ];
}

function marioSmallJump(): string[] {
  return [
    '......S.S.......',
    '....RRRRR.......',
    '...RRRRRRRRR....',
    '...BBBSSSbS.....',
    '..BSBSSSSBS.....',
    '..BSBSSSSBSS....',
    '..BBSSSSBBBB....',
    '....SSSSSS......',
    '..SRRROORRRS....',
    '..SRRROORRRRS...',
    '..SSRROORRSS....',
    '...SRRSRRRS.....',
    '...SRRRRRS......',
    '....RRRRR.......',
    '....B...BB......',
    '...BB...BBB.....',
  ];
}

function marioSmallSkid(): string[] {
  return [
    '....RRRRR.......',
    '...RRRRRRRRR....',
    '...BBBSSSbS.....',
    '..BSBSSSSBS.....',
    '..BSBSSSSBSS....',
    '..BBSSSSBBBB....',
    '....SSSSSS......',
    '...RROORRR......',
    '..RRROORRRR.....',
    '..RRROORRRRR....',
    '..SSORRSRRS.....',
    '..SSRRRRRSS.....',
    '...BBR.RRRS.....',
    '..BBB.OOO.......',
    '..BBB.BBB.......',
    '........BBB.....',
  ];
}

function marioSmallDie(): string[] {
  return [
    '....RRRRR.......',
    '...RRRRRRRRR....',
    '...BBBSSSbS.....',
    '..BSBSSSSBS.....',
    '..BSBSSSSBSS....',
    '..BBSSSSBBBB....',
    '....SSSSSS......',
    'S..RROORRR..S...',
    'S.RRROORRRR.S...',
    'S.RRROORRRRRS...',
    '..SSORRSRRS.....',
    '..SSRRRRRSS.....',
    '..SSRRRRRS......',
    '...OOOOO........',
    '...BBBB.........',
    '..BBBBBB........',
  ];
}

function marioSmallFlag(): string[] {
  return [
    '....BBBSSSb.....',
    '...BSBSSSSBS....',
    '...BSBSSSSBSS...',
    '...BBSSSSBBBB...',
    '.....SSSSS......',
    '....RRROOR......',
    '...RRRROORRR....',
    '...SSRROOSS.....',
    '...SSSRRRS......',
    '....SRRRS.......',
    '....SRRRS.......',
    '....OOOOO.......',
    '....BB.BB.......',
    '...BBB.BBB......',
    '................',
    '................',
  ];
}

// ============================================================================
// MARIO BIG SPRITES (16x32)
// ============================================================================

const BIG_MARIO_COLORS: Record<string, string> = {
  '.': T,
  'R': C.M_RED,
  'S': C.M_SKIN,
  'B': C.M_BROWN,
  'b': C.B,
  'O': C.BLUE_DARK,
  'o': C.M_RED,      // overalls buttons/details
  'Y': C.M_SKIN,
};

function marioBigIdle(): string[] {
  return [
    '................',
    '.....RRRR.......',
    '....RRRRRRRRR...',
    '....BBBSSSbS....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '....RRORRR......',
    '...RRRORRRRR....',
    '..RRRROORRRRR...',
    '..SSROORSORS....',
    '..SSSOORROSS....',
    '..SSROOORRSS....',
    '....OOOOOO......',
    '...ORROORR......',
    '..OORROORRO.....',
    '..OOORROORROO...',
    '..SSORROORS.....',
    '..SSSRRRRSSS....',
    '..SSSSRRSSSS....',
    '...SSSSSSS......',
    '....ROOOR.......',
    '...RROOORR......',
    '..RRROOORRR.....',
    '..RR.OOO.RR.....',
    '..R..OOO..R.....',
    '.....BBB........',
    '....BBBBB.......',
    '...BBBBBBB......',
    '...BB..BBB......',
    '................',
  ];
}

function marioBigWalk1(): string[] {
  return [
    '................',
    '.....RRRR.......',
    '....RRRRRRRRR...',
    '....BBBSSSbS....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '....RRORRR......',
    '...RRRORRRRR....',
    '..RRRROORRRRR...',
    '..SSROORSORS....',
    '..SSSOORROSS....',
    '..SSROOORRSS....',
    '....OOOOOO......',
    '...ORROORR......',
    '..OORROORRO.....',
    '..OORROOOROO....',
    '..SSORROORSS....',
    '..SSSRRRRSSS....',
    '..SSSSRRSSSS....',
    '...SSS.SSSS.....',
    '.....ROOOR......',
    '....RROOORR.....',
    '...RRR.OORRR....',
    '..RRR..OOO.R....',
    '..RR...BBB......',
    '.......BBBBB....',
    '.......BBBBB....',
    '........BBB.....',
    '................',
    '................',
  ];
}

function marioBigWalk2(): string[] {
  return [
    '................',
    '................',
    '.....RRRR.......',
    '....RRRRRRRRR...',
    '....BBBSSSbS....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '....RRORRR......',
    '...RRRORRRRR....',
    '..RRRROORRRRR...',
    '..SSROORSORS....',
    '..SSSOORROSS....',
    '..SSROOORRSS....',
    '....OOOOOO......',
    '...ORROORR......',
    '..OORROORRRRO...',
    '..OORROOOORRO...',
    '..SSORROORRSS...',
    '..SSSRRRRRSSS...',
    '...SSSRRRSSS....',
    '...SSS..SS......',
    '...ROOORRR......',
    '..RROOO.RRR.....',
    '..RROOO..RR.....',
    '..RRBBBB........',
    '....BBBBB.......',
    '....BBBBB.......',
    '................',
    '................',
    '................',
  ];
}

function marioBigWalk3(): string[] {
  return [
    '................',
    '.....RRRR.......',
    '....RRRRRRRRR...',
    '....BBBSSSbS....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '...RRRORRR......',
    '..RRRRRORRRRR...',
    '..RRRRROORRRR...',
    '..SSRROORSRS....',
    '..SSSSOORROSS...',
    '...SSROOORRSS...',
    '....OOOOOO......',
    '...ORROORR......',
    '..OORROORRRRO...',
    '..OORROOOROO....',
    '..SSORROORSSS...',
    '..SSSRRRRSSSS...',
    '...SSSRRSSS.....',
    '....SSSSSS......',
    '....ROOORRR.....',
    '...RROOO.RRR....',
    '..RRR.OOO.RR....',
    '..RR..OOO..R....',
    '......BBB.......',
    '.....BBBBB......',
    '....BBBBBBB.....',
    '....BB..BBB.....',
    '................',
    '................',
  ];
}

function marioBigJump(): string[] {
  return [
    '.........SS.....',
    '.....RRRR.S.....',
    '....RRRRRRRRR...',
    '....BBBSSSbS....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '..SRRRORRRRS....',
    '..SRRRORRRRRS...',
    '..SSRROORRRSS...',
    '...SROORSORS....',
    '...SSOORROSS....',
    '...SROOORRSS....',
    '....OOOOOO......',
    '...ORROORR......',
    '..OORROORRO.....',
    '..OOORROORROO...',
    '..SSORROORSS....',
    '..SSSRRRRSSS....',
    '..SSSSRRSSSS....',
    '...SSSSSSS......',
    '....RR.OOOR.....',
    '...RRR.OOORR....',
    '..RRRR..OOO.RR..',
    '..RR.....OO..RR.',
    '.........BBB....',
    '........BBBBB...',
    '..BB...BBBBBBB..',
    '..BBB..BB...BB..',
    '..BBBB..........',
    '................',
  ];
}

function marioBigSkid(): string[] {
  return [
    '................',
    '.....RRRR.......',
    '....RRRRRRRRR...',
    '....BBBSSSbS....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '....RRORRR......',
    '...RRRORRRRR....',
    '..RRRROORRRRR...',
    '..SSROORSORS....',
    '..SSSOORROSS....',
    '..SSROOORRSS....',
    '....OOOOOO......',
    '...ORROORR......',
    '..OORROORRO.....',
    '..OOORROORROO...',
    '..SSORROORS.....',
    '..SSSRRRRSSS....',
    '..SSSSRRSSSS....',
    '...SSSSSSS......',
    '..BBROOORRR.....',
    '..BBBROOO.RR....',
    '..BBBROOO..R....',
    '.....BBB........',
    '....BBBBB.......',
    '...BBBBBBB......',
    '........BBB.....',
    '................',
    '................',
    '................',
  ];
}

function marioBigCrouch(): string[] {
  return [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....RRRR.......',
    '....RRRRRRRRR...',
    '....BBBSSSbS....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '..SRRRORRRRS....',
    '..SRRRORRRRRS...',
    '..SSRROORRRSS...',
    '...SROORSORS....',
    '...SSOORROSS....',
    '...SROOORRSS....',
    '....OOOOOO......',
    '...ORRRRRRRO....',
    '..OORRRRRROO....',
    '..OORRRRRROO....',
    '..SSRRRRRRSSS...',
    '..SS..OOOOBBB...',
    '......BBBBB.....',
    '......BBBBB.....',
    '................',
  ];
}

function marioBigFlag(): string[] {
  return [
    '................',
    '....BBBSSSb.....',
    '...BSBSSSSbSS...',
    '...BSBSSSSBSSS..',
    '...BBSSSSBBB....',
    '....SSSSSSS.....',
    '....RRORRR......',
    '...RRRORRRRR....',
    '..RRRROORRRRR...',
    '..SSROORSORS....',
    '..SSSOORROSS....',
    '..SSROOORRSS....',
    '....OOOOOO......',
    '...OORROORR.....',
    '..OORRRROORR....',
    '..OORRRROORR....',
    '..SSRRRRRRSSS...',
    '..SSSRRRRSSS....',
    '...SSRRRRSS.....',
    '....ROOORRR.....',
    '...RROOOO.RR....',
    '..RRR.OOOO.R....',
    '..RR...OOO......',
    '.......BBB......',
    '......BBBBB.....',
    '.....BBBBBBB....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];
}

// ============================================================================
// FIRE MARIO SPRITES (16x32) - White hat, red overalls
// ============================================================================

const FIRE_MARIO_COLORS: Record<string, string> = {
  '.': T,
  'R': C.M_FIRE_W,    // white where red was
  'S': C.M_SKIN,
  'B': C.M_BROWN,
  'b': C.B,
  'O': C.M_FIRE_R,    // red where blue was
  'o': C.M_FIRE_R,
  'Y': C.M_SKIN,
};

// Fire mario uses same shapes as big mario, just different color map

// ============================================================================
// ENEMY SPRITES
// ============================================================================

const GOOMBA_COLORS: Record<string, string> = {
  '.': T,
  'B': C.G_BROWN,
  'D': C.G_DARK,
  'T': C.G_TAN,
  'b': C.B,
  'W': C.W,
};

function goomba1(): string[] {
  return [
    '......BBBB......',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '..BbBBBBBBbBBB..',
    '..BbBBTTBBbBBB..',
    '.BBbbBTTBbbBBBB.',
    '.BBBbbBBbbBBBBB.',
    '.BBBBbbbbBBBBBB.',
    '.BBBBBTTBBBBBBBB',
    '..BBBBTTTBBBBB..',
    '...DDDDDDDDDD...',
    '..DDDDDDDDDDDD..',
    '.DDbbDDDDDDbbDD.',
    '.DDbDDDDDDDbDDD.',
    '..bb........bb..',
  ];
}

function goomba2(): string[] {
  return [
    '......BBBB......',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '..BbBBBBBBbBBB..',
    '..BbBBTTBBbBBB..',
    '.BBbbBTTBbbBBBB.',
    '.BBBbbBBbbBBBBB.',
    '.BBBBbbbbBBBBBB.',
    '.BBBBBTTBBBBBBBB',
    '..BBBBTTTBBBBB..',
    '...DDDDDDDDDD...',
    '..DDDDDDDDDDDD..',
    '.DDbDDDDDDDDbDD.',
    '.DDbbDDDDDDbbDD.',
    '..bb........bb..',
  ];
}

function goombaFlat(): string[] {
  return [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..BbBBBBBBbBBB..',
    '..BbBBTTBBbBBB..',
    '.BBbbBTTBbbBBBB.',
    '.BBBbbBBbbBBBBB.',
  ];
}

const KOOPA_COLORS: Record<string, string> = {
  '.': T,
  'G': C.K_GREEN,
  'L': C.K_LIGHT,
  'Y': C.K_YELLOW,
  'W': C.W,
  'b': C.B,
  'S': C.M_SKIN,
};

function koopaWalk1(): string[] {
  // Koopa is 16x24, but we use 16x32 with padding
  return [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....GGGG.......',
    '....GGGGGG......',
    '...GGGGGGGG.....',
    '...GLGbGLGGG....',
    '..GGLGbGLGGGG...',
    '..GGLLbLLGGGG...',
    '..GGGGGGGGGGG...',
    '..bGGGGGGGGGb...',
    '...bGGGGGGGb....',
    '....YYYYYY......',
    '...YYYWYYYY.....',
    '..YYYWWYYYYY....',
    '..YYYWYYYYYY....',
    '..YYYYYYYY......',
    '....bb.bb.......',
    '...Sbb.bbS......',
    '..SSbb.bbSS.....',
    '..SSS...SSS.....',
    '..SSS...SSS.....',
    '..bbb...bbb.....',
    '................',
    '................',
    '................',
    '................',
  ];
}

function koopaWalk2(): string[] {
  return [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....GGGG.......',
    '....GGGGGG......',
    '...GGGGGGGG.....',
    '...GLGbGLGGG....',
    '..GGLGbGLGGGG...',
    '..GGLLbLLGGGG...',
    '..GGGGGGGGGGG...',
    '..bGGGGGGGGGb...',
    '...bGGGGGGGb....',
    '....YYYYYY......',
    '...YYYWYYYY.....',
    '..YYYWWYYYYY....',
    '..YYYWYYYYYY....',
    '..YYYYYYYY......',
    '...SSbb.........',
    '..SSSbb..bb.....',
    '..SSS...Sbb.....',
    '..bbb..SSSS.....',
    '........SSS.....',
    '........bbb.....',
    '................',
    '................',
    '................',
    '................',
  ];
}

function shell(): string[] {
  return [
    '................',
    '................',
    '................',
    '................',
    '......GGGG......',
    '.....GGGGGG.....',
    '....GGGGGGGG....',
    '...bGGGGGGGGb...',
    '..bGGLLLLLLGGb..',
    '..bGLLLLLLLLGb..',
    '..bGLLLLLLLLGb..',
    '..bGGLLLLLLGGb..',
    '...bGGGGGGGGb...',
    '....bGGGGGGb....',
    '.....bbbbbb.....',
    '................',
  ];
}

function shellLegs(): string[] {
  return [
    '................',
    '................',
    '................',
    '................',
    '......GGGG......',
    '.....GGGGGG.....',
    '....GGGGGGGG....',
    '...bGGGGGGGGb...',
    '..bGGLLLLLLGGb..',
    '..bGLLLLLLLLGb..',
    '..bGLLLLLLLLGb..',
    '..bGGLLLLLLGGb..',
    '..SbGGGGGGGGbS..',
    '..SSbGGGGGGbSS..',
    '..SSS.bbbb.SSS..',
    '..bbb......bbb..',
  ];
}

const PIRANHA_COLORS: Record<string, string> = {
  '.': T,
  'G': C.PIPE_DARK,
  'L': C.PIPE_MID,
  'W': C.W,
  'R': C.M_RED,
  'b': C.B,
};

function piranha1(): string[] {
  return [
    '..bb......bb....',
    '.bGGb....bGGb...',
    '.bGGGb..bGGGb...',
    '.bGGGGbbGGGGb...',
    '.bWGGGGGGGGWb...',
    '..bGGGGGGGGb....',
    '..bWGGGGGGWb....',
    '...bGGGGGGb.....',
    '...bRRRRRRb.....',
    '....bRRRRb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bbbbbb......',
  ];
}

function piranha2(): string[] {
  return [
    '....bb..bb......',
    '...bGGbbGGb.....',
    '..bGGGGGGGGb....',
    '..bGGGGGGGGb....',
    '..bWGGGGGGWb....',
    '..bGGGGGGGGb....',
    '..bWGGGGGGWb....',
    '...bGGGGGGb.....',
    '...bRRRRRRb.....',
    '....bRRRRb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bGGGGb......',
    '....bbbbbb......',
  ];
}

// ============================================================================
// ITEM SPRITES
// ============================================================================

const MUSHROOM_COLORS: Record<string, string> = {
  '.': T,
  'R': C.MR_RED,
  'W': C.MR_WHITE,
  'S': C.M_SKIN,
  'b': C.B,
};

function mushroom(): string[] {
  return [
    '.....bbbbbb.....',
    '...bbRRRRRRbb...',
    '..bRRWWRRWWRRb..',
    '.bRRWWWRRWWWRRb.',
    '.bRWWWWRRWWWWRb.',
    'bRRWWWRRRRWWWRRb',
    'bRRWWRRRRRRWWRRb',
    'bRRRRRRRRRRRRRRb',
    'bRRRRRRRRRRRRRRb',
    '.bbSSSSSSSSSbb..',
    '...bSSSSSSSb....',
    '..bWbSSSSSbWb...',
    '..bWWbSSSbWWb...',
    '..bWWbSSSbWWb...',
    '...bWbSSSbWb....',
    '....bbbbbbb.....',
  ];
}

const FLOWER_COLORS: Record<string, string> = {
  '.': T,
  'R': C.M_RED,
  'O': C.FIRE_ORANGE,
  'Y': C.FIRE_YELLOW,
  'G': C.K_GREEN,
  'L': C.K_LIGHT,
  'W': C.W,
  'b': C.B,
};

function fireFlower1(): string[] {
  return [
    '................',
    '......bbb.......',
    '.....bRRRb......',
    '..bbbRRWRRbbb...',
    '.bOOORWWWROOOb..',
    '.bOOORRWRROOOb..',
    '.bOOOORROOOOb...',
    '..bbbORRObbbb...',
    '.....bRRb.......',
    '.....bGGb.......',
    '....bGGGGb......',
    '...LbGGGGbL.....',
    '..LLbGGGGbLL....',
    '..LLLbGGbLLL....',
    '...LLLbbLLL.....',
    '....LLLLLL......',
  ];
}

function fireFlower2(): string[] {
  return [
    '................',
    '......bbb.......',
    '.....bOOOb......',
    '..bbbOOWOObbb...',
    '.bYYYOWWWOYYYb..',
    '.bYYYOOWOOYYYb..',
    '.bYYYYOOYYYYb...',
    '..bbbYOOYbbbb...',
    '.....bOOb.......',
    '.....bGGb.......',
    '....bGGGGb......',
    '...LbGGGGbL.....',
    '..LLbGGGGbLL....',
    '..LLLbGGbLLL....',
    '...LLLbbLLL.....',
    '....LLLLLL......',
  ];
}

function fireFlower3(): string[] {
  return [
    '................',
    '......bbb.......',
    '.....bYYYb......',
    '..bbbYYWYYbbb...',
    '.bWWWYWWWYWWWb..',
    '.bWWWYYWYYWWWb..',
    '.bWWWWYYWWWWb...',
    '..bbbWYYWbbbb...',
    '.....bYYb.......',
    '.....bGGb.......',
    '....bGGGGb......',
    '...LbGGGGbL.....',
    '..LLbGGGGbLL....',
    '..LLLbGGbLLL....',
    '...LLLbbLLL.....',
    '....LLLLLL......',
  ];
}

function fireFlower4(): string[] {
  return [
    '................',
    '......bbb.......',
    '.....bWWWb......',
    '..bbbWWbWWbbb...',
    '.bRRRWbbbWRRRb..',
    '.bRRRWWbWWRRRb..',
    '.bRRRRWWRRRRb...',
    '..bbbRWWRbbbb...',
    '.....bWWb.......',
    '.....bGGb.......',
    '....bGGGGb......',
    '...LbGGGGbL.....',
    '..LLbGGGGbLL....',
    '..LLLbGGbLLL....',
    '...LLLbbLLL.....',
    '....LLLLLL......',
  ];
}

const STAR_COLORS: Record<string, string> = {
  '.': T,
  'Y': C.STAR_Y,
  'B': C.STAR_BROWN,
  'b': C.B,
  'W': C.W,
};

function star1(): string[] {
  return [
    '................',
    '.......bb.......',
    '......bYYb......',
    '......bYYb......',
    '.....bYYYYb.....',
    '.bbbbbYYYYbbbbb.',
    '.bYYYYYWYYYYYYb.',
    '..bYYYYWYYYYYb..',
    '...bYYYWYYYYb...',
    '...bYYWWWYYYb...',
    '....bYYYYYb.....',
    '....bYYYYYb.....',
    '...bYBbbbBYb....',
    '...bBb...bBb....',
    '..bBb.....bBb...',
    '..bb.......bb...',
  ];
}

function star2(): string[] {
  // Slightly different shimmer
  return [
    '................',
    '.......bb.......',
    '......bBBb......',
    '......bYYb......',
    '.....bYYYYb.....',
    '.bbbbbYYYYbbbbb.',
    '.bBBYYYYYYYYBBb.',
    '..bYYYYWYYYYYb..',
    '...bYYYWYYYYb...',
    '...bYYWWWYYYb...',
    '....bYYYYYb.....',
    '....bYYYYYb.....',
    '...bYBbbbBYb....',
    '...bBb...bBb....',
    '..bBb.....bBb...',
    '..bb.......bb...',
  ];
}

function star3(): string[] {
  return [
    '................',
    '.......bb.......',
    '......bYYb......',
    '......bWWb......',
    '.....bYWYYb.....',
    '.bbbbbYYYYbbbbb.',
    '.bYYYYYYYYYYYYb.',
    '..bYYYYYYYYYYb..',
    '...bYYYWYYYYb...',
    '...bYYYWYYYYb...',
    '....bYYYYYb.....',
    '....bYYYYYb.....',
    '...bYBbbbBYb....',
    '...bBb...bBb....',
    '..bBb.....bBb...',
    '..bb.......bb...',
  ];
}

function star4(): string[] {
  return [
    '................',
    '.......bb.......',
    '......bYYb......',
    '......bYYb......',
    '.....bWYYYb.....',
    '.bbbbbWYYYbbbbb.',
    '.bYYYWWYYYYYYYb.',
    '..bYYYYYYYYYYb..',
    '...bYYYYYYYYb...',
    '...bYYYYWYYYb...',
    '....bYYYYYb.....',
    '....bYYYYYb.....',
    '...bYBbbbBYb....',
    '...bBb...bBb....',
    '..bBb.....bBb...',
    '..bb.......bb...',
  ];
}

const COIN_COLORS: Record<string, string> = {
  '.': T,
  'O': C.COIN_ORANGE,
  'D': C.COIN_DARK,
  'Y': C.FIRE_YELLOW,
  'b': C.B,
};

function coin1(): string[] {
  return [
    '................',
    '.....bbbbbb.....',
    '....bOOOOOOb....',
    '...bOOOYYOOOb...',
    '...bOOYYYYOOb...',
    '...bOOYYOYOOb...',
    '...bOOOYYOOOb...',
    '...bOOOYYOOOb...',
    '...bOOOYYOOOb...',
    '...bOOYYOYOOb...',
    '...bOOYYYYOOb...',
    '...bOOOYYOOOb...',
    '....bOOOOOOb....',
    '.....bbbbbb.....',
    '................',
    '................',
  ];
}

function coin2(): string[] {
  return [
    '................',
    '......bbbb......',
    '.....bOOOOb.....',
    '.....bOYYOb.....',
    '.....bOYYOb.....',
    '.....bOOYOb.....',
    '.....bOOYOb.....',
    '.....bOOYOb.....',
    '.....bOOYOb.....',
    '.....bOOYOb.....',
    '.....bOYYOb.....',
    '.....bOYYOb.....',
    '.....bOOOOb.....',
    '......bbbb......',
    '................',
    '................',
  ];
}

function coin3(): string[] {
  return [
    '................',
    '.......bb.......',
    '......bOOb......',
    '......bYOb......',
    '......bYOb......',
    '......bYOb......',
    '......bYOb......',
    '......bYOb......',
    '......bYOb......',
    '......bYOb......',
    '......bYOb......',
    '......bYOb......',
    '......bOOb......',
    '.......bb.......',
    '................',
    '................',
  ];
}

function coin4(): string[] {
  // Same as coin2 but mirrored appearance
  return [
    '................',
    '......bbbb......',
    '.....bOOOOb.....',
    '.....bOYYOb.....',
    '.....bOYYOb.....',
    '.....bOYOOb.....',
    '.....bOYOOb.....',
    '.....bOYOOb.....',
    '.....bOYOOb.....',
    '.....bOYOOb.....',
    '.....bOYYOb.....',
    '.....bOYYOb.....',
    '.....bOOOOb.....',
    '......bbbb......',
    '................',
    '................',
  ];
}

// Fireball (8x8)
const FB_COLORS: Record<string, string> = {
  '.': T,
  'R': C.FIRE_RED,
  'O': C.FIRE_ORANGE,
  'Y': C.FIRE_YELLOW,
  'b': C.B,
};

function fireball1(): string[] {
  return [
    '..bOOb..',
    '.bOYYOb.',
    'bOYYYYOb',
    'bOYYYYOb',
    'bOYYYYOb',
    'bOYYYYOb',
    '.bOYYOb.',
    '..bOOb..',
  ];
}

function fireball2(): string[] {
  return [
    '..bRRb..',
    '.bROORb.',
    'bROOOORb',
    'bROOOORb',
    'bROOOORb',
    'bROOOORb',
    '.bROORb.',
    '..bRRb..',
  ];
}

function fireball3(): string[] {
  return [
    '..bYYb..',
    '.bYRRYb.',
    'bYRRRRYb',
    'bYRRRRYb',
    'bYRRRRYb',
    'bYRRRRYb',
    '.bYRRYb.',
    '..bYYb..',
  ];
}

function fireball4(): string[] {
  return [
    '..bOOb..',
    '.bORROb.',
    'bORRRROb',
    'bORRRROb',
    'bORRRROb',
    'bORRRROb',
    '.bORROb.',
    '..bOOb..',
  ];
}

// ============================================================================
// TILE SPRITES
// ============================================================================

const GROUND_COLORS: Record<string, string> = {
  '.': T,
  'D': C.GROUND_DARK,
  'L': C.GROUND_LIGHT,
  'b': C.B,
};

function groundTop(): string[] {
  return [
    'bbbbbbbbbbbbbbbb',
    'LLLLLLLLLLLLLLLL',
    'LDDDLLLDDDLLLLL',
    'LDDDLLLDDDLLLLL',
    'LLLLLLLLLLLLLDDD',
    'LLLLLLLLLLLLLDDD',
    'LLLDDDLLLLLLLLLL',
    'LLLDDDLLLLLLLLLL',
    'LLLLLLLLLLDDDLLL',
    'LLLLLLLLLLDDDLLL',
    'DDDLLLLLLLLLLLLL',
    'DDDLLLLLLLLLLLLL',
    'LLLLLLLDDDLLLLLL',
    'LLLLLLLDDDLLLLLL',
    'LLLLLLLLLLLLLDDD',
    'LLLLLLLLLLLLLDDD',
  ];
}

function ground(): string[] {
  return [
    'LLLDDDLLLLLLLLLL',
    'LLLDDDLLLLLLLLLL',
    'LLLLLLLLLLDDDLLL',
    'LLLLLLLLLLDDDLLL',
    'DDDLLLLLLLLLLLLL',
    'DDDLLLLLLLLLLLLL',
    'LLLLLLLDDDLLLLLL',
    'LLLLLLLDDDLLLLLL',
    'LLLLLLLLLLLLLDDD',
    'LLLLLLLLLLLLLDDD',
    'LDDDLLLDDDLLLLL',
    'LDDDLLLDDDLLLLL',
    'LLLLLLLLLLLLLLLL',
    'LLLLLLLLLLLLLLLL',
    'LLLDDDLLLLLLDDD',
    'LLLDDDLLLLLLDDD',
  ];
}

const BRICK_COLORS: Record<string, string> = {
  '.': T,
  'D': C.BRICK_DARK,
  'L': C.BRICK_LIGHT,
  'b': C.B,
};

function brick(): string[] {
  return [
    'bLLLbLLLLLbLLLL',
    'bLLLbLLLLLbLLLL',
    'bLLLbLLLLLbLLLL',
    'bbbbbbbbbbbbbbbb',
    'LLLLbLLLbLLLLLL',
    'LLLLbLLLbLLLLLL',
    'LLLLbLLLbLLLLLL',
    'bbbbbbbbbbbbbbbb',
    'bLLLbLLLLLbLLLL',
    'bLLLbLLLLLbLLLL',
    'bLLLbLLLLLbLLLL',
    'bbbbbbbbbbbbbbbb',
    'LLLLbLLLbLLLLLL',
    'LLLLbLLLbLLLLLL',
    'LLLLbLLLbLLLLLL',
    'bbbbbbbbbbbbbbbb',
  ];
}

const Q_COLORS: Record<string, string> = {
  '.': T,
  'D': C.Q_DARK,
  'L': C.Q_LIGHT,
  'S': C.Q_SHINE,
  'b': C.B,
};

function question1(): string[] {
  return [
    'bLLLLLLLLLLLLLb',
    'LSSSSSSSSSSSSSD',
    'LSLLLLLLLLLLSD.',
    'LSLLDDDDLLLLSD',
    'LSLDDSSDDLLLSD',
    'LSLDDSSDDLLLSD',
    'LSLLLLSSDDLLSD',
    'LSLLLSSDDLLLSD',
    'LSLLSSDDLLLLSD',
    'LSLLSSDDLLLLSD',
    'LSLLLLLLLLLLSD.',
    'LSLLSSDDLLLLSD',
    'LSLLSSDDLLLLSD',
    'LSLLLLLLLLLLSD.',
    'LDDDDDDDDDDDDD',
    'bDDDDDDDDDDDDDb',
  ];
}

function question2(): string[] {
  return [
    'bLLLLLLLLLLLLLb',
    'LLLLLLLLLLLLLLD',
    'LLLLLLLLLLLLLLD',
    'LLLLDDDDLLLLLLD',
    'LLLDDSSDDLLLLLD',
    'LLLDDSSDDLLLLLD',
    'LLLLLLSSDDLLLLD',
    'LLLLLSSDDLLLLLD',
    'LLLLSSDDLLLLLLD',
    'LLLLSSDDLLLLLLD',
    'LLLLLLLLLLLLLLD',
    'LLLLSSDDLLLLLLD',
    'LLLLSSDDLLLLLLD',
    'LLLLLLLLLLLLLLD',
    'LDDDDDDDDDDDDD',
    'bDDDDDDDDDDDDDb',
  ];
}

function question3(): string[] {
  return [
    'bDDDDDDDDDDDDDb',
    'DLLLLLLLLLLLLD.',
    'DLLLLLLLLLLLLD.',
    'DLLLLDDDDLLLLD.',
    'DLLLDDSSDDLLLD.',
    'DLLLDDSSDDLLLD.',
    'DLLLLLLSSDDLLD.',
    'DLLLLLSSDDLLLD.',
    'DLLLLSSDDLLLLD.',
    'DLLLLSSDDLLLLD.',
    'DLLLLLLLLLLLLD.',
    'DLLLLSSDDLLLLD.',
    'DLLLLSSDDLLLLD.',
    'DLLLLLLLLLLLLD.',
    'DDDDDDDDDDDDDDD',
    'bDDDDDDDDDDDDDb',
  ];
}

function questionEmpty(): string[] {
  return [
    'bbbbbbbbbbbbbbbb',
    'bDDDDDDDDDDDDDDb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDLLLLLLLLLLLLb',
    'bDDDDDDDDDDDDDDb',
    'bbbbbbbbbbbbbbbb',
  ];
}

const BLOCK_COLORS: Record<string, string> = {
  '.': T,
  'D': '#585858',
  'L': '#A4A4A4',
  'H': '#D0D0D0',
  'b': C.B,
};

function block(): string[] {
  return [
    'bHHHHHHHHHHHHHb',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HLLLLLLLLLLLLLLD',
    'HDDDDDDDDDDDDDD',
    'bDDDDDDDDDDDDDDb',
  ];
}

const PIPE_COLORS: Record<string, string> = {
  '.': T,
  'D': C.PIPE_DARK,
  'M': C.PIPE_MID,
  'H': C.PIPE_HI,
  'b': C.B,
};

function pipeTopLeft(): string[] {
  return [
    'bbbbbbbbbbbbbbbb',
    'bHHHHHHHHHHHHMM',
    'bHHHHHHHHHHHHMD',
    'bHHMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
  ];
}

function pipeTopRight(): string[] {
  return [
    'bbbbbbbbbbbbbbbb',
    'MMMMMMMMMMMMMMDb',
    'DMMMMMMMMMMMMMDb',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
  ];
}

function pipeLeft(): string[] {
  return [
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
    'bHMMMMMMMMMMMDDb',
  ];
}

function pipeRight(): string[] {
  return [
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
    'bDDMMMMMMMMDDDb.',
  ];
}

// ============================================================================
// SCENERY SPRITES
// ============================================================================

const CLOUD_COLORS: Record<string, string> = {
  '.': T,
  'W': C.CLOUD_W,
  'L': C.CLOUD_LIGHT,
  'b': C.B,
};

// Cloud is 48x24 - built as 3 tile-widths
function cloudPixels(): string[] {
  return [
    '................bbbbbb..................bbbbbb................',
    '...............bWWWWWWb................bWWWWWWb...............',
    '..............bWWWWWWWWb..............bWWWWWWWWb..............',
    '..........bbbbbWWWWWWWWbbbbb....bbbbbWWWWWWWWWWbbbbb.........',
    '.........bWWWWWWWWWWWWWWWWWWbbbbWWWWWWWWWWWWWWWWWWWWb........',
    '........bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb.......',
    '.......bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb......',
    '......bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb.....',
    '.....bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb....',
    '....bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb...',
    '...bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb..',
    '..bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb.',
    '..bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb.',
    '..bWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWb.',
    '..bLLLLWWWWWWWWWWLLLLLLLLLLLLWWWWWWWWWWWWLLLLLLLLLLLLWWLLb.',
    '...bLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLb..',
    '....bLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLb...',
    '.....bLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLb....',
    '......bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.....',
    '............................................................',
    '............................................................',
    '............................................................',
    '............................................................',
    '............................................................',
  ];
}

const HILL_COLORS: Record<string, string> = {
  '.': T,
  'D': C.HILL_DARK,
  'L': C.HILL_LIGHT,
  'b': C.B,
};

function hillSmall(): string[] {
  // 48x24 - small hill
  return [
    '........................b........................',
    '......................bLLLb......................',
    '.....................bLLLLLb.....................',
    '....................bLLLLLLLb....................',
    '...................bLLLLLLLLLb...................',
    '..................bLLLLLLLLLLLb..................',
    '.................bLLLLLLLLLLLLLb.................',
    '................bLLLLLLLLLLLLLLLb................',
    '...............bLLLLLLLLLLLLLLLLLb...............',
    '..............bLLLLLLLLLLLLLLLLLLLb..............',
    '.............bLDLLLLLLLLLLLLLLLLDLLb.............',
    '............bLDDLLLLLLLLLLLLLLLDDLLLb............',
    '...........bLDDDLLLLLLLLLLLLLLDDDLLLLb...........',
    '..........bDDDDDLLLLLLLLLLLLLDDDDDLLLLb..........',
    '.........bDDDDDDDLLLLLLLLLLLDDDDDDDLLLLLb........',
    '........bDDDDDDDDDLLLLLLLLLDDDDDDDDDLLLLLLb......',
    '.......bDDDDDDDDDDDLLLLLLLDDDDDDDDDDDLLLLLLLb....',
    '......bDDDDDDDDDDDDDLLLLLDDDDDDDDDDDDDLLLLLLLLb..',
    '.....bDDDDDDDDDDDDDDDLLLDDDDDDDDDDDDDDDLLLLLLLLb.',
    '....bDDDDDDDDDDDDDDDDDLDDDDDDDDDDDDDDDDDLLLLLLLLb',
    '...bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    '..bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    '.bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    'bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
  ];
}

const BUSH_COLORS: Record<string, string> = {
  '.': T,
  'D': C.BUSH_DARK,
  'L': C.BUSH_LIGHT,
  'b': C.B,
};

function bushSmall(): string[] {
  // 32x16
  return [
    '..............bbbb..............',
    '............bbLLLLbb............',
    '...........bLLLLLLLLb...........',
    '..........bLLLLLLLLLLb..........',
    '.........bLLLLLLLLLLLLb.........',
    '........bLLLLLLLLLLLLLLb........',
    '.......bLLLDDLLLLLLDDLLLb.......',
    '......bLLLDDDLLLLLDDDLLLLb......',
    '.....bLLLDDDDLLLLLDDDDLLLLb.....',
    '....bLDDDDDDDLLLLDDDDDDDDLLb....',
    '...bDDDDDDDDDDDDDDDDDDDDDDDDb...',
    '..bDDDDDDDDDDDDDDDDDDDDDDDDDDb..',
    '.bDDDDDDDDDDDDDDDDDDDDDDDDDDDDb.',
    'bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    'bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    'bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
  ];
}

function bushLarge(): string[] {
  // 48x16
  return [
    '..............bbbb..............bbbb..............',
    '............bbLLLLbb..........bbLLLLbb............',
    '...........bLLLLLLLLb........bLLLLLLLLb...........',
    '..........bLLLLLLLLLLbbbbbbbbLLLLLLLLLLb..........',
    '.........bLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLb........',
    '........bLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLb.......',
    '.......bLLLDDLLLLLLDDLLLLLLLLDDLLLLLLDDLLLb......',
    '......bLLLDDDLLLLLDDDLLLLLLLDDDLLLLLDDDLLLLb.....',
    '.....bLLLDDDDLLLLLDDDDLLLLLDDDDLLLLLDDDDLLLLb....',
    '....bLDDDDDDDLLLLDDDDDDDDDDDDDDDLLLLDDDDDDDLLb...',
    '...bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb..',
    '..bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb.',
    '.bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    'bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    'bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
    'bDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDb',
  ];
}

// Hill large - 80x32
function hillLarge(): string[] {
  const rows: string[] = [];
  const w = 80;
  const h = 32;
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      // Simple hill shape
      const centerX = w / 2;
      const radius = (y / h) * (w / 2);
      const distFromCenter = Math.abs(x - centerX);
      if (y < 4) {
        // peak
        if (distFromCenter <= y + 1) {
          r += y === 0 && distFromCenter === 0 ? 'b' : distFromCenter < y ? 'L' : 'b';
        } else {
          r += '.';
        }
      } else if (distFromCenter <= radius) {
        if (distFromCenter === Math.floor(radius)) {
          r += 'b';
        } else if (distFromCenter < radius * 0.3) {
          r += 'L';
        } else {
          r += 'D';
        }
      } else {
        r += '.';
      }
    }
    rows.push(r);
  }
  return rows;
}

// Castle (80x80) - simplified but recognizable
const CASTLE_COLORS: Record<string, string> = {
  '.': T,
  'G': C.CASTLE_GRAY,
  'D': C.CASTLE_DARK,
  'b': C.B,
  'W': C.W,
  'R': C.M_RED,
};

function castlePixels(): string[] {
  const w = 80;
  const h = 80;
  const rows: string[] = [];

  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      // Castle structure
      const inCastle = x >= 16 && x < 64;
      const inTower = (x >= 8 && x < 24) || (x >= 56 && x < 72);
      const inCenterTower = x >= 28 && x < 52;

      // Battlements on top
      if (y < 8) {
        // Center tower top
        if (inCenterTower && y >= 0) {
          if (y === 0) r += 'b';
          else if (y < 3 && (x % 8 < 4)) r += 'G';
          else if (y < 3) r += '.';
          else r += 'G';
        }
        // Side towers top
        else if (inTower && y >= 4) {
          if (y === 4) r += 'b';
          else if (y < 7 && (x % 8 < 4)) r += 'G';
          else if (y < 7) r += '.';
          else r += 'G';
        } else {
          r += '.';
        }
      }
      // Tower bodies
      else if (y < 24) {
        if (inCenterTower) {
          if (x === 28 || x === 51) r += 'b';
          else r += 'G';
        } else if (inTower) {
          if (x === 8 || x === 23 || x === 56 || x === 71) r += 'b';
          else r += 'G';
        } else if (inCastle && y >= 16) {
          r += 'G';
        } else {
          r += '.';
        }
      }
      // Main castle body
      else if (y < 56) {
        if (inCastle || inTower) {
          // Windows
          if (y >= 28 && y < 40) {
            if ((x >= 22 && x < 26) || (x >= 54 && x < 58)) {
              r += 'b';
            } else if ((x >= 34 && x < 46) && y >= 32 && y < 40) {
              // Center window / arch
              const cx = 40, cy = 36;
              const dx = x - cx, dy = y - cy;
              if (dx * dx + dy * dy * 1.5 < 20) r += 'b';
              else r += 'G';
            } else {
              r += 'G';
            }
          } else {
            r += 'G';
          }
        } else {
          r += '.';
        }
      }
      // Door area
      else if (y < 80) {
        if (inCastle || inTower) {
          // Large door in center
          if (x >= 32 && x < 48 && y >= 56) {
            const cx = 40, archTop = 56;
            const dx = Math.abs(x - cx);
            if (y < archTop + 8 && dx * dx + (y - archTop - 8) * (y - archTop - 8) * 0.5 > 60) {
              r += 'G';
            } else {
              r += 'b';
            }
          } else {
            r += 'G';
          }
        } else {
          r += '.';
        }
      } else {
        r += '.';
      }
    }
    rows.push(r);
  }
  return rows;
}

// Flag (16x16) - triangle flag
const FLAG_COLORS: Record<string, string> = {
  '.': T,
  'R': C.M_RED,
  'G': '#00A800',
  'b': C.B,
};

function flagSprite(): string[] {
  return [
    'RRRRRRRRRRRR....',
    'RRRRRRRRRRR.....',
    'RRRRRRRRRR......',
    'RRRRRRRRR.......',
    'RRRRRRRR........',
    'RRRRRRR.........',
    'RRRRRR..........',
    'RRRRR...........',
    'RRRR............',
    'RRR.............',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];
}

// Flagpole segment (8x16) - thin pole
function flagpoleSprite(): string[] {
  return [
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
    '...bb...',
  ];
}

const FLAGPOLE_COLORS: Record<string, string> = {
  '.': T,
  'b': '#A4A4A4',
  'G': '#00A800',
};

// Flagpole top ball (8x8)
function flagpoleTop(): string[] {
  return [
    '..bGGb..',
    '.bGGGGb.',
    'bGGGGGGb',
    'bGGGGGGb',
    'bGGGGGGb',
    'bGGGGGGb',
    '.bGGGGb.',
    '..bGGb..',
  ];
}

const FLAGPOLE_TOP_COLORS: Record<string, string> = {
  '.': T,
  'b': C.B,
  'G': '#00A800',
};

// ============================================================================
// UI SPRITES
// ============================================================================

function coinHud(): string[] {
  // 8x8 small coin for HUD
  return [
    '.bOOb...',
    'bOYYOb..',
    'bOYYOb..',
    'bOYYOb..',
    'bOYYOb..',
    'bOYYOb..',
    '.bOOb...',
    '........',
  ];
}

const COIN_HUD_COLORS: Record<string, string> = {
  '.': T,
  'O': C.COIN_ORANGE,
  'Y': C.FIRE_YELLOW,
  'b': C.B,
};

// ============================================================================
// PARTICLES
// ============================================================================

function brickParticle(): string[] {
  return [
    'bLLLbLLb',
    'LLLLbLLb',
    'LLLLbLLb',
    'bLLLbLLb',
    'bbbbbbbb',
    'LLbLLLLb',
    'LLbLLLLb',
    'bLbLLLLb',
  ];
}

const BRICK_PARTICLE_COLORS: Record<string, string> = {
  '.': T,
  'L': C.BRICK_LIGHT,
  'D': C.BRICK_DARK,
  'b': C.B,
};

// ============================================================================
// SPRITE SHEET CLASS
// ============================================================================

export class SpriteSheet {
  private sprites: Map<string, SpriteEntry> = new Map();
  private initialized = false;

  /**
   * Draw pixels from row-string array with a color map.
   */
  private createFromRows(
    rows: string[],
    colorMap: Record<string, string>,
    width?: number
  ): HTMLCanvasElement {
    const h = rows.length;
    const w = width || rows[0].length;
    const pixels: string[] = [];
    for (const r of rows) {
      for (let x = 0; x < w; x++) {
        const ch = x < r.length ? r[x] : '.';
        pixels.push(colorMap[ch] || T);
      }
    }
    return createSprite(w, h, pixels);
  }

  /**
   * Register a sprite into the sheet.
   */
  private register(
    name: string,
    rows: string[],
    colorMap: Record<string, string>,
    width?: number
  ): void {
    const canvas = this.createFromRows(rows, colorMap, width);
    this.sprites.set(name, {
      canvas,
      width: canvas.width,
      height: canvas.height,
    });
  }

  /**
   * Initialize all sprites - must be called before drawing.
   */
  init(): void {
    if (this.initialized) return;

    // --- Small Mario ---
    this.register('mario-small-idle', marioSmallIdle(), SMALL_MARIO_COLORS, 16);
    this.register('mario-small-walk-1', marioSmallWalk1(), SMALL_MARIO_COLORS, 16);
    this.register('mario-small-walk-2', marioSmallWalk2(), SMALL_MARIO_COLORS, 16);
    this.register('mario-small-walk-3', marioSmallWalk3(), SMALL_MARIO_COLORS, 16);
    this.register('mario-small-jump', marioSmallJump(), SMALL_MARIO_COLORS, 16);
    this.register('mario-small-skid', marioSmallSkid(), SMALL_MARIO_COLORS, 16);
    this.register('mario-small-die', marioSmallDie(), SMALL_MARIO_COLORS, 16);
    this.register('mario-small-flag', marioSmallFlag(), SMALL_MARIO_COLORS, 16);

    // --- Big Mario ---
    this.register('mario-big-idle', marioBigIdle(), BIG_MARIO_COLORS, 16);
    this.register('mario-big-walk-1', marioBigWalk1(), BIG_MARIO_COLORS, 16);
    this.register('mario-big-walk-2', marioBigWalk2(), BIG_MARIO_COLORS, 16);
    this.register('mario-big-walk-3', marioBigWalk3(), BIG_MARIO_COLORS, 16);
    this.register('mario-big-jump', marioBigJump(), BIG_MARIO_COLORS, 16);
    this.register('mario-big-skid', marioBigSkid(), BIG_MARIO_COLORS, 16);
    this.register('mario-big-crouch', marioBigCrouch(), BIG_MARIO_COLORS, 16);
    this.register('mario-big-flag', marioBigFlag(), BIG_MARIO_COLORS, 16);

    // --- Fire Mario (same pixel patterns as big mario, different colors) ---
    this.register('mario-fire-idle', marioBigIdle(), FIRE_MARIO_COLORS, 16);
    this.register('mario-fire-walk-1', marioBigWalk1(), FIRE_MARIO_COLORS, 16);
    this.register('mario-fire-walk-2', marioBigWalk2(), FIRE_MARIO_COLORS, 16);
    this.register('mario-fire-walk-3', marioBigWalk3(), FIRE_MARIO_COLORS, 16);
    this.register('mario-fire-jump', marioBigJump(), FIRE_MARIO_COLORS, 16);
    this.register('mario-fire-skid', marioBigSkid(), FIRE_MARIO_COLORS, 16);
    this.register('mario-fire-crouch', marioBigCrouch(), FIRE_MARIO_COLORS, 16);
    this.register('mario-fire-flag', marioBigFlag(), FIRE_MARIO_COLORS, 16);

    // --- Enemies ---
    this.register('goomba-1', goomba1(), GOOMBA_COLORS, 16);
    this.register('goomba-2', goomba2(), GOOMBA_COLORS, 16);
    this.register('goomba-flat', goombaFlat(), GOOMBA_COLORS, 16);
    this.register('koopa-walk-1', koopaWalk1(), KOOPA_COLORS, 16);
    this.register('koopa-walk-2', koopaWalk2(), KOOPA_COLORS, 16);
    this.register('shell', shell(), KOOPA_COLORS, 16);
    this.register('shell-legs', shellLegs(), KOOPA_COLORS, 16);
    this.register('piranha-1', piranha1(), PIRANHA_COLORS, 16);
    this.register('piranha-2', piranha2(), PIRANHA_COLORS, 16);

    // --- Items ---
    this.register('mushroom', mushroom(), MUSHROOM_COLORS, 16);
    this.register('fire-flower-1', fireFlower1(), FLOWER_COLORS, 16);
    this.register('fire-flower-2', fireFlower2(), FLOWER_COLORS, 16);
    this.register('fire-flower-3', fireFlower3(), FLOWER_COLORS, 16);
    this.register('fire-flower-4', fireFlower4(), FLOWER_COLORS, 16);
    this.register('star-1', star1(), STAR_COLORS, 16);
    this.register('star-2', star2(), STAR_COLORS, 16);
    this.register('star-3', star3(), STAR_COLORS, 16);
    this.register('star-4', star4(), STAR_COLORS, 16);
    this.register('coin-1', coin1(), COIN_COLORS, 16);
    this.register('coin-2', coin2(), COIN_COLORS, 16);
    this.register('coin-3', coin3(), COIN_COLORS, 16);
    this.register('coin-4', coin4(), COIN_COLORS, 16);
    this.register('fireball-1', fireball1(), FB_COLORS, 8);
    this.register('fireball-2', fireball2(), FB_COLORS, 8);
    this.register('fireball-3', fireball3(), FB_COLORS, 8);
    this.register('fireball-4', fireball4(), FB_COLORS, 8);

    // --- Tiles ---
    this.register('ground-top', groundTop(), GROUND_COLORS, 16);
    this.register('ground', ground(), GROUND_COLORS, 16);
    this.register('brick', brick(), BRICK_COLORS, 16);
    this.register('question-1', question1(), Q_COLORS, 16);
    this.register('question-2', question2(), Q_COLORS, 16);
    this.register('question-3', question3(), Q_COLORS, 16);
    this.register('question-empty', questionEmpty(), Q_COLORS, 16);
    this.register('block', block(), BLOCK_COLORS, 16);
    this.register('pipe-top-left', pipeTopLeft(), PIPE_COLORS, 16);
    this.register('pipe-top-right', pipeTopRight(), PIPE_COLORS, 16);
    this.register('pipe-left', pipeLeft(), PIPE_COLORS, 16);
    this.register('pipe-right', pipeRight(), PIPE_COLORS, 16);

    // --- Scenery ---
    // Cloud - 48x wide
    const cloudRows = cloudPixels();
    this.register('cloud', cloudRows, CLOUD_COLORS, 60);

    // Hills
    this.register('hill-small', hillSmall(), HILL_COLORS, 48);
    this.register('hill-large', hillLarge(), HILL_COLORS, 80);

    // Bushes
    this.register('bush-small', bushSmall(), BUSH_COLORS, 32);
    this.register('bush-large', bushLarge(), BUSH_COLORS, 48);

    // Castle
    this.register('castle', castlePixels(), CASTLE_COLORS, 80);

    // Flag
    this.register('flag', flagSprite(), FLAG_COLORS, 16);
    this.register('flagpole', flagpoleSprite(), FLAGPOLE_COLORS, 8);
    this.register('flagpole-top', flagpoleTop(), FLAGPOLE_TOP_COLORS, 8);

    // --- UI ---
    this.register('coin-hud', coinHud(), COIN_HUD_COLORS, 8);

    // --- Particles ---
    this.register('brick-particle', brickParticle(), BRICK_PARTICLE_COLORS, 8);

    this.initialized = true;
  }

  /**
   * Draw a named sprite to a context at position (x, y).
   * If flip is true, the sprite is horizontally mirrored.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    flip: boolean = false
  ): void {
    const entry = this.sprites.get(spriteName);
    if (!entry) {
      console.warn(`Sprite not found: ${spriteName}`);
      return;
    }

    if (flip) {
      ctx.save();
      ctx.translate(x + entry.width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(entry.canvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(entry.canvas, x, y);
    }
  }

  /**
   * Draw a sprite scaled (for HUD or effects).
   */
  drawScaled(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    flip: boolean = false
  ): void {
    const entry = this.sprites.get(spriteName);
    if (!entry) {
      console.warn(`Sprite not found: ${spriteName}`);
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    if (flip) {
      ctx.scale(-scaleX, scaleY);
      ctx.translate(-entry.width, 0);
    } else {
      ctx.scale(scaleX, scaleY);
    }
    ctx.drawImage(entry.canvas, 0, 0);
    ctx.restore();
  }

  /**
   * Get the dimensions of a sprite.
   */
  getSize(spriteName: string): { width: number; height: number } | null {
    const entry = this.sprites.get(spriteName);
    if (!entry) return null;
    return { width: entry.width, height: entry.height };
  }

  /**
   * Check if a sprite exists.
   */
  has(spriteName: string): boolean {
    return this.sprites.has(spriteName);
  }

  /**
   * Get all registered sprite names.
   */
  getSpriteNames(): string[] {
    return Array.from(this.sprites.keys());
  }

  /**
   * Get the raw canvas of a sprite (useful for tiling etc).
   */
  getCanvas(spriteName: string): HTMLCanvasElement | null {
    const entry = this.sprites.get(spriteName);
    return entry ? (entry.canvas as HTMLCanvasElement) : null;
  }
}

// Singleton instance
export const sprites = new SpriteSheet();

// Async init function (resolves immediately since all sprites are CPU-generated)
export async function initSprites(): Promise<void> {
  sprites.init();
}
