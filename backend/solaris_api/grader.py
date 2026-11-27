"""
Solaris Academy v2.0 Core Verification Engines:
  1. Zero-Eval Python AST Static Security Validator & Tree-Walking Sandbox Evaluator
  2. SuperMemo-2 (SM-2) Spaced-Repetition Scheduler
  3. HMAC-SHA256 Verifiable Certificate Issuer & Constant-Time Verifier

Security guarantee: This module NEVER calls Python's built-in eval(), exec(),
compile(), or __import__(). All student code is validated via ast.parse() and
executed inside a bounded AST tree-walking interpreter with deterministic step,
recursion, and collection-size budgets.
"""

from __future__ import annotations

import ast
import copy
import hashlib
import hmac
import math
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Literal

# ============================================================================
# 1. ZERO-EVAL PYTHON AST SECURITY VALIDATOR & BOUNDED INTERPRETER
# ============================================================================

FORBIDDEN_IDENTIFIERS: frozenset[str] = frozenset(
    {
        "eval",
        "exec",
        "compile",
        "open",
        "input",
        "breakpoint",
        "getattr",
        "setattr",
        "delattr",
        "hasattr",
        "globals",
        "locals",
        "vars",
        "dir",
        "type",
        "object",
        "super",
        "memoryview",
        "classmethod",
        "staticmethod",
        "property",
        "help",
        "exit",
        "quit",
        "license",
        "credits",
        "copyright",
        "__import__",
        "__builtins__",
        "__loader__",
        "__spec__",
    }
)

SAFE_METHODS: frozenset[str] = frozenset(
    {
        # list
        "append",
        "extend",
        "insert",
        "pop",
        "remove",
        "clear",
        "index",
        "count",
        "sort",
        "reverse",
        "copy",
        # dict
        "get",
        "items",
        "keys",
        "values",
        "update",
        "setdefault",
        # set
        "add",
        "discard",
        "union",
        "intersection",
        "difference",
        "issubset",
        "issuperset",
        # str
        "lower",
        "upper",
        "strip",
        "lstrip",
        "rstrip",
        "split",
        "rsplit",
        "join",
        "replace",
        "startswith",
        "endswith",
        "find",
        "isdigit",
        "isalpha",
        "isalnum",
        "islower",
        "isupper",
        "title",
    }
)

ALLOWED_ISINSTANCE_TYPES = (int, float, str, bool, list, dict, set, tuple)
MAX_COLLECTION_SIZE = 10_000
MAX_RECURSION_DEPTH = 64
DEFAULT_MAX_STEPS = 10_000


class AstSecurityViolationError(Exception):
    """Raised when user-submitted Python code violates static AST security rules."""

    def __init__(self, violations: list[str]) -> None:
        self.violations = violations
        super().__init__("; ".join(violations))


class SandboxSyntaxError(Exception):
    """Raised when user-submitted Python code fails AST parsing."""


class SandboxRuntimeError(Exception):
    """Raised when bounded AST interpretation fails or exceeds resource budgets."""


@dataclass(frozen=True)
class AstValidationResult:
    safe: bool
    violations: list[str]
    node_count: int
    tree: ast.Module | None


