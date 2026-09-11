// Query the indexer for live DreamDEX markets
const INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";

async function queryIndexer(query) {
  const resp = await fetch(INDEXER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return resp.json();
}

async function main() {
  // Try various queries
  const queries = [
    // Try __schema introspection
    `{ __schema { queryType { fields { name } } } }`,
    // Market with minimal fields
    `{ Market(limit: 3, order_by: {createdAtTimestamp: desc}) { id poolAddress createdAtTimestamp } }`,
  ];

  for (const q of queries) {
    console.log("Query:", q.substring(0, 80));
    try {
      const data = await queryIndexer(q);
      if (data?.data) {
        const keys = Object.keys(data.data);
        for (const k of keys) {
          const rows = data.data[k];
          console.log(`  ${k}: ${rows?.length ?? 0} rows`);
          if (rows?.length > 0) {
            for (const r of rows.slice(0, 3)) {
              console.log("   ", JSON.stringify(r).substring(0, 200));
            }
          }
        }
      } else {
        console.log("  Errors:", JSON.stringify(data?.errors).substring(0, 200));
      }
    } catch (e) {
      console.log("  Failed:", e.message);
    }
    console.log();
  }
}

main();
