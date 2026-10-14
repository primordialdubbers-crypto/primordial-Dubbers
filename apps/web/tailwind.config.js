/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PDI User & Studio UI Tokens (Combo 03: Charcoal Violet & Cyber Lime)
        'charcoal-violet': '#3C1A47',
        'cyber-lime': '#B6FF00',
        
        // PDI Admin Console & Governance Tokens (Combo 05: Fresh Canopy & Lime Sprout)
        'fresh-canopy': '#2D3E2C',
        'lime-sprout': '#E4FD97',

        // Base Dark Cinematic Canvas
        pdi: {
          bg: '#080D17',
          surface: '#121D30',
          elevated: '#17253D',
          border: '#1E2C45',
          blue: '#168DFF',
          gold: '#D5A02E',
          crimson: '#D95436',
        },

        // Rank Tiers
        rank: {
          ED: '#8A99AD',
          C: '#4E97C2',
          B: '#168DFF',
          A: '#D5A02E',
          S: '#D95436',
        }
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