class _AstSecurityVisitor(ast.NodeVisitor):
    """Strict AST static analyzer blocking imports, dunders, exec/eval, and escape hatches."""

    def __init__(self) -> None:
        self.violations: list[str] = []
        self.node_count: int = 0

    def generic_visit(self, node: ast.AST) -> None:
        self.node_count += 1
        super().generic_visit(node)

    def _reject(self, message: str) -> None:
        if message not in self.violations:
            self.violations.append(message)

    def visit_Import(self, node: ast.Import) -> None:
        self.node_count += 1
        names = ", ".join(alias.name for alias in node.names)
        self._reject(f"Import statement blocked: 'import {names}'")

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        self.node_count += 1
        mod = node.module or ""
        self._reject(f"Import statement blocked: 'from {mod} import ...'")

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.node_count += 1
        self._reject(f"Class definition blocked in algorithmic sandbox: 'class {node.name}'")

    def visit_With(self, node: ast.With) -> None:
        self.node_count += 1
        self._reject("Context manager 'with' statement is prohibited in sandbox")

    def visit_AsyncWith(self, node: ast.AsyncWith) -> None:
        self.node_count += 1
        self._reject("Async context manager 'async with' is prohibited in sandbox")

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self.node_count += 1
        self._reject(f"Async function '{node.name}' is prohibited in deterministic sandbox")

    def visit_AsyncFor(self, node: ast.AsyncFor) -> None:
        self.node_count += 1
        self._reject("Async iteration 'async for' is prohibited in sandbox")

    def visit_Await(self, node: ast.Await) -> None:
        self.node_count += 1
        self._reject("'await' expression is prohibited in deterministic sandbox")

    def visit_Yield(self, node: ast.Yield) -> None:
        self.node_count += 1
        self._reject("Generator 'yield' is prohibited in sandbox")

    def visit_YieldFrom(self, node: ast.YieldFrom) -> None:
        self.node_count += 1
        self._reject("Generator 'yield from' is prohibited in sandbox")

    def visit_Global(self, node: ast.Global) -> None:
        self.node_count += 1
        self._reject("Global scope mutation ('global') is prohibited in sandbox")

    def visit_Nonlocal(self, node: ast.Nonlocal) -> None:
        self.node_count += 1
        self._reject("Nonlocal scope mutation ('nonlocal') is prohibited in sandbox")

    def visit_Delete(self, node: ast.Delete) -> None:
        self.node_count += 1
        self._reject("Delete statement ('del') is prohibited in sandbox")

    def visit_Name(self, node: ast.Name) -> None:
        self.node_count += 1
        ident = node.id
        if ident.startswith("__") or ident.endswith("__"):
            self._reject(f"Dunder identifier access blocked: '{ident}'")
        elif ident in FORBIDDEN_IDENTIFIERS:
            self._reject(f"Forbidden builtin/identifier blocked: '{ident}'")

    def visit_Attribute(self, node: ast.Attribute) -> None:
        self.node_count += 1
        attr = node.attr
        if attr.startswith("__") or attr.endswith("__"):
            self._reject(f"Dunder attribute access blocked: '.{attr}'")
        elif attr not in SAFE_METHODS:
            self._reject(f"Attribute '.{attr}' is not in the safe method allowlist")
        self.visit(node.value)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.node_count += 1
        if node.name.startswith("__") or node.name.endswith("__"):
            self._reject(f"Dunder function name blocked: '{node.name}'")
        if node.decorator_list:
            self._reject(f"Function decorators are prohibited on '{node.name}'")
        for arg in (
            *node.args.posonlyargs,
            *node.args.args,
            *node.args.kwonlyargs,
        ):
            if arg.arg.startswith("__") or arg.arg.endswith("__"):
                self._reject(f"Dunder parameter name blocked: '{arg.arg}'")
        self.generic_visit(node)


def validate_python_ast(code: str) -> AstValidationResult:
    """Parse and statically validate Python source code against strict AST security policy."""
    if not code or not code.strip():
        raise SandboxSyntaxError("Submitted code cannot be empty")
    if len(code) > 25_000:
        raise AstSecurityViolationError(["Submitted source exceeds maximum length of 25,000 chars"])

    try:
        tree = ast.parse(code, mode="exec")
    except SyntaxError as exc:
        raise SandboxSyntaxError(f"SyntaxError at line {exc.lineno}: {exc.msg}") from exc

    visitor = _AstSecurityVisitor()
    visitor.visit(tree)

    if visitor.violations:
        return AstValidationResult(
            safe=False,
            violations=visitor.violations,
            node_count=visitor.node_count,
            tree=None,
        )

    return AstValidationResult(
        safe=True,
        violations=[],
        node_count=visitor.node_count,
        tree=tree,
    )


class _ReturnSignal(Exception):
    def __init__(self, value: Any) -> None:
        self.value = value


class _BreakSignal(Exception):
    pass


class _ContinueSignal(Exception):
    pass


@dataclass
class _UserFunction:
    name: str
    params: list[str]
    defaults: list[Any]
    body: list[ast.stmt]
    closure_env: dict[str, Any]


def _safe_range(*args: Any) -> list[int]:
    r = range(*args)
    if len(r) > MAX_COLLECTION_SIZE:
        raise SandboxRuntimeError(f"range() size {len(r)} exceeds limit {MAX_COLLECTION_SIZE}")
    return list(r)


def _safe_pow(base: Any, exp: Any, mod: Any = None) -> Any:
    if isinstance(exp, (int, float)) and abs(exp) > 1000:
        raise SandboxRuntimeError("Exponent exceeds sandbox safety bound (1000)")
    return pow(base, exp) if mod is None else pow(base, exp, mod)


def _safe_isinstance(obj: Any, typ: Any) -> bool:
    if isinstance(typ, tuple):
        if not all(t in ALLOWED_ISINSTANCE_TYPES for t in typ):
            raise SandboxRuntimeError("Unsupported type in isinstance()")
        return isinstance(obj, typ)
    if typ not in ALLOWED_ISINSTANCE_TYPES:
        raise SandboxRuntimeError("Unsupported type in isinstance()")
    return isinstance(obj, typ)


def _build_safe_builtins() -> dict[str, Any]:
    return {
        "abs": abs,
        "all": all,
        "any": any,
        "bool": bool,
        "dict": dict,
        "divmod": divmod,
        "enumerate": enumerate,
        "float": float,
        "int": int,
        "isinstance": _safe_isinstance,
        "len": len,
        "list": list,
        "max": max,
        "min": min,
        "pow": _safe_pow,
        "range": _safe_range,
        "reversed": lambda seq: list(reversed(seq)),
        "round": round,
        "set": set,
        "sorted": sorted,
        "str": str,
        "sum": sum,
        "tuple": tuple,
        "zip": lambda *iters: list(zip(*iters)),
    }


