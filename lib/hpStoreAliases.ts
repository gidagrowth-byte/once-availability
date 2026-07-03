const hpStoreAliases: Record<string, string> = {
  gokokuji: "edogawabashi-gokokuji",
  kagurazaka: "edogawabashi-kagurazaka",
  kawasaki: "kawasaki",
  chitose: "chitose-karasuyama",
  karasuyama: "chitose-karasuyama",
  kiyosumi: "kiyosumi-shirakawa",
  sumiyoshi: "sumiyoshi-kikukawa",
};

export function resolveHpStoreId(storeId?: string | null) {
  if (!storeId) {
    return storeId;
  }

  return hpStoreAliases[storeId] ?? storeId;
}
