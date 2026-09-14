from __future__ import annotations

from pathlib import Path

from ai_engineering_os.application.doctor import DoctorService


def test_doctor_core_environment_passes(tmp_path: Path) -> None:
    report = DoctorService(tmp_path).run()
    names = [check.name for check in report.checks]
    assert {"python", "git", "dsh", "sqlite-fts5", "path-encoding"} == set(names)
    for name in ("python", "git", "sqlite-fts5", "path-encoding"):
        check = next(item for item in report.checks if item.name == name)
        assert check.ok is True, (name, check.detail)
    dsh = next(item for item in report.checks if item.name == "dsh")
    assert dsh.required is False  # optional: governance degrades gracefully without DSH
    assert report.path_encoding_corrupt is False