class _SafeAstInterpreter:
    """Deterministic zero-eval tree-walking Python AST interpreter."""

    def __init__(self, max_steps: int = DEFAULT_MAX_STEPS) -> None:
        self.max_steps = max_steps
        self.steps = 0
        self.call_depth = 0
        self.builtins = _build_safe_builtins()
        self.globals: dict[str, Any] = {}

    def _tick(self) -> None:
        self.steps += 1
        if self.steps > self.max_steps:
            raise SandboxRuntimeError(
                f"Execution aborted: deterministic step limit ({self.max_steps}) exceeded"
            )

    def load_module(self, tree: ast.Module) -> None:
        for stmt in tree.body:
            self._exec_stmt(stmt, self.globals)

    def invoke_function(self, function_name: str, args: list[Any]) -> Any:
        fn = self.globals.get(function_name)
        if not isinstance(fn, _UserFunction):
            raise SandboxRuntimeError(
                f"Required function '{function_name}' was not defined in submitted code"
            )
        return self._call_user_function(fn, copy.deepcopy(args), {})

    def _call_user_function(
        self,
        fn: _UserFunction,
        pos_args: list[Any],
        kw_args: dict[str, Any],
    ) -> Any:
        if self.call_depth >= MAX_RECURSION_DEPTH:
            raise SandboxRuntimeError(
                f"Recursion depth limit ({MAX_RECURSION_DEPTH}) exceeded in '{fn.name}'"
            )

        local_env: dict[str, Any] = dict(fn.closure_env)
        num_params = len(fn.params)
        num_defaults = len(fn.defaults)
        default_start = num_params - num_defaults

        if len(pos_args) > num_params:
            raise SandboxRuntimeError(
                f"'{fn.name}' takes at most {num_params} argument(s), got {len(pos_args)}"
            )

        for idx, param_name in enumerate(fn.params):
            if idx < len(pos_args):
                local_env[param_name] = pos_args[idx]
            elif param_name in kw_args:
                local_env[param_name] = kw_args[param_name]
            elif idx >= default_start:
                local_env[param_name] = copy.deepcopy(fn.defaults[idx - default_start])
            else:
                raise SandboxRuntimeError(
                    f"'{fn.name}' missing required argument '{param_name}'"
                )

        self.call_depth += 1
        try:
            for stmt in fn.body:
                self._exec_stmt(stmt, local_env)
            return None
        except _ReturnSignal as ret:
            return ret.value
        finally:
            self.call_depth -= 1

    def _assign_target(self, target: ast.AST, value: Any, env: dict[str, Any]) -> None:
        if isinstance(target, ast.Name):
            env[target.id] = value
            return
        if isinstance(target, (ast.Tuple, ast.List)):
            seq = list(value)
            if len(seq) != len(target.elts):
                raise SandboxRuntimeError(
                    f"Cannot unpack {len(seq)} value(s) into {len(target.elts)} target(s)"
                )
            for sub_target, sub_val in zip(target.elts, seq):
                self._assign_target(sub_target, sub_val, env)
            return
        if isinstance(target, ast.Subscript):
            container = self._eval_expr(target.value, env)
            key = self._eval_slice(target.slice, env)
            container[key] = value
            return
        raise SandboxRuntimeError(f"Unsupported assignment target: {type(target).__name__}")

    def _exec_stmt(self, stmt: ast.stmt, env: dict[str, Any]) -> None:
        self._tick()

        if isinstance(stmt, ast.Pass):
            return

        if isinstance(stmt, ast.Expr):
            self._eval_expr(stmt.value, env)
            return

        if isinstance(stmt, ast.Return):
            val = self._eval_expr(stmt.value, env) if stmt.value is not None else None
            raise _ReturnSignal(val)

        if isinstance(stmt, ast.Break):
            raise _BreakSignal()

        if isinstance(stmt, ast.Continue):
            raise _ContinueSignal()

        if isinstance(stmt, ast.FunctionDef):
            params = [a.arg for a in stmt.args.args]
            defaults = [self._eval_expr(d, env) for d in stmt.args.defaults]
            user_fn = _UserFunction(
                name=stmt.name,
                params=params,
                defaults=defaults,
                body=stmt.body,
                closure_env=env,
            )
            env[stmt.name] = user_fn
            return

        if isinstance(stmt, ast.Assign):
            val = self._eval_expr(stmt.value, env)
            for target in stmt.targets:
                self._assign_target(target, val, env)
            return

        if isinstance(stmt, ast.AnnAssign):
            if stmt.value is not None:
                val = self._eval_expr(stmt.value, env)
                self._assign_target(stmt.target, val, env)
            return

        if isinstance(stmt, ast.AugAssign):
            current = self._eval_expr(stmt.target, env)
            rhs = self._eval_expr(stmt.value, env)
            updated = self._apply_binop(stmt.op, current, rhs)
            self._assign_target(stmt.target, updated, env)
            return

        if isinstance(stmt, ast.If):
            branch = stmt.body if self._eval_expr(stmt.test, env) else stmt.orelse
            for child in branch:
                self._exec_stmt(child, env)
            return

        if isinstance(stmt, ast.For):
            iterable = self._eval_expr(stmt.iter, env)
            broke = False
            for item in iterable:
                self._tick()
                self._assign_target(stmt.target, item, env)
                try:
                    for child in stmt.body:
                        self._exec_stmt(child, env)
                except _ContinueSignal:
                    continue
                except _BreakSignal:
                    broke = True
                    break
            if not broke:
                for child in stmt.orelse:
                    self._exec_stmt(child, env)
            return

        if isinstance(stmt, ast.While):
            broke = False
            while self._eval_expr(stmt.test, env):
                self._tick()
                try:
                    for child in stmt.body:
                        self._exec_stmt(child, env)
                except _ContinueSignal:
                    continue
                except _BreakSignal:
                    broke = True
                    break
            if not broke:
                for child in stmt.orelse:
                    self._exec_stmt(child, env)
            return

        raise SandboxRuntimeError(f"Unsupported statement type: {type(stmt).__name__}")

    def _eval_slice(self, node: ast.AST, env: dict[str, Any]) -> Any:
        if isinstance(node, ast.Slice):
            lower = self._eval_expr(node.lower, env) if node.lower is not None else None
            upper = self._eval_expr(node.upper, env) if node.upper is not None else None
            step = self._eval_expr(node.step, env) if node.step is not None else None
            return slice(lower, upper, step)
        return self._eval_expr(node, env)

    def _apply_binop(self, op: ast.operator, left: Any, right: Any) -> Any:
        if isinstance(op, ast.Add):
            result = left + right
            if isinstance(result, (list, tuple, str)) and len(result) > MAX_COLLECTION_SIZE:
                raise SandboxRuntimeError("Sequence size limit exceeded")
            return result
        if isinstance(op, ast.Sub):
            return left - right
        if isinstance(op, ast.Mult):
            if isinstance(left, (list, tuple, str)) and isinstance(right, int):
                if len(left) * max(0, right) > MAX_COLLECTION_SIZE:
                    raise SandboxRuntimeError("Sequence repetition exceeds size limit")
            if isinstance(right, (list, tuple, str)) and isinstance(left, int):
                if len(right) * max(0, left) > MAX_COLLECTION_SIZE:
                    raise SandboxRuntimeError("Sequence repetition exceeds size limit")
            return left * right
        if isinstance(op, ast.Div):
            return left / right
        if isinstance(op, ast.FloorDiv):
            return left // right
        if isinstance(op, ast.Mod):
            return left % right
        if isinstance(op, ast.Pow):
            return _safe_pow(left, right)
        if isinstance(op, ast.BitAnd):
            return left & right
        if isinstance(op, ast.BitOr):
            return left | right
        if isinstance(op, ast.BitXor):
            return left ^ right
        if isinstance(op, ast.LShift):
            if isinstance(right, int) and right > 128:
                raise SandboxRuntimeError("Bit shift exceeds safety bound")
            return left << right
        if isinstance(op, ast.RShift):
            return left >> right
        raise SandboxRuntimeError(f"Unsupported binary operator: {type(op).__name__}")

    def _eval_comprehension(
        self,
        generators: list[ast.comprehension],
        env: dict[str, Any],
        emit: Callable[[dict[str, Any]], None],
        gen_index: int = 0,
    ) -> None:
        if gen_index >= len(generators):
            emit(env)
            return

        gen = generators[gen_index]
        iterable = self._eval_expr(gen.iter, env)
        for item in iterable:
            self._tick()
            scoped = dict(env)
            self._assign_target(gen.target, item, scoped)
            if all(self._eval_expr(cond, scoped) for cond in gen.ifs):
                self._eval_comprehension(generators, scoped, emit, gen_index + 1)

    def _eval_expr(self, node: ast.AST, env: dict[str, Any]) -> Any:
        self._tick()

        if isinstance(node, ast.Constant):
            return node.value

        if isinstance(node, ast.Name):
            if node.id in env:
                return env[node.id]
            if node.id in self.globals:
                return self.globals[node.id]
            if node.id in self.builtins:
                return self.builtins[node.id]
            raise SandboxRuntimeError(f"NameError: name '{node.id}' is not defined")

        if isinstance(node, ast.List):
            return [self._eval_expr(e, env) for e in node.elts]

        if isinstance(node, ast.Tuple):
            return tuple(self._eval_expr(e, env) for e in node.elts)

        if isinstance(node, ast.Set):
            return {self._eval_expr(e, env) for e in node.elts}

        if isinstance(node, ast.Dict):
            out: dict[Any, Any] = {}
            for k_node, v_node in zip(node.keys, node.values):
                if k_node is None:
                    mapping = self._eval_expr(v_node, env)
                    if not isinstance(mapping, dict):
                        raise SandboxRuntimeError("Dict unpacking requires a dict")
                    out.update(mapping)
                else:
                    out[self._eval_expr(k_node, env)] = self._eval_expr(v_node, env)
            return out

        if isinstance(node, ast.JoinedStr):
            parts: list[str] = []
            for val in node.values:
                if isinstance(val, ast.FormattedValue):
                    rendered = self._eval_expr(val.value, env)
                    parts.append(str(rendered))
                else:
                    parts.append(str(self._eval_expr(val, env)))
            return "".join(parts)

        if isinstance(node, ast.UnaryOp):
            operand = self._eval_expr(node.operand, env)
            if isinstance(node.op, ast.UAdd):
                return +operand
            if isinstance(node.op, ast.USub):
                return -operand
            if isinstance(node.op, ast.Not):
                return not operand
            if isinstance(node.op, ast.Invert):
                return ~operand
            raise SandboxRuntimeError(f"Unsupported unary op: {type(node.op).__name__}")

        if isinstance(node, ast.BinOp):
            left = self._eval_expr(node.left, env)
            right = self._eval_expr(node.right, env)
            return self._apply_binop(node.op, left, right)

        if isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                result: Any = True
                for val_node in node.values:
                    result = self._eval_expr(val_node, env)
                    if not result:
                        return result
                return result
            if isinstance(node.op, ast.Or):
                result = False
                for val_node in node.values:
                    result = self._eval_expr(val_node, env)
                    if result:
                        return result
                return result

        if isinstance(node, ast.Compare):
            left = self._eval_expr(node.left, env)
            for op, comp_node in zip(node.ops, node.comparators):
                right = self._eval_expr(comp_node, env)
                ok = False
                if isinstance(op, ast.Eq):
                    ok = left == right
                elif isinstance(op, ast.NotEq):
                    ok = left != right
                elif isinstance(op, ast.Lt):
                    ok = left < right
                elif isinstance(op, ast.LtE):
                    ok = left <= right
                elif isinstance(op, ast.Gt):
                    ok = left > right
                elif isinstance(op, ast.GtE):
                    ok = left >= right
                elif isinstance(op, ast.In):
                    ok = left in right
                elif isinstance(op, ast.NotIn):
                    ok = left not in right
                elif isinstance(op, ast.Is):
                    ok = left is right
                elif isinstance(op, ast.IsNot):
                    ok = left is not right
                if not ok:
                    return False
                left = right
            return True

        if isinstance(node, ast.IfExp):
            return (
                self._eval_expr(node.body, env)
                if self._eval_expr(node.test, env)
                else self._eval_expr(node.orelse, env)
            )

        if isinstance(node, ast.Subscript):
            container = self._eval_expr(node.value, env)
            key = self._eval_slice(node.slice, env)
            return container[key]

        if isinstance(node, ast.Attribute):
            if node.attr not in SAFE_METHODS:
                raise SandboxRuntimeError(f"Blocked attribute access '.{node.attr}'")
            target = self._eval_expr(node.value, env)
            if not isinstance(target, (list, dict, set, str, tuple)):
                raise SandboxRuntimeError(
                    f"Method access restricted to safe data types, got {type(target).__name__}"
                )
            return getattr(target, node.attr)

        if isinstance(node, ast.Lambda):
            params = [a.arg for a in node.args.args]
            defaults = [self._eval_expr(d, env) for d in node.args.defaults]
            return _UserFunction(
                name="<lambda>",
                params=params,
                defaults=defaults,
                body=[ast.Return(value=node.body)],
                closure_env=dict(env),
            )

        if isinstance(node, ast.ListComp):
            results: list[Any] = []
            self._eval_comprehension(
                node.generators,
                env,
                lambda scope: results.append(self._eval_expr(node.elt, scope)),
            )
            return results

        if isinstance(node, ast.SetComp):
            results_set: set[Any] = set()
            self._eval_comprehension(
                node.generators,
                env,
                lambda scope: results_set.add(self._eval_expr(node.elt, scope)),
            )
            return results_set

        if isinstance(node, ast.DictComp):
            results_dict: dict[Any, Any] = {}
            self._eval_comprehension(
                node.generators,
                env,
                lambda scope: results_dict.__setitem__(
                    self._eval_expr(node.key, scope),
                    self._eval_expr(node.value, scope),
                ),
            )
            return results_dict

        if isinstance(node, ast.GeneratorExp):
            gen_results: list[Any] = []
            self._eval_comprehension(
                node.generators,
                env,
                lambda scope: gen_results.append(self._eval_expr(node.elt, scope)),
            )
            return gen_results

        if isinstance(node, ast.Call):
            callee = self._eval_expr(node.func, env)
            pos_args = [self._eval_expr(a, env) for a in node.args]
            kw_args = {kw.arg: self._eval_expr(kw.value, env) for kw in node.keywords if kw.arg}

            if isinstance(callee, _UserFunction):
                return self._call_user_function(callee, pos_args, kw_args)
            if callable(callee):
                # Support sorted(..., key=lambda ...) where key is a _UserFunction
                if "key" in kw_args and isinstance(kw_args["key"], _UserFunction):
                    key_fn = kw_args["key"]
                    kw_args["key"] = lambda item: self._call_user_function(key_fn, [item], {})
                return callee(*pos_args, **kw_args)
            raise SandboxRuntimeError("Attempted to call a non-callable object")

        raise SandboxRuntimeError(f"Unsupported expression type: {type(node).__name__}")


