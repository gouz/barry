module.exports = {
  purge: {
    enabled: true,
    content: ['./src/**/*.pug'],
    preserveHtmlElements: false,
    mode: 'all',
    options: {
      keyframes: true,
      fontFace: true,
      variables: true,
    },
    corePlugins: {
      float: false,
    },
    safelist: ['input', 'minus', 'first', 'second', 'result', 'wrap'],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
    appearance: [],
  },
  plugins: [],
};
