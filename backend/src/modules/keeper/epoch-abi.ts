export const EpochControllerAbi = [
  {
    type: "function",
    name: "epochCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEpoch",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "number", type: "uint256" },
          { name: "startsAt", type: "uint256" },
          { name: "tradingEndsAt", type: "uint256" },
          { name: "endsAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "potCount", type: "uint256" },
          { name: "tvl", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "goLive",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "goSettling",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "goSettled",
    inputs: [{ name: "epochId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createEpoch",
    inputs: [{ name: "startsAt", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