def deep_equal(actual: Any, expected: Any, tol: float = 1e-6) -> bool:
    """Deterministic deep equality distinguishing bool from int and supporting float tolerance."""
    if isinstance(actual, bool) or isinstance(expected, bool):
        return type(actual) is type(expected) and actual == expected
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return math.isclose(float(actual), float(expected), rel_tol=tol, abs_tol=tol)
    if type(actual) is not type(expected):
        return False
    if isinstance(actual, (list, tuple)):
        return len(actual) == len(expected) and all(
            deep_equal(a, b, tol) for a, b in zip(actual, expected)
        )
    if isinstance(actual, dict):
        if set(actual.keys()) != set(expected.keys()):
            return False
        return all(deep_equal(actual[k], expected[k], tol) for k in actual)
    return actual == expected


@dataclass(frozen=True)
class GradeTestCaseInput:
    name: str
    args: list[Any]
    expected: Any


@dataclass(frozen=True)
class GradeTestCaseOutput:
    name: str
    passed: bool
    expected: Any
    actual: Any
    duration_ms: float
    error: str | None = None


@dataclass(frozen=True)
class GradeSubmissionResult:
    passed_all: bool
    passed_count: int
    total_count: int
    score_pct: int
    xp_awarded: int
    execution_ms: float
    ast_nodes_checked: int
    steps_executed: int
    results: list[GradeTestCaseOutput] = field(default_factory=list)


