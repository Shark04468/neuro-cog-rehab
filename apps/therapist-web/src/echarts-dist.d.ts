declare module "echarts/dist/echarts.esm.min.mjs" {
  export interface MinimalEChartsInstance {
    setOption(option: unknown, notMerge?: boolean): void;
    resize(): void;
    dispose(): void;
  }

  export function init(dom: HTMLElement): MinimalEChartsInstance;
}
