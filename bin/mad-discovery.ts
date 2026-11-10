import { main } from "../src/cli.ts";

process.exitCode = main(process.argv.slice(2), {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
});
