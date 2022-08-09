import { execSync, spawn } from "child_process";

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let processCounter = 0;
export function start(command: string): void {
  const processId = processCounter++;
  console.log(`Starting ${processId}: ${command}`);
  const process = spawn("/bin/sh", ["-c", `${command}`]);

  process.stdout.on("data", data => {
    console.log(`> ${processId}: ${data}`);
  });

  process.stderr.on("data", data => {
    console.error(`> ${processId}: ${data}`);
  });

  process.on("close", code => {
    console.log(`> ${processId} process exited with code ${code}`);
  });

  process.on("error", error => {
    console.error(`> ${processId} failed to start: ${error}`);
  });
}

export function run(command: string): void {
  console.log(`Running: ${command}`);
  execSync(command);
}
