# n8n settlement workflow

`settlement.json` calls `POST <APP_URL>/api/settlement/run` with a Bearer secret, and builds a summary line when a pact settled. No fitness data reaches n8n.

## Import

1. In n8n, go to Workflows, then Create workflow, then the menu and Import from File. Pick `settlement.json`.
2. Open **Settle pacts** and set the URL to `<APP_URL>/api/settlement/run`.
3. Create a Header Auth credential (Name `Authorization`, Value `Bearer <SETTLEMENT_API_SECRET>`) and select it in that node. The secret is never stored in this file.
4. Execute once to test, then publish the workflow so the 15 minute schedule runs.

Node parameters may need small adjustments on other n8n versions.

## Response the endpoint must return

```json
{
  "settledPacts": 1,
  "pacts": [
    {
      "title": "Campus run",
      "outcome": "split",
      "members": 5,
      "qualifiers": 3,
      "paidLamports": 400000000,
      "signatures": ["..."],
      "receiptUrl": "https://<APP_URL>/pacts/<id>/receipt"
    }
  ]
}
```

`outcome` is one of `split`, `refund_all_succeeded`, `refund_none_succeeded`, `no_funded_participants` (from `@oathmile/core`). Totals only: no names, distances, routes or activities.
