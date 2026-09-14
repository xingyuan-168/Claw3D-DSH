"""Windows runtime diagnostics (governance-core surface)."""

from __future__ import annotations

import json
import shutil
import sqlite3
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar


@dataclass(frozen=True, slots=True)
class DoctorCheck:
    name: str
    required: bool
    ok: bool
    detail: str


@dataclass(frozen=True, slots=True)
class DoctorReport:
    checks: tuple[DoctorCheck, ...]

    @property
    def ok(self) -> bool:
        return all(check.ok for check in self.checks if check.required)

    @property
    def path_encoding_corrupt(self) -> bool:
        return any(check.name == "path-encoding" and not check.ok for check in self.checks)


class DoctorService:
    _PATH_COLUMNS: ClassVar[dict[str, tuple[str, ...]]] = {
        "worktrees": ("path",),
        "memory_index": ("title", "summary", "source"),
    }

    def __init__(self, project_root: Path | None = None) -> None:
        self.project_root = (project_root or Path.cwd()).resolve()

    def run(self) -> DoctorReport:
        return DoctorReport(
            checks=(
                self._python_check(),
                self._command_check("git", required=True, version_args=("--version",)),
                self._command_check("dsh", required=False, version_args=("--version",)),
                self._sqlite_check(),
                self._path_encoding_check(),
            )
        )

    def _path_encoding_check(self) -> DoctorCheck:
        database_path = self.project_root / ".aios" / "state" / "state.db"
        if not database_path.is_file():
            return DoctorCheck("path-encoding", True, True, "project state database is not present")
        corrupt: list[dict[str, object]] = []
        try:
            with sqlite3.connect(database_path) as connection:
                connection.row_factory = sqlite3.Row
                tables = {
                    str(row[0])
                    for row in connection.execute(
                        "SELECT name FROM sqlite_master WHERE type = 'table'"
                    )
                }
                for table, requested_columns in self._PATH_COLUMNS.items():
                    if table not in tables:
                        continue
                    available = {
                        str(row[1]) for row in connection.execute(f'PRAGMA table_info("{table}")')
                    }
                    for column in requested_columns:
                        if column not in available:
                            continue
                        rows = connection.execute(
                            f'SELECT rowid, "{column}" FROM "{table}" '
                            f'WHERE instr("{column}", char(65533)) > 0'
                        ).fetchall()
                        corrupt.extend(
                            {
                                "table": table,
                                "record": int(row["rowid"]),
                                "field": column,
                            }
                            for row in rows
                        )
        except sqlite3.Error as exc:
            return DoctorCheck("path-encoding", True, False, f"state database unreadable: {exc}")
        detail = json.dumps(
            {
                "code": "PATH_ENCODING_CORRUPT" if corrupt else None,
                "records": corrupt,
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return DoctorCheck("path-encoding", True, not corrupt, detail)

    @staticmethod
    def _python_check() -> DoctorCheck:
        version = sys.version_info
        ok = version.major == 3 and version.minor == 12
        return DoctorCheck(
            name="python",
            required=True,
            ok=ok,
            detail=f"{version.major}.{version.minor}.{version.micro}",
        )

    @staticmethod
    def _sqlite_check() -> DoctorCheck:
        try:
            with sqlite3.connect(":memory:") as connection:
                connection.execute("CREATE VIRTUAL TABLE memory_probe USING fts5(content)")
            return DoctorCheck("sqlite-fts5", True, True, sqlite3.sqlite_version)
        except sqlite3.Error as exc:
            return DoctorCheck("sqlite-fts5", True, False, str(exc))

    def _command_check(
        self,
        name: str,
        *,
        required: bool,
        version_args: tuple[str, ...],
    ) -> DoctorCheck:
        return self._executable_check(
            name,
            shutil.which(name),
            required=required,
            version_args=version_args,
        )

    @staticmethod
    def _executable_check(
        name: str,
        executable: str | None,
        *,
        required: bool,
        version_args: tuple[str, ...],
    ) -> DoctorCheck:
        if executable is None:
            return DoctorCheck(name, required, False, "executable not found")
        result = _run_command((executable, *version_args), timeout=10)
        detail = result.stdout.strip() or result.stderr.strip() or executable
        return DoctorCheck(name, required, result.returncode == 0, detail)


def _run_command(command: tuple[str, ...], *, timeout: int) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return subprocess.CompletedProcess(command, 1, "", str(exc))
