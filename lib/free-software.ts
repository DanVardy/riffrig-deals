import tools from "@/data/free-starter.json";

export const FREE_STAGES = ["host", "amp", "cabinet", "effects", "capture"] as const;
export type FreeStage = (typeof FREE_STAGES)[number];

export const FREE_STAGE_LABELS: Record<FreeStage, string> = {
  host: "Record and host",
  amp: "Amps",
  cabinet: "Cabinets and IRs",
  effects: "Effects",
  capture: "Capture and models",
};

export const FREE_STAGE_INTRO: Record<FreeStage, string> = {
  host: "Start here. A recorder or DAW is where the other plug-ins run. Pick one that matches your computer. They do not all include the same features.",
  amp: "Add an amp after you have a host, unless the listing includes a standalone app. A free edition is not the paid plugin with a similar name.",
  cabinet: "A loader plays cabinet impulse responses. It does not include those files. Sample packs whose download licence was not checked are not listed.",
  effects: "Delay, reverb, and other effects. They are not guaranteed to suit every amp or every host.",
  capture: "Play captured amp models. The model files and cabinet IRs have their own terms.",
};

export type FreePlatform = "windows" | "macos" | "linux";

export type FreeTool = {
  slug: string;
  name: string;
  vendor: string;
  stage: FreeStage;
  summary: string;
  officialUrl: string;
  platforms: FreePlatform[];
  platformLabel: string;
  requirements: string;
  restrictionLabel: string;
  sourceNote: string;
  checkedOn: string;
  catalogueSlug?: string;
};

export const freeTools = tools as FreeTool[];

export function isFreeStage(value: string | undefined): value is FreeStage {
  return FREE_STAGES.includes(value as FreeStage);
}

export function isFreePlatform(value: string | undefined): value is FreePlatform {
  return value === "windows" || value === "macos" || value === "linux";
}

export function filterFreeTools(stage: string | undefined, platform: string | undefined): FreeTool[] {
  return freeTools.filter((tool) => {
    if (isFreeStage(stage) && tool.stage !== stage) return false;
    if (isFreePlatform(platform) && !tool.platforms.includes(platform)) return false;
    return true;
  });
}
