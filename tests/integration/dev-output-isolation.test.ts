import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../../apps/web/next.config";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

afterEach(() => vi.unstubAllEnvs());
describe("development output isolation", () => {
  it("keeps the regular demo, isolated verification, and production files separate", () => {
    vi.stubEnv("CLIENTFLOW_DEV_INSTANCE", "");
    expect(config(PHASE_DEVELOPMENT_SERVER).distDir).toBe(".next-dev");
    vi.stubEnv("CLIENTFLOW_DEV_INSTANCE", "showcase");
    expect(config(PHASE_DEVELOPMENT_SERVER).distDir).toBe(".next-dev-showcase");
    expect(config(PHASE_PRODUCTION_BUILD).distDir).toBe(".next");
  });
  it.each(["../demo", "UPPERCASE", "/tmp/demo", "a".repeat(41)])("rejects unsafe or ambiguous instance names: %s", instance => {
    vi.stubEnv("CLIENTFLOW_DEV_INSTANCE", instance);
    expect(() => config(PHASE_DEVELOPMENT_SERVER)).toThrow("CLIENTFLOW_DEV_INSTANCE");
  });
});