def grade_python_submission(
    code: str,
    function_name: str,
    test_cases: list[GradeTestCaseInput],
    xp_reward: int = 120,
    max_steps: int = DEFAULT_MAX_STEPS,
) -> GradeSubmissionResult:
    """Validate AST security and execute student Python function against deterministic unit tests."""
    validation = validate_python_ast(code)
    if not validation.safe or validation.tree is None:
        raise AstSecurityViolationError(validation.violations)

    start_all = time.perf_counter()
    interpreter = _SafeAstInterpreter(max_steps=max_steps)
    interpreter.load_module(validation.tree)

    if not isinstance(interpreter.globals.get(function_name), _UserFunction):
        raise SandboxSyntaxError(
            f"Expected function 'def {function_name}(...)' to be defined in submission"
        )

    total_steps = interpreter.steps
    outputs: list[GradeTestCaseOutput] = []
    passed_count = 0

    for tc in test_cases:
        case_start = time.perf_counter()
        case_interp = _SafeAstInterpreter(max_steps=max_steps)
        case_interp.load_module(validation.tree)
        try:
            actual = case_interp.invoke_function(function_name, tc.args)
            passed = deep_equal(actual, tc.expected)
            if passed:
                passed_count += 1
            outputs.append(
                GradeTestCaseOutput(
                    name=tc.name,
                    passed=passed,
                    expected=tc.expected,
                    actual=actual,
                    duration_ms=round((time.perf_counter() - case_start) * 1000, 3),
                )
            )
        except (SandboxRuntimeError, ZeroDivisionError, KeyError, IndexError, ValueError, TypeError) as exc:
            outputs.append(
                GradeTestCaseOutput(
                    name=tc.name,
                    passed=False,
                    expected=tc.expected,
                    actual=None,
                    duration_ms=round((time.perf_counter() - case_start) * 1000, 3),
                    error=str(exc),
                )
            )
        finally:
            total_steps += case_interp.steps

    total_count = len(test_cases)
    passed_all = total_count > 0 and passed_count == total_count
    score_pct = round((passed_count / total_count) * 100) if total_count > 0 else 0
    xp_awarded = xp_reward if passed_all else round(xp_reward * 0.25 * (passed_count / max(1, total_count)))
    execution_ms = round((time.perf_counter() - start_all) * 1000, 3)

    return GradeSubmissionResult(
        passed_all=passed_all,
        passed_count=passed_count,
        total_count=total_count,
        score_pct=score_pct,
        xp_awarded=xp_awarded,
        execution_ms=execution_ms,
        ast_nodes_checked=validation.node_count,
        steps_executed=total_steps,
        results=outputs,
    )


