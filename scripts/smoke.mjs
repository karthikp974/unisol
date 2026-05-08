const checks = [
  {
    name: "frontend",
    url: "http://localhost:5173/",
    expected: [200]
  },
  {
    name: "backend auth guard",
    url: "http://localhost:4000/api/auth/me",
    expected: [401]
  }
];

async function runCheck(check) {
  const response = await fetch(check.url);
  if (!check.expected.includes(response.status)) {
    throw new Error(`${check.name} returned ${response.status}, expected ${check.expected.join(" or ")}`);
  }

  console.log(`${check.name}: OK (${response.status})`);
}

for (const check of checks) {
  try {
    await runCheck(check);
  } catch (error) {
    console.error(`${check.name}: FAILED`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
