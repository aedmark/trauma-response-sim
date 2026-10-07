import copy
import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("manual", ROOT / "tools" / "manual.py")
manual = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(manual)


class ManualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source_path = ROOT / "docs" / "trs.manual.json"
        cls.source = manual.load_source(cls.source_path)
        cls.expanded = manual.expand_placeholders(copy.deepcopy(cls.source), cls.source)

    def test_project_manual_validates(self):
        errors, warnings = manual.validate(self.expanded)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_project_manual_builds(self):
        output = manual.build_html(self.expanded)
        self.assertIn("Trauma Response Simulator Manual", output)
        self.assertIn("What it does", output)
        self.assertEqual(output.count('<article class="entry"'), 13)

    def test_build_command_writes_file(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "manual.html"
            result = manual.run_build(self.source_path, output, [])
            self.assertEqual(result, 0)
            self.assertTrue(output.is_file())

    def test_overrides_and_placeholders(self):
        data = copy.deepcopy(self.source)
        manual.apply_override(data, "project.version=9.9.9")
        expanded = manual.expand_placeholders(data, copy.deepcopy(data))
        self.assertIn("9.9.9", expanded["manual"]["footer"])

    def test_safe_relative_links_render(self):
        self.assertIn('href="../README.md"', manual.inline("[README](../README.md)"))
        self.assertNotIn("href=", manual.inline("[Unsafe](javascript:alert(1))"))

    def test_duplicate_ids_are_errors(self):
        data = copy.deepcopy(self.expanded)
        data["sections"][0]["entries"][1]["id"] = data["sections"][0]["entries"][0]["id"]
        errors, _ = manual.validate(data)
        self.assertTrue(any("duplicate ID" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