# ============================================================================
# 2. SUPERMEMO-2 (SM-2) SPACED-REPETITION SCHEDULER
# ============================================================================

MIN_EASE_FACTOR = 1.3
INITIAL_EASE_FACTOR = 2.5
Sm2RatingLiteral = Literal["again", "hard", "good", "easy"]

_RATING_TO_QUALITY: dict[Sm2RatingLiteral, int] = {
    "again": 1,
    "hard": 3,
    "good": 4,
    "easy": 5,
}


@dataclass(frozen=True)
class Sm2ReviewOutput:
    card_id: str
    rating: Sm2RatingLiteral
    quality: int
    repetitions: int
    interval_days: int
    ease_factor: float
    lapses: int
    due_at: str
    is_mastered: bool
    next_interval_preview: dict[str, str]


def _format_interval_label(days: int, short_retry: bool = False) -> str:
    if short_retry:
        return "10m"
    if days < 30:
        return f"{days}d"
    return f"{round(days / 30, 1)}mo"


def schedule_sm2_review(
    card_id: str,
    rating: Sm2RatingLiteral,
    repetitions: int = 0,
    interval_days: int = 0,
    ease_factor: float = INITIAL_EASE_FACTOR,
    lapses: int = 0,
    reviewed_at: datetime | None = None,
) -> Sm2ReviewOutput:
    """Compute canonical SuperMemo-2 next interval, updated Ease Factor, and due UTC timestamp."""
    now = reviewed_at or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    q = _RATING_TO_QUALITY[rating]
    delta_ef = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
    next_ef = round(max(MIN_EASE_FACTOR, ease_factor + delta_ef), 2)

    if rating == "again":
        next_reps = 0
        next_interval = 1
        next_lapses = lapses + 1
        due_dt = now + timedelta(minutes=10)
    elif rating == "hard":
        next_reps = repetitions + 1
        next_interval = 1 if next_reps == 1 else max(1, round(max(1, interval_days) * 1.2))
        next_lapses = lapses
        due_dt = now + timedelta(days=next_interval)
    else:
        next_reps = repetitions + 1
        if next_reps == 1:
            next_interval = 4 if rating == "easy" else 1
        elif next_reps == 2:
            next_interval = 10 if rating == "easy" else 6
        else:
            multiplier = 1.3 if rating == "easy" else 1.0
            next_interval = max(
                interval_days + 1,
                round(max(1, interval_days) * next_ef * multiplier),
            )
        next_lapses = lapses
        due_dt = now + timedelta(days=next_interval)

    is_mastered = next_reps >= 3 and next_interval >= 10

    # Compute preview of subsequent ratings from the updated card state
    next_good_interval = (
        1
        if next_reps == 0
        else 6
        if next_reps == 1
        else max(next_interval + 1, round(next_interval * next_ef))
    )
    next_easy_ef = round(max(MIN_EASE_FACTOR, next_ef + 0.1), 2)
    next_easy_interval = (
        4
        if next_reps == 0
        else 10
        if next_reps == 1
        else max(next_interval + 1, round(next_interval * next_easy_ef * 1.3))
    )

    return Sm2ReviewOutput(
        card_id=card_id,
        rating=rating,
        quality=q,
        repetitions=next_reps,
        interval_days=next_interval,
        ease_factor=next_ef,
        lapses=next_lapses,
        due_at=due_dt.isoformat().replace("+00:00", "Z"),
        is_mastered=is_mastered,
        next_interval_preview={
            "again": _format_interval_label(1, short_retry=True),
            "good": _format_interval_label(next_good_interval),
            "easy": _format_interval_label(next_easy_interval),
        },
    )


