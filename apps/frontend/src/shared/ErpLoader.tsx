import type { CSSProperties } from "react";

type KietLoaderTheme = "light" | "dark";

type ErpLoaderProps = {
  label?: string;
  theme?: KietLoaderTheme;
  size?: number;
  fullScreen?: boolean;
};

export function ErpLoader({ label = "", theme, size = 116, fullScreen = false }: ErpLoaderProps) {
  const style = { "--kiet-loader-size": `${size}px` } as CSSProperties;

  return (
    <div
      className={`kiet-loader ${fullScreen ? "kiet-loader-fullscreen" : "kiet-loader-inline"}`}
      data-theme={theme}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="kiet-loader-mark">
        <div className="kiet-loader-ring kiet-loader-ring-blue" />
        <div className="kiet-loader-ring kiet-loader-ring-red" />
        <div className="kiet-loader-disc">
          <img className="kiet-loader-logo" src="/kiet-logo.png" alt="KIET Group of Institutions" />
        </div>
      </div>
      {label ? <p className="kiet-loader-label">{label}</p> : null}
    </div>
  );
}

export function KietLoader(props: Omit<ErpLoaderProps, "theme">) {
  return <ErpLoader {...props} theme="light" />;
}

export function KietLoaderSDK(props: ErpLoaderProps) {
  return <ErpLoader {...props} />;
}
