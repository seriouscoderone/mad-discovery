/** Every limit of docs/design.md, in one place. The numbers are the design's proposals; the rows are what must exist. */

/** One run's limits: the walk's and get's column of the table in "Fetching safely". The catalog build's column arrives with the second epic. */
export type Limits = {
  requestMs: number;              // one request, from before name resolution to the last byte
  fileBytes: number;              // one fetched file
  definitionsPerSource: number;   // taken in SAID order
  introductionsPerSource: number; // taken in address order
  introductionDepth: number;      // depth of introductions from the starting source
  sourcesPerRun: number;
  hostMs: number;                 // one host, all its sources and requests
  hostBytes: number;              // bytes read from one host
  hostsInFlight: number;          // hosts fetched from at once; each host gets one request at a time whatever this is
  runMs: number | null;           // the whole run; null means no clock
};

/** A source document or a definition, as a file: the build refuses to write a larger one and a reader refuses to read one. */
export const FILE_BYTES = 1_000_000;

export const WALK: Limits = {
  requestMs: 10_000,
  fileBytes: FILE_BYTES,
  definitionsPerSource: 50,
  introductionsPerSource: 10,
  introductionDepth: 3,
  sourcesPerRun: 50,
  hostMs: 60_000,
  hostBytes: 20_000_000,
  hostsInFlight: 8,
  runMs: 120_000,
};

/** JSON Pointer paths reported for one definition, and the nesting depth beyond which nothing is parsed. */
export const PATH_LIMITS = { maxPaths: 16, maxLength: 256, maxDepth: 64 } as const;

/** A publication's fields. */
export const PUBLICATION = { name: 200, description: 2000, tags: 32, tag: 64, collection: 200 } as const;