# ============================================================================
# 3. HMAC-SHA256 VERIFIABLE CERTIFICATE ISSUER & CONSTANT-TIME VERIFIER
# ============================================================================

DEFAULT_DEV_SECRET = "solaris-academy-v2-hmac-signing-key-2026"
CREDENTIAL_ID_PATTERN = re.compile(r"^SOL-CERT-[A-Z0-9]{4}-[0-9A-F]{8}-[0-9A-F]{4}$")


def _get_signing_secret(secret_override: str | None = None) -> bytes:
    raw = secret_override or os.environ.get("SOLARIS_CERT_SECRET", DEFAULT_DEV_SECRET)
    return raw.encode("utf-8")


def _normalize_course_code(course_code: str) -> str:
    cleaned = re.sub(r"[^A-Z0-9]", "", course_code.strip().upper())
    return cleaned[:4].ljust(4, "X")


def _normalize_student_name(student_name: str) -> str:
    return re.sub(r"\s+", " ", student_name.strip()).upper()


def _canonical_certificate_payload(
    credential_id: str,
    student_name: str,
    course_code: str,
    course_title: str,
    issue_date: str,
    honors: bool,
) -> bytes:
    tier = "HONORS" if honors else "STANDARD"
    canonical = (
        f"SOLARIS-CERT-V2|{credential_id.strip().upper()}|"
        f"{_normalize_student_name(student_name)}|"
        f"{_normalize_course_code(course_code)}|"
        f"{course_title.strip()}|{issue_date.strip()}|{tier}"
    )
    return canonical.encode("utf-8")


