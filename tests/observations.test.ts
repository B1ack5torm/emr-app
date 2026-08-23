import assert from "node:assert/strict";
import test from "node:test";
import { exactlyOneObservationValue, interpretNumericObservation } from "../src/lib/domain/observations";

test("structured observations mark values outside the reference range", () => assert.deepEqual(interpretNumericObservation({ value: 12, referenceLow: 4, referenceHigh: 10 }), { interpretation: "HIGH", isCritical: false }));
test("structured observations identify critical thresholds", () => assert.deepEqual(interpretNumericObservation({ value: 18, referenceHigh: 10, criticalHigh: 15 }), { interpretation: "CRITICAL_HIGH", isCritical: true }));
test("structured observations require exactly one typed value", () => { assert.equal(exactlyOneObservationValue({ valueText: "Positive" }), true); assert.equal(exactlyOneObservationValue({ valueText: "Positive", valueBoolean: true }), false); });
