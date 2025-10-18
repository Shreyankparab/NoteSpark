/**
 * Theme Configuration for NoteSpark
 * Original, beautiful gradient-based themes for timer backgrounds
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  type: 'gradient' | 'solid' | 'pattern';
  
  // Background colors (for LinearGradient)
  colors: string[];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  
  // Timer circle colors
  timerCircleColor: string;
  timerCircleGlow?: string;
  
  // Text colors
  textColor: string;
  secondaryTextColor: string;
  
  // Button colors
  buttonColor: string;
  buttonTextColor: string;
  
  // Accent color
  accentColor: string;
  
  // Preview thumbnail (for theme selector)
  preview?: string;
}

export const THEMES: Theme[] = [
  // 1. Ocean Breeze - Calming blue gradient
  {
    id: 'ocean_breeze',
    name: 'Ocean Breeze',
    description: 'Calming ocean waves',
    type: 'gradient',
    colors: ['#667eea', '#764ba2', '#f093fb'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.3)',
    textColor: '#FFFFFF',
    secondaryTextColor: 'rgba(255, 255, 255, 0.8)',
    buttonColor: 'rgba(255, 255, 255, 0.2)',
    buttonTextColor: '#FFFFFF',
    accentColor: '#667eea',
  },

  // 2. Sunset Glow - Warm orange to pink
  {
    id: 'sunset_glow',
    name: 'Sunset Glow',
    description: 'Warm sunset vibes',
    type: 'gradient',
    colors: ['#FF6B6B', '#FFB347', '#FFDD57'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
    textColor: '#FFFFFF',
    secondaryTextColor: 'rgba(255, 255, 255, 0.9)',
    buttonColor: 'rgba(255, 255, 255, 0.25)',
    buttonTextColor: '#FFFFFF',
    accentColor: '#FF6B6B',
  },

  // 3. Forest Zen - Green nature theme
  {
    id: 'forest_zen',
    name: 'Forest Zen',
    description: 'Peaceful forest atmosphere',
    type: 'gradient',
    colors: ['#134E5E', '#71B280', '#A8E6CF'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.3)',
    textColor: '#FFFFFF',
    secondaryTextColor: 'rgba(255, 255, 255, 0.85)',
    buttonColor: 'rgba(255, 255, 255, 0.2)',
    buttonTextColor: '#FFFFFF',
    accentColor: '#71B280',
  },

  // 4. Midnight Purple - Deep purple gradient
  {
    id: 'midnight_purple',
    name: 'Midnight Purple',
    description: 'Deep night focus',
    type: 'gradient',
    colors: ['#2C3E50', '#4A148C', '#7B1FA2'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#E1BEE7',
    timerCircleGlow: 'rgba(225, 190, 231, 0.4)',
    textColor: '#FFFFFF',
    secondaryTextColor: 'rgba(255, 255, 255, 0.8)',
    buttonColor: 'rgba(225, 190, 231, 0.2)',
    buttonTextColor: '#FFFFFF',
    accentColor: '#BA68C8',
  },

  // 5. Cherry Blossom - Soft pink gradient
  {
    id: 'cherry_blossom',
    name: 'Cherry Blossom',
    description: 'Soft spring vibes',
    type: 'gradient',
    colors: ['#FFB6C1', '#FFC0CB', '#FFE4E1'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.5)',
    textColor: '#4A4A4A',
    secondaryTextColor: 'rgba(74, 74, 74, 0.8)',
    buttonColor: 'rgba(255, 182, 193, 0.3)',
    buttonTextColor: '#4A4A4A',
    accentColor: '#FFB6C1',
  },

  // 6. Arctic Ice - Cool blue-white
  {
    id: 'arctic_ice',
    name: 'Arctic Ice',
    description: 'Cool and crisp',
    type: 'gradient',
    colors: ['#E0F7FA', '#B2EBF2', '#80DEEA'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#006064',
    timerCircleGlow: 'rgba(0, 96, 100, 0.3)',
    textColor: '#006064',
    secondaryTextColor: 'rgba(0, 96, 100, 0.7)',
    buttonColor: 'rgba(0, 96, 100, 0.15)',
    buttonTextColor: '#006064',
    accentColor: '#00ACC1',
  },

  // 7. Lava Flow - Red to orange
  {
    id: 'lava_flow',
    name: 'Lava Flow',
    description: 'Energetic and bold',
    type: 'gradient',
    colors: ['#C33764', '#E94057', '#FF6B6B'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
    textColor: '#FFFFFF',
    secondaryTextColor: 'rgba(255, 255, 255, 0.9)',
    buttonColor: 'rgba(255, 255, 255, 0.25)',
    buttonTextColor: '#FFFFFF',
    accentColor: '#E94057',
  },

  // 8. Lavender Dream - Soft purple
  {
    id: 'lavender_dream',
    name: 'Lavender Dream',
    description: 'Dreamy and relaxing',
    type: 'gradient',
    colors: ['#E6E6FA', '#D8BFD8', '#DDA0DD'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
    timerCircleColor: '#6A0DAD',
    timerCircleGlow: 'rgba(106, 13, 173, 0.3)',
    textColor: '#4A148C',
    secondaryTextColor: 'rgba(74, 20, 140, 0.8)',
    buttonColor: 'rgba(106, 13, 173, 0.15)',
    buttonTextColor: '#4A148C',
    accentColor: '#9370DB',
  },

  // 9. Golden Hour - Warm yellow-orange
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    description: 'Warm golden light',
    type: 'gradient',
    colors: ['#F7971E', '#FFD200', '#FFE57F'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.5)',
    textColor: '#4A4A4A',
    secondaryTextColor: 'rgba(74, 74, 74, 0.8)',
    buttonColor: 'rgba(255, 255, 255, 0.3)',
    buttonTextColor: '#4A4A4A',
    accentColor: '#F7971E',
  },

  // 10. Deep Space - Dark blue-purple
  {
    id: 'deep_space',
    name: 'Deep Space',
    description: 'Cosmic focus',
    type: 'gradient',
    colors: ['#000428', '#004e92', '#1a237e'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#64B5F6',
    timerCircleGlow: 'rgba(100, 181, 246, 0.4)',
    textColor: '#FFFFFF',
    secondaryTextColor: 'rgba(255, 255, 255, 0.8)',
    buttonColor: 'rgba(100, 181, 246, 0.2)',
    buttonTextColor: '#FFFFFF',
    accentColor: '#42A5F5',
  },

  // 11. Mint Fresh - Cool mint green
  {
    id: 'mint_fresh',
    name: 'Mint Fresh',
    description: 'Fresh and clean',
    type: 'gradient',
    colors: ['#98FB98', '#90EE90', '#00FA9A'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
    textColor: '#2E7D32',
    secondaryTextColor: 'rgba(46, 125, 50, 0.8)',
    buttonColor: 'rgba(255, 255, 255, 0.3)',
    buttonTextColor: '#2E7D32',
    accentColor: '#66BB6A',
  },

  // 12. Rose Gold - Elegant pink-gold
  {
    id: 'rose_gold',
    name: 'Rose Gold',
    description: 'Elegant and sophisticated',
    type: 'gradient',
    colors: ['#E8B4B8', '#D4A5A5', '#C9ADA7'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    timerCircleColor: '#FFFFFF',
    timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
    textColor: '#5D4E60',
    secondaryTextColor: 'rgba(93, 78, 96, 0.8)',
    buttonColor: 'rgba(255, 255, 255, 0.3)',
    buttonTextColor: '#5D4E60',
    accentColor: '#D4A5A5',
  },
  // 1. Soft Mint
    {
        id: 'soft_mint',
        name: 'Soft Mint',
        description: 'Fresh and calm, like a spring morning',
        type: 'gradient',
        colors: ['#D1F5E8', '#A7E1CD', '#8CD6BC'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#3A665A', // Dark green
        secondaryTextColor: 'rgba(58, 102, 90, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#3A665A',
        accentColor: '#A7E1CD',
    },

    // 2. Creamy Peach
    {
        id: 'creamy_peach',
        name: 'Creamy Peach',
        description: 'Warm and inviting, a subtle apricot glow',
        type: 'gradient',
        colors: ['#FFEBE6', '#FAD9C9', '#F6C8B5'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#7A4C3C', // Warm brown
        secondaryTextColor: 'rgba(122, 76, 60, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#7A4C3C',
        accentColor: '#FAD9C9',
    },

    // 3. Lavender Mist
    {
        id: 'lavender_mist',
        name: 'Lavender Mist',
        description: 'Gentle and ethereal, a cool, light purple',
        type: 'gradient',
        colors: ['#E8E6FA', '#D4D0F0', '#C1BCE5'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#504B6D', // Dark indigo/purple
        secondaryTextColor: 'rgba(80, 75, 109, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#504B6D',
        accentColor: '#D4D0F0',
    },

    // 4. Powder Blue
    {
        id: 'powder_blue',
        name: 'Powder Blue',
        description: 'Light, airy, and professional',
        type: 'gradient',
        colors: ['#E0F7FA', '#B3E5FC', '#81D4FA'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#33658A', // Dark blue
        secondaryTextColor: 'rgba(51, 101, 138, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#33658A',
        accentColor: '#B3E5FC',
    },

    // 5. Vanilla Cream
    {
        id: 'vanilla_cream',
        name: 'Vanilla Cream',
        description: 'A neutral, very light, and classic backdrop',
        type: 'gradient',
        colors: ['#FCF8E8', '#F2EAD0', '#E5DDC0'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#635B4C', // Neutral brown/gray
        secondaryTextColor: 'rgba(99, 91, 76, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#635B4C',
        accentColor: '#F2EAD0',
    },

    // 6. Lemon Chiffon
    {
        id: 'lemon_chiffon',
        name: 'Lemon Chiffon',
        description: 'Bright, cheerful, and softly invigorating',
        type: 'gradient',
        colors: ['#FFFDE7', '#FFFACD', '#FFEE93'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#72643A', // Dark gold/yellow-brown
        secondaryTextColor: 'rgba(114, 100, 58, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#72643A',
        accentColor: '#FFFACD',
    },

    // 7. Silver Linings
    {
        id: 'silver_linings',
        name: 'Silver Linings',
        description: 'A cool, elegant gray-blue',
        type: 'gradient',
        colors: ['#E9EFF3', '#D0DBE0', '#BCC8D0'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#4B5963', // Dark slate gray
        secondaryTextColor: 'rgba(75, 89, 99, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#4B5963',
        accentColor: '#D0DBE0',
    },

    // 8. Coral Blush
    {
        id: 'coral_blush',
        name: 'Coral Blush',
        description: 'A warm pink-orange, lively but soft',
        type: 'gradient',
        colors: ['#FFE0E3', '#FDCACD', '#F9B4B8'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#7C464B', // Muted dark red
        secondaryTextColor: 'rgba(124, 70, 75, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#7C464B',
        accentColor: '#FDCACD',
    },

    // 9. Aqua Glow
    {
        id: 'aqua_glow',
        name: 'Aqua Glow',
        description: 'A refreshing, slightly deeper light blue-green',
        type: 'gradient',
        colors: ['#D0F0F0', '#A8DADA', '#80C4C4'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#3A6B6B', // Dark cyan
        secondaryTextColor: 'rgba(58, 107, 107, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#3A6B6B',
        accentColor: '#A8DADA',
    },

    // 10. Desert Sand
    {
        id: 'desert_sand',
        name: 'Desert Sand',
        description: 'A muted, earthy, and sophisticated light brown',
        type: 'gradient',
        colors: ['#FAF5E9', '#EEDCC8', '#DDBFA2'],
        gradientStart: { x: 0, y: 0 },
        gradientEnd: { x: 1, y: 1 },
        timerCircleColor: '#FFFFFF',
        timerCircleGlow: 'rgba(255, 255, 255, 0.4)',
        textColor: '#755E49', // Dark earthy brown
        secondaryTextColor: 'rgba(117, 94, 73, 0.8)',
        buttonColor: 'rgba(255, 255, 255, 0.3)',
        buttonTextColor: '#755E49',
        accentColor: '#EEDCC8',
    },
];

// Default theme
export const DEFAULT_THEME = THEMES[0]; // Ocean Breeze

// Helper function to get theme by ID
export const getThemeById = (themeId: string): Theme => {
  return THEMES.find(theme => theme.id === themeId) || DEFAULT_THEME;
};