def _derive_credential_id(
    student_name: str,
    course_code: str,
    issue_date: str,
    secret_bytes: bytes,
) -> str:
    norm_name = _normalize_student_name(student_name)
    norm_code = _normalize_course_code(course_code)
    seed = f"{norm_name}|{norm_code}|{issue_date.strip()}".encode("utf-8")
    digest_8 = hashlib.sha256(seed).hexdigest()[:8].upper()
    body = f"SOL-CERT-{norm_code}-{digest_8}"
    tag_4 = hmac.new(secret_bytes, body.encode("utf-8"), hashlib.sha256).hexdigest()[:4].upper()
    return f"{body}-{tag_4}"


@dataclass(frozen=True)
class IssuedCertificate:
    credential_id: str
    student_name: str
    course_code: str
    course_title: str
    issue_date: str
    honors: bool
    algorithm: str
    signature: str
    verification_url: str
    issued_at: str


@dataclass(frozen=True)
class CertificateVerificationResult:
    valid: bool
    credential_id: str
    algorithm: str
    reason: str
    verified_at: str


def issue_certificate(
    student_name: str,
    course_code: str,
    course_title: str,
    issue_date: str,
    honors: bool = True,
    secret_override: str | None = None,
) -> IssuedCertificate:
    """Issue a deterministically signed HMAC-SHA256 certificate payload."""
    secret_bytes = _get_signing_secret(secret_override)
    norm_code = _normalize_course_code(course_code)
    credential_id = _derive_credential_id(student_name, norm_code, issue_date, secret_bytes)
    payload = _canonical_certificate_payload(
        credential_id=credential_id,
        student_name=student_name,
        course_code=norm_code,
        course_title=course_title,
        issue_date=issue_date,
        honors=honors,
    )
    signature = hmac.new(secret_bytes, payload, hashlib.sha256).hexdigest()
    issued_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    verification_url = f"https://tvt987.github.io/solaris-academy/?verify={credential_id}"

    return IssuedCertificate(
        credential_id=credential_id,
        student_name=student_name.strip(),
        course_code=norm_code,
        course_title=course_title.strip(),
        issue_date=issue_date.strip(),
        honors=honors,
        algorithm="HMAC-SHA256",
        signature=signature,
        verification_url=verification_url,
        issued_at=issued_at,
    )


def verify_certificate(
    credential_id: str,
    student_name: str,
    course_code: str,
    course_title: str,
    issue_date: str,
    honors: bool,
    signature: str,
    secret_override: str | None = None,
) -> CertificateVerificationResult:
    """Verify certificate integrity using constant-time HMAC-SHA256 comparison."""
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    norm_id = credential_id.strip().upper()
    norm_code = _normalize_course_code(course_code)

    if not CREDENTIAL_ID_PATTERN.match(norm_id):
        return CertificateVerificationResult(
            valid=False,
            credential_id=norm_id,
            algorithm="HMAC-SHA256",
            reason="Malformed credential_id format; expected SOL-CERT-XXXX-HHHHHHHH-TTTT",
            verified_at=now_iso,
        )

    secret_bytes = _get_signing_secret(secret_override)
    expected_id = _derive_credential_id(student_name, norm_code, issue_date, secret_bytes)
    if not hmac.compare_digest(norm_id, expected_id):
        return CertificateVerificationResult(
            valid=False,
            credential_id=norm_id,
            algorithm="HMAC-SHA256",
            reason="Credential ID mismatch — recipient, track code, or issue date was tampered",
            verified_at=now_iso,
        )

    payload = _canonical_certificate_payload(
        credential_id=norm_id,
        student_name=student_name,
        course_code=norm_code,
        course_title=course_title,
        issue_date=issue_date,
        honors=honors,
    )
    expected_sig = hmac.new(secret_bytes, payload, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature.strip().lower(), expected_sig):
        return CertificateVerificationResult(
            valid=False,
            credential_id=norm_id,
            algorithm="HMAC-SHA256",
            reason="HMAC-SHA256 signature mismatch — certificate payload or signature was tampered",
            verified_at=now_iso,
        )

    return CertificateVerificationResult(
        valid=True,
        credential_id=norm_id,
        algorithm="HMAC-SHA256",
        reason="Cryptographic HMAC-SHA256 signature verified against Solaris Academy registry",
        verified_at=now_iso,
    )
