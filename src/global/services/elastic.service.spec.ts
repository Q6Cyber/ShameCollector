import { Client } from '@elastic/elasticsearch';

jest.setTimeout(30000);

describe('ElasticService', () => {
  const PE = process.env; // for readability
  const urlString = `${PE.ES_PROTO}://${PE.ES_HOST}:${PE.ES_PORT}`;
  const url = new URL(urlString);
  url.username = PE.ES_USER || '';
  url.password = PE.ES_PASS || '';
  const node = {
    url: url,
    ssl: {
      rejectUnauthorized: false,
    },
  };
  const client = new Client({ node });

  it('should search for a client', async () => {
    const result: any = await client.search({
      index: process.env.ES_CLIENTS || '',
      // body: {
      query: {
        bool: {
          must: [
            {
              term: {
                'reaperSettings.supportsAutomatedPurchase': {
                  value: true,
                },
              },
            },
          ],
        },
      },
      // },
    });
    expect(result.statusCode).toBe(200);
  });
});
