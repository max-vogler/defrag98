import WorldmapJson from "../assets/worldmapland.json";
import { GameState, NetworkState } from "./types";

export const WORLDMAP_LAND: number[] = WorldmapJson;
export const NETWORK_COUNT = WORLDMAP_LAND.length;

export const PASSWORDS = [
  "123",
  "bios",
  "admin",
  "a1b2c3",
  "hunter2",
  "lkwpeter",
  "password1",
  "qwertyuiop",
  "tr0ub4dor83",
  "ji32k7au4a83",
  "administrator",
  "insitegenieacq",
  "123456789101112",
  "1qaz2wsx3edc4rfv",
  "00000000000000000",
  "correcthorsebatter",
];

const HOSTNAMES = [
  "MOM-PENTIUM98",
  "SCHOOL-LAB-04",
  "LOCAL-ISP-POP3",
  "GEOCITIES-MIRROR",
  "AOL-RELAY-14",
  "MIT-AI-VAX",
  "CERN-LXPLUS-09",
  "ZURICH-SWIFT-GW",
  "NASA-JPL-DEEP",
  "PENTAGON-DMZ-3",
  "ICANN-ROOT-A",
  "TOKYO-EXCHANGE",
  "SVALBARD-SAT-UP",
  "ARPANET-GHOST",
  "DEEP-THOUGHT-98",
  "GLOBAL-BACKBONE",
];

const REGIONS = ["US-EAST", "DE-BERLIN", "JP-TOKYO", "CH-ZURICH", "UK-LONDON", "AU-SYDNEY", "CA-TORONTO", "BR-SAOPAULO", "SE-STOCKHOLM", "KR-SEOUL"];
const PW_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function createInitialNetwork(): NetworkState {
  return {
    discovered: 1,
    owned: 1,
    recentHosts: ["127.0.0.1 [LOCALHOST] — OWNED"],
    discoverySeed: Math.floor(Math.random() * 100000),
  };
}

export function getSeededDiscoveryOrder(seed: number): number[] {
  const arr = [...WORLDMAP_LAND];
  let s = seed || 1337;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getTargetHostInfo(index: number): { host: string; ip: string; region: string } {
  const host =
    index < HOSTNAMES.length
      ? HOSTNAMES[index]
      : `NODE-${(index * 73 + 19).toString(16).toUpperCase()}`;
  const a = 11 + ((index * 37 + 183) % 210);
  const b = (index * 53 + 25) % 254;
  const c = (index * 19 + 4) % 254;
  const d = 1 + ((index * 97 + 12) % 253);
  const region = REGIONS[index % REGIONS.length];
  return { host, ip: `${a}.${b}.${c}.${d}`, region };
}

export function getCurrentPassword(state: GameState): string | undefined {
  return PASSWORDS[state.network.owned - 1];
}

export function generateRandomChars(len: number, exclude = ""): string {
  const pool = PW_CHARS.split("").filter((c) => !exclude.includes(c));
  let out = "";
  for (let i = 0; i < len; i++) {
    out += pool[Math.floor(Math.random() * pool.length)];
  }
  return out;
}
