import { test } from "bun:test";
import { convert } from "../../backend/converters/inkscape";
import { runCommonTests } from "./helpers/commonTests";

runCommonTests(convert);

test.skip("dummy - required to trigger test detection", () => {});
