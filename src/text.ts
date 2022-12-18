const UNIT_LOOKUP = [
  { value: 1e3, symbol: "k" },
  { value: 1e6, symbol: "m" },
  { value: 1e9, symbol: "g" },
  { value: 1e12, symbol: "t" },
  { value: 1e15, symbol: "p" },
  { value: 1e18, symbol: "e" },
  { value: 1e21, symbol: "z" },
  { value: 1e24, symbol: "y" },
]
  .slice()
  .reverse();

const NBSP = " ";

export function unit(n: number, suffix: string = "") {
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = UNIT_LOOKUP.find((item) => n >= item.value);

  if (item) {
    const formattedNum = (n / item.value).toFixed(3).replace(rx, "$1");
    return `${formattedNum} ${item.symbol}${suffix}`;
  } else if (suffix) {
    return `${n}${NBSP}${suffix}`;
  } else {
    return `${n}`;
  }
}
