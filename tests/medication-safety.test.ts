import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMedicationSafety } from "../src/lib/domain/medication-safety";

test("medication safety detects allergy matches", () => assert.equal(evaluateMedicationSafety([{ medicine: "Penicillin V" }], [], ["Penicillin"])[0]?.code, "ALLERGY"));
test("medication safety detects duplicate therapy", () => assert.equal(evaluateMedicationSafety([{ medicine: "Metformin" }], [{ medicine: "Metformin" }], [])[0]?.code, "DUPLICATE_THERAPY"));
test("medication safety detects high-risk interaction pairs", () => assert.ok(evaluateMedicationSafety([{ medicine: "Warfarin" }, { medicine: "Aspirin" }], [], []).some((warning) => warning.code === "INTERACTION")));
