import mongoose, { ClientSession } from 'mongoose';

/**
 * Runs a unit of work inside a MongoDB ACID transaction if supported by the cluster
 * (Replica Set / MongoDB Atlas). If running on a standalone MongoDB instance (common
 * in local developer testing), it gracefully executes the unit of work directly.
 */
export async function runInTransaction<T>(
  work: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  let session: ClientSession | null = null;

  try {
    session = await mongoose.startSession();
  } catch {
    // If sessions cannot be created, execute directly
    return await work(null);
  }

  try {
    let result: T;
    let transactionSupported = true;

    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result!;
    } catch (txError: any) {
      const msg = txError?.message || '';
      // Detect standalone MongoDB instances where replica sets are not enabled
      if (
        msg.includes('replica set') ||
        msg.includes('Transaction numbers are only allowed') ||
        msg.includes('Transactions are not supported')
      ) {
        transactionSupported = false;
      } else {
        // Legitimate transaction abort/error (e.g. validation, duplicate key, user error)
        throw txError;
      }
    }

    if (!transactionSupported) {
      // Fallback for standalone dev/test instances
      return await work(null);
    }

    return result!;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
