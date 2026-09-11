const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL as string;

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!SUBGRAPH_URL) {
    throw new Error("VITE_SUBGRAPH_URL not configured");
  }

  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Subgraph HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export interface SubgraphEpoch {
  id: string;
  startsAt: string;
  endsAt: string;
  state: "UPCOMING" | "LIVE" | "SETTLING" | "SETTLED";
  createdAt: string;
}

export interface SubgraphTrader {
  id: string;
  metadata: string; // JSON string: name, handle, bio, avatarUrl, country, tags
  payoutAddress: string;
  traderType: "TRADER" | "ALGO" | "INSTITUTIONAL";
  verified: boolean;
  active: boolean;
  potCount: string;
  registeredAt: string;
  updatedAt: string;
}

export interface SubgraphPot {
  id: string;
  vault: string;
  epoch: string;
  trader: string;
  exposureLimit: string;
  nav: string;
  totalShares: string;
  totalDeposits: string;
  exposure: string;
  halted: boolean;
  approvedPools: string[];
}

export interface SubgraphTrade {
  id: string;
  pot: string;
  pool: string;
  side: "BUY_YES" | "SELL_YES" | "BUY_NO" | "SELL_NO";
  tick: string;
  size: string;
  orderId: string;
  timestamp: string;
}

export interface SubgraphPlatformConfig {
  id: string;
  lpShare: string;
  traderShare: string;
  protocolShare: string;
  treasury: string;
  maxExposure: string;
  minDeposit: string;
  maxPotsPerTrader: string;
  paused: boolean;
}

export async function getEpochs(first: number = 100): Promise<SubgraphEpoch[]> {
  const data = await gql<{ epoches: SubgraphEpoch[] }>(
    `query GetEpochs($first: Int!) {
      epoches(first: $first, orderBy: createdAt, orderDirection: desc) {
        id startsAt endsAt state createdAt
      }
    }`,
    { first },
  );
  return data.epoches;
}

export async function getEpoch(id: string): Promise<SubgraphEpoch | null> {
  const data = await gql<{ epoch: SubgraphEpoch | null }>(
    `query GetEpoch($id: ID!) {
      epoch(id: $id) {
        id startsAt endsAt state createdAt
      }
    }`,
    { id },
  );
  return data.epoch;
}

export async function getTraders(first: number = 100): Promise<SubgraphTrader[]> {
  const data = await gql<{ traders: SubgraphTrader[] }>(
    `query GetTraders($first: Int!) {
      traders(first: $first, orderBy: registeredAt, orderDirection: desc) {
        id metadata payoutAddress traderType verified active potCount registeredAt updatedAt
      }
    }`,
    { first },
  );
  return data.traders;
}

export async function getTrader(id: string): Promise<SubgraphTrader | null> {
  const data = await gql<{ trader: SubgraphTrader | null }>(
    `query GetTrader($id: Bytes!) {
      trader(id: $id) {
        id metadata payoutAddress traderType verified active potCount registeredAt updatedAt
      }
    }`,
    { id },
  );
  return data.trader;
}

export async function getPots(
  first: number = 100,
  epochId?: string,
): Promise<SubgraphPot[]> {
  const where = epochId ? `, where: { epoch: $epochId }` : "";
  const vars: Record<string, unknown> = { first };
  if (epochId) vars.epochId = epochId;

  const data = await gql<{ pots: SubgraphPot[] }>(
    `query GetPots($first: Int${epochId ? ", $epochId: String!" : ""}) {
      pots(first: $first, orderBy: nav, orderDirection: desc${where}) {
        id vault epoch trader exposureLimit nav totalShares totalDeposits exposure halted approvedPools
      }
    }`,
    vars,
  );
  return data.pots;
}

export async function getPot(id: string): Promise<SubgraphPot | null> {
  const data = await gql<{ pot: SubgraphPot | null }>(
    `query GetPot($id: ID!) {
      pot(id: $id) {
        id vault epoch trader exposureLimit nav totalShares totalDeposits exposure halted approvedPools
      }
    }`,
    { id },
  );
  return data.pot;
}

export async function getTrades(
  potId: string,
  first: number = 100,
): Promise<SubgraphTrade[]> {
  const data = await gql<{ trades: SubgraphTrade[] }>(
    `query GetTrades($potId: String!, $first: Int!) {
      trades(first: $first, where: { pot: $potId }, orderBy: timestamp, orderDirection: desc) {
        id pot pool side tick size orderId timestamp
      }
    }`,
    { potId, first },
  );
  return data.trades;
}

export async function getPlatformConfig(): Promise<SubgraphPlatformConfig | null> {
  const data = await gql<{ platformConfig: SubgraphPlatformConfig | null }>(
    `query {
      platformConfig(id: "global") {
        id lpShare traderShare protocolShare treasury maxExposure minDeposit maxPotsPerTrader paused
      }
    }`,
  );
  return data.platformConfig;
}
