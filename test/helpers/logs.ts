import { expect } from "chai";
import { Contract, ContractTransaction } from "ethers";

export type EventLog = {
  contract: Contract;
  eventName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
};

/**
 * Checks the tx for the exact logs specified including order, count, and args.
 */
export async function assertAllLogs(
  tx: ContractTransaction | Promise<ContractTransaction>,
  logs: EventLog[],
): Promise<void> {
  if (tx instanceof Promise) {
    tx = await tx;
  }
  const receipt = await tx.wait();
  expect(receipt.logs.length).to.eq(
    logs.length,
    `Log count mismatch. Expected ${logs.length} logs, got ${receipt.logs.length}: ${JSON.stringify(receipt.logs)}`,
  );
  for (let i = 0; i < logs.length; i++) {
    const emittedLog = receipt.logs[i];
    const expectedLog = logs[i];
    expect(emittedLog.address).to.eq(
      expectedLog.contract.address,
      `Log address mismatch at index ${i}; expected ${expectedLog.contract.address}, got ${emittedLog.address}`,
    );
    // Throws if the event is not found
    const fragment = expectedLog.contract.interface.getEvent(expectedLog.eventName);
    const topic0 = expectedLog.contract.interface.getEventTopic(fragment);
    // Confirms order by event name
    expect(emittedLog.topics[0]).to.eq(
      topic0,
      `Topic 0 mismatch at index ${i}. Expected ${expectedLog.eventName} (${topic0}), got ${emittedLog.topics[0]}`,
    );

    // For simplicity, check for args with the chai matcher
    // -- this means we do not validate the order args emit when the same event name is emitted multiple times
    await expect(tx)
      .to.emit(expectedLog.contract, expectedLog.eventName)
      .withArgs(...expectedLog.args);
  }
}
