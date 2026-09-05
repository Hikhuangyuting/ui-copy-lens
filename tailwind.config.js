/** @type {import('tailwindcss').Config} */
/**
 * Design tokens extracted from Figma「UI 文案优化」
 * @see https://www.figma.com/design/x4AId3eQ7MoTehZCB5XpJI/UI-%E6%96%87%E6%A1%88%E4%BC%98%E5%8C%96
 */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#f1f2f3",
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8f9f9",
        },
        text: {
          DEFAULT: "#000000",
          primary: "#000000",
          label: "#333333",
          body: "#333333",
          muted: "rgba(0, 0, 0, 0.4)",
          onPrimary: "#ffffff",
        },
        stroke: {
          DEFAULT: "#b8b8b8",
          subtle: "rgba(0, 0, 0, 0.08)",
        },
        primary: {
          DEFAULT: "#000000",
          hover: "rgba(0, 0, 0, 0.9)",
          disabled: "rgba(0, 0, 0, 0.2)",
        },
        tag: {
          bg: "#f1f2f3",
          "bg-active": "rgba(0, 0, 0, 0.2)",
          text: "rgba(0, 0, 0, 0.8)",
        },
        icon: {
          DEFAULT: "#333333",
          muted: "#b8b8b8",
        },
      },
      borderRadius: {
        card: "24px",
        input: "16px",
        button: "12px",
        tag: "8px",
        toolbar: "8px",
      },
      fontSize: {
        /** 主按钮、次级按钮 */
        "button": ["18px", { lineHeight: "21.096px", fontWeight: "400" }],
        /** 工具栏、计数器 */
        "toolbar": ["14px", { lineHeight: "16.408px" }],
        /** Tag */
        "tag": ["12px", { lineHeight: "14.064px" }],
        /** 面板小标题 */
        "panel-section": ["16px", { lineHeight: "18.752px" }],
      },
      boxShadow: {
        panel: "0 1px 3px rgba(0, 0, 0, 0.04)",
        toolbar: "0 1px 2px rgba(0, 0, 0, 0.06)",
      },
      spacing: {
        "button-x": "16px",
        "button-y": "8px",
        "tag-x": "16px",
        "tag-y": "8px",
        "toolbar-x": "24px",
        "toolbar-y": "16px",
      },
      maxWidth: {
        "button-primary": "368px",
        "button-secondary": "240px",
      },
      fontFamily: {
        sans: [
          "HarmonyOS Sans SC",
          "PingFang SC",
          "Noto Sans SC",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
