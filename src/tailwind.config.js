/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    },
    extend: {
      spacing: {
        // 擴展間距 (0.25rem 遞增到 120rem)
        ...(() => {
          const result = {};
          for (let i = 1; i <= 480; i++) {
            result[i / 4] = `${i / 16}rem`;
          }
          return result;
        })()
      },
      fontSize: {
        // 擴展字體大小 (0.75rem 到 10rem)
        ...(() => {
          const result = {};
          for (let i = 12; i <= 160; i++) {
            result[i / 4] = `${i / 16}rem`;
          }
          return result;
        })()
      }
    }
  },
  plugins: []
};