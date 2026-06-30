export type StoreType = "direct" | "fc";

export type Store = {
  id: string;
  name: string;
  type: StoreType;
  keywords: readonly string[];
  shiftSheetName?: string;
  extraSlotTimes?: readonly string[];
  lineUrl: string;
  lineOaId: string;
  area: string;
  address: string;
  nearestStation: string;
};

export const defaultStoreId = "edogawabashi-gokokuji";

export const stores = [
  {
    id: "kawasaki",
    name: "川崎店",
    type: "direct",
    keywords: ["川崎店"],
    lineUrl: "",
    lineOaId: "@340xeyzq",
    area: "川崎",
    address: "神奈川県川崎市エリア",
    nearestStation: "川崎駅周辺",
  },
  {
    id: "chitose-karasuyama",
    name: "千歳烏山店",
    type: "direct",
    keywords: ["千歳烏山店"],
    shiftSheetName: "chitosekarasuyama",
    lineUrl: "",
    lineOaId: "@362yvuor",
    area: "世田谷区・千歳烏山",
    address: "東京都世田谷区 千歳烏山エリア",
    nearestStation: "千歳烏山駅周辺",
  },
  {
    id: "edogawabashi-kagurazaka",
    name: "江戸川橋・神楽坂店",
    type: "direct",
    keywords: ["江戸川橋・神楽坂店"],
    lineUrl: "",
    lineOaId: "@872mltsa",
    area: "文京区・江戸川橋 / 神楽坂",
    address: "東京都文京区 江戸川橋・神楽坂エリア",
    nearestStation: "江戸川橋駅・神楽坂駅周辺",
  },
  {
    id: "edogawabashi-gokokuji",
    name: "江戸川橋・護国寺店",
    type: "direct",
    keywords: ["江戸川橋・護国寺店", "護国寺店(音羽)"],
    lineUrl: "https://lin.ee/sU6HrTW",
    lineOaId: "@509ldntt",
    area: "文京区・江戸川橋 / 護国寺",
    address: "東京都文京区 江戸川橋・護国寺エリア",
    nearestStation: "江戸川橋駅・護国寺駅周辺",
  },
  {
    id: "kiyosumi-shirakawa",
    name: "清澄白河店",
    type: "fc",
    keywords: ["清澄白河店"],
    shiftSheetName: "kiyosumishirakawa",
    extraSlotTimes: ["21:10"],
    lineUrl: "",
    lineOaId: "@080fklpc",
    area: "江東区・清澄白河",
    address: "東京都江東区 清澄白河エリア",
    nearestStation: "清澄白河駅周辺",
  },
  {
    id: "sumiyoshi-kikukawa",
    name: "住吉・菊川店",
    type: "fc",
    keywords: ["住吉・菊川店"],
    extraSlotTimes: ["21:10"],
    lineUrl: "",
    lineOaId: "@340hcwpv",
    area: "江東区・住吉 / 菊川",
    address: "東京都江東区 住吉・菊川エリア",
    nearestStation: "住吉駅・菊川駅周辺",
  },
] as const satisfies readonly Store[];

export type StoreId = (typeof stores)[number]["id"];

export function getStoreById(storeId?: string | null): Store {
  return stores.find((store) => store.id === storeId) ?? getDefaultStore();
}

export function getDefaultStore(): Store {
  return stores.find((store) => store.id === defaultStoreId) ?? stores[0];
}
