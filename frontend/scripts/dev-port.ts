import { createServer } from "node:net";

export type ChooseDemoDevPortOptions = {
  preferredPorts?: number[];
  isPortAvailable?: (port: number) => Promise<boolean>;
};

export async function chooseDemoDevPort({
  preferredPorts = [3002, 3003],
  isPortAvailable = isTcpPortAvailable,
}: ChooseDemoDevPortOptions = {}): Promise<number> {
  for (const port of preferredPorts) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available demo dev port. Checked: ${preferredPorts.join(", ")}`);
}

export function isTcpPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}
