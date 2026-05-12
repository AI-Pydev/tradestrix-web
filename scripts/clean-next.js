const fs = require("fs");
const path = require("path");

const target = path.join(process.cwd(), ".next");
const allowFailure = process.argv.includes("--allow-failure");

function removeNextDir() {
  if (!fs.existsSync(target)) {
    return;
  }

  fs.rmSync(target, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 250,
  });
}

try {
  removeNextDir();
} catch (error) {
  const isLockError =
    error &&
    (error.code === "EPERM" || error.code === "EBUSY" || error.code === "ENOTEMPTY");

  if (allowFailure && isLockError) {
    console.warn(
      "Warning: could not fully remove .next because Windows is still locking files.",
    );
    console.warn(
      "If dev behaves strangely, stop any running Next.js process and delete .next manually.",
    );
    process.exit(0);
  }

  throw error;
}
